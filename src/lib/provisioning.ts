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

interface MetricObject {
  metric_id?: string;
  name?: string;
  type?: string;
  range?: string;
  description?: string;
}

interface ASRSectionG {
  scoring_method?: string;
  score_types?: string[];
  error_coding?: string[] | string;
  scoring_rubric?: string;
  raw_metrics?: (string | MetricObject)[];
  derived_metrics?: (string | MetricObject)[];
}

interface ASRSectionH {
  raw_metrics?: (string | MetricObject)[];
  derived_metrics?: (string | MetricObject)[];
  benchmark_status?: string;
  norm_reference?: string;
}

interface ASRSectionD {
  item_type?: string;
  stimulus_pool?: string[];
  stimulus_rules?: string[];
  presentation_unit?: string;
  runtime_randomization_allowed?: boolean;
  persist_item_order?: boolean;
}

interface ASRSectionI {
  forms_available?: string[];
  equivalence_sets?: string;
  equivalence_required?: boolean;
  differentiation_keys?: string[];
  minimum_bank_size?: number;
  target_forms_per_level?: number;
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

  // Step 2b: Generate items from stimulus_pool if defined in section_d
  const sectionD = (asr.section_d as ASRSectionD) || {};
  const targetBank = result.created.contentBank || result.existing.contentBanks[0];
  
  if (sectionD.stimulus_pool && Array.isArray(sectionD.stimulus_pool) && sectionD.stimulus_pool.length > 0 && targetBank) {
    // Check if items already exist for this bank
    const { data: existingForms } = await supabase
      .from('forms')
      .select('form_id')
      .eq('content_bank_id', targetBank.content_bank_id);

    if (!existingForms || existingForms.length === 0) {
      // Generate forms and items from stimulus pool
      const stimulusPool = sectionD.stimulus_pool;
      const sectionIData = (asr.section_i as ASRSectionI) || {};
      const targetFormsPerLevel = sectionIData.target_forms_per_level || 2;
      // Map ASR item_type to valid DB item types: passage, letter-sound, phoneme, word, sentence, multiple-choice, constructed-response
      const itemTypeMap: Record<string, string> = {
        'single_printed_letter': 'letter-sound',
        'stimulus_token': 'letter-sound',
        'letter': 'letter-sound',
      };
      const rawItemType = sectionD.item_type || 'letter-sound';
      const itemType = itemTypeMap[rawItemType] || rawItemType;
      
      // Parse stimulus_rules to extract item count per form (default 100 for letter naming)
      let itemsPerForm = 100;
      if (sectionD.stimulus_rules) {
        const countRule = sectionD.stimulus_rules.find(r => r.includes('exactly') && r.includes('tokens'));
        if (countRule) {
          const match = countRule.match(/exactly\s+(\d+)/);
          if (match) itemsPerForm = parseInt(match[1], 10);
        }
      }

      // Generate shuffled token sequences following cycle rule
      const generateTokenSequence = (pool: string[], count: number): string[] => {
        const tokens: string[] = [];
        let poolCopy = [...pool];
        
        while (tokens.length < count) {
          // Shuffle the pool for each cycle
          for (let i = poolCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
          }
          tokens.push(...poolCopy);
          poolCopy = [...pool]; // Reset for next cycle
        }
        
        return tokens.slice(0, count);
      };

      // Create forms with items
      for (let formNum = 1; formNum <= targetFormsPerLevel; formNum++) {
        const formId = `${assessmentId}.form${String(formNum).padStart(2, '0')}`;
        const tokenSequence = generateTokenSequence(stimulusPool, itemsPerForm);
        
        // Create the form
        const { data: newForm, error: formError } = await supabase
          .from('forms')
          .insert({
            form_id: formId,
            content_bank_id: targetBank.content_bank_id,
            assessment_id: assessmentId,
            form_number: formNum,
            grade_or_level_tag: 'all', // Letter naming is typically not grade-differentiated
            status: 'draft',
            metadata: {
              item_count: itemsPerForm,
              stimulus_pool_size: stimulusPool.length,
              generated_at: new Date().toISOString(),
            },
          })
          .select()
          .single();

        if (formError) {
          result.errors.push(`Failed to create form ${formId}: ${formError.message}`);
          continue;
        }

        result.created.forms.push(newForm as FormRow);

        // Create items for this form
        const itemInserts = tokenSequence.map((token, index) => ({
          item_id: `${formId}.item${String(index + 1).padStart(3, '0')}`,
          form_id: formId,
          item_type: itemType,
          sequence_number: index + 1,
          content_payload: {
            stimulus: token,
            expected_response: token, // For letter naming, the expected response is the letter name
            position: index + 1,
          },
          scoring_tags: ['letter_correct', 'letter_incorrect'],
        }));

        const { error: itemsError } = await supabase
          .from('items')
          .insert(itemInserts);

        if (itemsError) {
          result.errors.push(`Failed to create items for ${formId}: ${itemsError.message}`);
        }
      }

      // Update bank size
      const totalItems = targetFormsPerLevel * itemsPerForm;
      await supabase
        .from('content_banks')
        .update({ 
          current_size: totalItems,
          status: 'ready',
        })
        .eq('content_bank_id', targetBank.content_bank_id);
    }
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

    // Helper to normalize metrics from either strings or objects
    const normalizeMetrics = (metricsArray: (string | MetricObject)[], metricType: string) => {
      return metricsArray.map((m) => {
        if (typeof m === 'string' && m.length > 0) {
          return {
            metric_id: m.toLowerCase().replace(/\s+/g, '_'),
            name: m,
            type: 'number',
            description: `${metricType}: ${m}`,
          };
        } else if (typeof m === 'object' && m !== null) {
          const obj = m as MetricObject;
          return {
            metric_id: obj.metric_id || (obj.name || 'unknown').toLowerCase().replace(/\s+/g, '_'),
            name: obj.name || obj.metric_id || 'Unknown Metric',
            type: obj.type || 'number',
            description: obj.description || `${metricType}: ${obj.name || obj.metric_id}`,
          };
        }
        return null;
      }).filter((m): m is NonNullable<typeof m> => m !== null);
    };

    // Check section_g first (some ASRs store metrics there), then fall back to section_h
    const rawMetricsSource = (sectionG as { raw_metrics?: (string | MetricObject)[] }).raw_metrics 
      || sectionH.raw_metrics || [];
    const derivedMetricsSource = (sectionG as { derived_metrics?: (string | MetricObject)[] }).derived_metrics 
      || sectionH.derived_metrics || [];

    const rawMetrics = normalizeMetrics(Array.isArray(rawMetricsSource) ? rawMetricsSource : [], 'Raw metric');
    const derivedMetrics = normalizeMetrics(Array.isArray(derivedMetricsSource) ? derivedMetricsSource : [], 'Derived metric');

    const errorCoding = Array.isArray(sectionG.error_coding) 
      ? sectionG.error_coding.filter((e): e is string => typeof e === 'string')
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

  // Step 4: Validate content eligibility for form generation (for non-stimulus-pool assessments)
  // Skip if forms were already generated from stimulus_pool in Step 2b
  if (result.created.forms.length > 0) {
    result.success = result.errors.length === 0;
    return result;
  }

  const targetBankForForms = result.created.contentBank || result.existing.contentBanks[0];
  if (!targetBankForForms) {
    result.errors.push('No content bank available for form generation');
    return result;
  }

  // Fetch existing forms from the bank
  const { data: forms, error: formsError } = await supabase
    .from('forms')
    .select('form_id')
    .eq('content_bank_id', targetBankForForms.content_bank_id);

  if (formsError) {
    result.warnings.push(`Could not check existing forms: ${formsError.message}`);
  }

  // Fetch items to check for content
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*, forms!inner(content_bank_id)')
    .eq('forms.content_bank_id', targetBankForForms.content_bank_id);

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
  const bankHasContent = targetBankForForms.current_size > 0 || (items && items.length > 0);
  
  if (!bankHasContent) {
    result.warnings.push(`Content bank "${targetBankForForms.name}" is empty. Add items to generate forms.`);
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
          content_bank_id: targetBankForForms.content_bank_id,
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
