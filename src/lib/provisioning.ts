import { supabase } from '@/integrations/supabase/client';
import type { ASRVersionRow, ContentBankRow, ScoringOutputRow, FormRow, ItemRow } from '@/types/database';

export interface ProvisioningResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  created: {
    contentBank?: ContentBankRow;
    scoringOutput?: ScoringOutputRow;
    forms: FormRow[];
  };
  existing: {
    contentBanks: ContentBankRow[];
    scoringOutputs: ScoringOutputRow[];
  };
}

interface ASRSectionG {
  scoring_method?: string;
  score_types?: string[];
  error_coding?: string[] | string;
  scoring_rubric?: string;
}

interface ASRSectionH {
  raw_metrics?: string[];
  derived_metrics?: string[];
  benchmark_status?: string;
  norm_reference?: string;
}

interface ASRSectionI {
  forms_available?: string[];
  equivalence_sets?: string;
  differentiation_keys?: string[];
  version_notes?: string;
}

/**
 * Validates ASR completeness - all sections A-J must be populated
 */
export function validateASRCompleteness(asr: ASRVersionRow): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  const sections = ['section_a', 'section_b', 'section_c', 'section_d', 'section_e', 
                    'section_f', 'section_g', 'section_h', 'section_i', 'section_j'] as const;
  
  for (const section of sections) {
    const data = asr[section] as Record<string, unknown> | null;
    if (!data || Object.keys(data).length === 0) {
      missing.push(section.replace('section_', 'Section ').toUpperCase());
    }
  }
  
  return { valid: missing.length === 0, missing };
}

/**
 * Generate assessment assets from ASR specification
 */
export async function generateAssessmentAssets(asr: ASRVersionRow): Promise<ProvisioningResult> {
  const result: ProvisioningResult = {
    success: false,
    errors: [],
    warnings: [],
    created: { forms: [] },
    existing: { contentBanks: [], scoringOutputs: [] },
  };

  const assessmentId = asr.assessment_id;

  // Step 1: Validate ASR completeness
  const completeness = validateASRCompleteness(asr);
  if (!completeness.valid) {
    result.errors.push(`ASR incomplete. Missing: ${completeness.missing.join(', ')}`);
    return result;
  }

  // Step 2: Check/Create Content Bank
  const { data: existingBanks, error: bankError } = await supabase
    .from('content_banks')
    .select('*')
    .eq('linked_assessment_id', assessmentId);

  if (bankError) {
    result.errors.push(`Failed to fetch content banks: ${bankError.message}`);
    return result;
  }

  if (existingBanks && existingBanks.length > 0) {
    result.existing.contentBanks = existingBanks as ContentBankRow[];
  } else {
    // Auto-create content bank from ASR
    const sectionI = (asr.section_i as ASRSectionI) || {};
    const bankId = `${assessmentId}.bank1`;
    
    const { data: newBank, error: createBankError } = await supabase
      .from('content_banks')
      .insert({
        content_bank_id: bankId,
        linked_assessment_id: assessmentId,
        name: `${assessmentId} Content Bank`,
        differentiation_keys: sectionI.differentiation_keys || [],
        equivalence_set_required: !!sectionI.equivalence_sets,
        target_bank_size: 0,
        current_size: 0,
        status: 'empty',
      })
      .select()
      .single();

    if (createBankError) {
      result.errors.push(`Failed to create content bank: ${createBankError.message}`);
      return result;
    }

    // Link bank to assessment
    const { error: linkError } = await supabase
      .from('assessment_banks')
      .insert({ assessment_id: assessmentId, content_bank_id: bankId });

    if (linkError) {
      result.warnings.push(`Content bank created but linking failed: ${linkError.message}`);
    }

    result.created.contentBank = newBank as ContentBankRow;
  }

  // Step 3: Check/Create Scoring Output
  const { data: existingScoring, error: scoringError } = await supabase
    .from('scoring_outputs')
    .select('*')
    .eq('assessment_id', assessmentId);

  if (scoringError) {
    result.errors.push(`Failed to fetch scoring outputs: ${scoringError.message}`);
    return result;
  }

  if (existingScoring && existingScoring.length > 0) {
    result.existing.scoringOutputs = existingScoring as ScoringOutputRow[];
  } else {
    // Auto-create scoring output from ASR sections G and H
    const sectionG = (asr.section_g as ASRSectionG) || {};
    const sectionH = (asr.section_h as ASRSectionH) || {};

    const rawMetrics = (sectionH.raw_metrics || []).map((m: string) => ({
      metric_id: m.toLowerCase().replace(/\s+/g, '_'),
      name: m,
      type: 'number',
      description: `Raw metric: ${m}`,
    }));

    const derivedMetrics = (sectionH.derived_metrics || []).map((m: string) => ({
      metric_id: m.toLowerCase().replace(/\s+/g, '_'),
      name: m,
      type: 'number',
      description: `Derived metric: ${m}`,
    }));

    const errorCoding = Array.isArray(sectionG.error_coding) 
      ? sectionG.error_coding 
      : typeof sectionG.error_coding === 'string' 
        ? [sectionG.error_coding] 
        : [];

    // Add error types as raw metrics
    errorCoding.forEach((e: string) => {
      rawMetrics.push({
        metric_id: `${e.toLowerCase().replace(/\s+/g, '_')}_count`,
        name: `${e} Count`,
        type: 'integer',
        description: `Count of ${e} errors`,
      });
    });

    const { data: newScoring, error: createScoringError } = await supabase
      .from('scoring_outputs')
      .insert({
        scoring_model_id: `${assessmentId}.scoring1`,
        assessment_id: assessmentId,
        raw_metrics_schema: rawMetrics,
        derived_metrics_schema: derivedMetrics,
        formulas: [],
        flags: [],
        thresholds: [],
      })
      .select()
      .single();

    if (createScoringError) {
      result.errors.push(`Failed to create scoring output: ${createScoringError.message}`);
      return result;
    }

    result.created.scoringOutput = newScoring as ScoringOutputRow;
  }

  // Step 4: Validate content eligibility for form generation
  const targetBank = result.created.contentBank || result.existing.contentBanks[0];
  if (!targetBank) {
    result.errors.push('No content bank available for form generation');
    return result;
  }

  // Fetch existing forms from the bank
  const { data: forms, error: formsError } = await supabase
    .from('forms')
    .select('form_id')
    .eq('content_bank_id', targetBank.content_bank_id);

  if (formsError) {
    result.warnings.push(`Could not check existing forms: ${formsError.message}`);
  }

  // Fetch items to check for content
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*, forms!inner(content_bank_id)')
    .eq('forms.content_bank_id', targetBank.content_bank_id);

  if (itemsError) {
    result.warnings.push(`Could not fetch items: ${itemsError.message}`);
  }

  // Check for eligible content - items are eligible if:
  // 1. For passage types: validation_status === 'approved'
  // 2. For other item types (letter-sound, phoneme, word, etc.): items exist in a ready/in-progress bank
  const eligibleItems = (items || []).filter((item: ItemRow) => {
    const payload = item.content_payload as Record<string, unknown>;
    // Passage items require explicit approval
    if (item.item_type === 'passage') {
      return payload?.validation_status === 'approved';
    }
    // Non-passage items are eligible if they exist (bank status already checked)
    return true;
  });

  // Additional check: if bank is empty or has no items, warn appropriately
  const bankHasContent = targetBank.current_size > 0 || (items && items.length > 0);
  
  if (!bankHasContent) {
    result.warnings.push(`Content bank "${targetBank.name}" is empty. Add items to generate forms.`);
  } else if (eligibleItems.length === 0) {
    // Has items but none are eligible (e.g., passages without approval)
    result.warnings.push('No eligible content found. For passage items, ensure validation_status is set to "approved".');
  } else {
    // Group by grade_target for form generation
    const byGrade: Record<string, ItemRow[]> = {};
    for (const item of eligibleItems) {
      const payload = item.content_payload as Record<string, unknown>;
      const grade = String(payload.grade_target || payload.grade_level || 'unknown');
      if (!byGrade[grade]) byGrade[grade] = [];
      byGrade[grade].push(item);
    }

    // Generate forms for each grade with eligible content
    for (const [grade, gradeItems] of Object.entries(byGrade)) {
      for (let i = 0; i < gradeItems.length; i++) {
        const item = gradeItems[i];
        const payload = item.content_payload as Record<string, unknown>;
        const formNumber = i + 1;
        const formId = `${assessmentId}.${grade}.form${String(formNumber).padStart(2, '0')}`;

        // Check if form already exists
        if (forms?.some(f => f.form_id === formId)) {
          continue;
        }

        const formInsert = {
          form_id: formId,
          content_bank_id: targetBank.content_bank_id,
          assessment_id: assessmentId,
          form_number: formNumber,
          grade_or_level_tag: grade,
          equivalence_set_id: (payload.equivalence_set_id as string) || null,
          status: 'draft',
          metadata: {
            passage_id: String(payload.passage_id || payload.item_id || ''),
            locked_word_token_order: payload.word_tokens as string[] || [],
            generated_at: new Date().toISOString(),
          },
        };

        const { data: newForm, error: formError } = await supabase
          .from('forms')
          .insert([formInsert])
          .select()
          .single();

        if (formError) {
          result.errors.push(`Failed to create form ${formId}: ${formError.message}`);
        } else {
          result.created.forms.push(newForm as FormRow);
        }
      }
    }
  }

  // Step 5: Final status
  result.success = result.errors.length === 0;
  return result;
}
