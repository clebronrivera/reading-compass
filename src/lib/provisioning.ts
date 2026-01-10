import { supabase } from '@/integrations/supabase/client';
import type { ASRVersionRow, ContentBankRow, ScoringOutputRow, FormRow, ItemRow, CanonicalGradeTag } from '@/types/database';
import { VALID_GRADE_TAGS } from '@/types/database';

/**
 * Validates that a grade tag is in the canonical allowed list
 */
function isValidGradeTag(tag: string): tag is CanonicalGradeTag {
  return (VALID_GRADE_TAGS as readonly string[]).includes(tag);
}

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

// generation_source determines how provisioning creates items
type GenerationSource = 'stimulus_pool' | 'sample_items' | 'sample_items_by_grade' | 'external_import';

// ============= Pool Integrity Validation =============
interface PoolValidation {
  isValid: boolean;
  error?: string;
  warning?: string;
  poolSize: number;
  requiredSize: number;
}

/**
 * Validates pool size against required item count.
 * Returns error if under-populated, warning if over-populated.
 * This prevents "Blind Generation" (incomplete forms) and "Greedy Generation" (oversized forms).
 */
function validatePoolIntegrity(
  poolSize: number,
  requiredSize: number,
  poolName: string
): PoolValidation {
  if (poolSize < requiredSize) {
    return {
      isValid: false,
      error: `[Integrity Violation] Pool '${poolName}' has insufficient items. Required: ${requiredSize}, Found: ${poolSize}.`,
      poolSize,
      requiredSize,
    };
  }
  if (poolSize > requiredSize) {
    return {
      isValid: true,
      warning: `Pool '${poolName}' has ${poolSize} items, will use exactly ${requiredSize}.`,
      poolSize,
      requiredSize,
    };
  }
  return { isValid: true, poolSize, requiredSize };
}

interface SampleItem {
  stimulus?: string;
  expected_response?: string;
  item_type?: string;
  scoring_tags?: string[];
  // Extended fields for spoken prompt items (e.g., phoneme segmentation)
  prompt_word?: string;
  target_phonemes?: string[];
  phoneme_count?: number;
  difficulty?: string;
  [key: string]: unknown; // Allow additional arbitrary fields
}

interface ASRSectionD {
  // MANDATORY: tells provisioning where item content comes from
  generation_source: GenerationSource;
  
  item_type?: string;
  stimulus_pool?: string[];
  stimulus_rules?: string[];
  sample_items?: SampleItem[];
  // Grade-keyed word lists for WRF-style assessments
  sample_items_by_grade?: Record<string, string[]>;
  presentation_unit?: string;
  runtime_randomization_allowed?: boolean;
  persist_item_order?: boolean;
  // Extended config for sample_items generation
  target_forms_per_level?: number;
  items_per_form?: number;
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

  // Step 2b: Generate items based on generation_source in section_d
  const sectionD = (asr.section_d as unknown as ASRSectionD) || { generation_source: 'external_import' };
  const targetBank = result.created.contentBank || result.existing.contentBanks[0];
  const generationSource = sectionD.generation_source || 'external_import';
  
  // Handle stimulus_pool generation
  if (generationSource === 'stimulus_pool' && sectionD.stimulus_pool && Array.isArray(sectionD.stimulus_pool) && sectionD.stimulus_pool.length > 0 && targetBank) {
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
      // Map ASR item_type to valid DB item types: passage, letter-sound, letter-name, phoneme, word, sentence, multiple-choice, constructed-response
      const itemTypeMap: Record<string, string> = {
        'single_printed_letter': 'letter-name',  // Letter naming fluency = letter NAMES not sounds
        'stimulus_token': 'letter-name',
        'letter': 'letter-name',
      };
      const rawItemType = sectionD.item_type || 'letter-name';
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

      // Validate pool integrity before generation
      const poolValidation = validatePoolIntegrity(
        stimulusPool.length,
        itemsPerForm,
        `stimulus_pool for ${assessmentId}`
      );

      if (!poolValidation.isValid) {
        result.errors.push(poolValidation.error!);
        return result; // Hard fail - don't create incomplete forms
      }

      if (poolValidation.warning) {
        result.warnings.push(poolValidation.warning);
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

  // Handle sample_items generation
  if (generationSource === 'sample_items' && sectionD.sample_items && Array.isArray(sectionD.sample_items) && sectionD.sample_items.length > 0 && targetBank) {
    // Check if items already exist for this bank
    const { data: existingForms } = await supabase
      .from('forms')
      .select('form_id')
      .eq('content_bank_id', targetBank.content_bank_id);

    if (!existingForms || existingForms.length === 0) {
      const sampleItems = sectionD.sample_items;
      const targetFormsPerLevel = sectionD.target_forms_per_level || 2;
      const itemsPerForm = sectionD.items_per_form || 20;
      
      // Map ASR item_type to valid DB item types
      const itemTypeMap: Record<string, string> = {
        'spoken_prompt_word': 'phoneme',
        'phoneme_segment': 'phoneme',
        'single_printed_letter': 'letter-name',
        'spoken_onset_rime_pair': 'phoneme', // Onset-rime blending uses phoneme type
        'spoken_word_pair': 'phoneme', // Rhyme recognition uses phoneme type
        'spoken_word_prompt': 'phoneme', // Syllable segmentation uses phoneme type
        'printed_affixed_word_with_base_context': 'word', // Morphophonemic patterns uses word type
      };
      const rawItemType = sectionD.item_type || 'phoneme';
      const itemType = itemTypeMap[rawItemType] || rawItemType;

      // Shuffle function
      const shuffleArray = <T>(arr: T[]): T[] => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      };

      // Validate pool integrity before generation
      const poolValidation = validatePoolIntegrity(
        sampleItems.length,
        itemsPerForm,
        `sample_items for ${assessmentId}`
      );

      if (!poolValidation.isValid) {
        result.errors.push(poolValidation.error!);
        return result; // Hard fail - don't create forms with insufficient items
      }

      if (poolValidation.warning) {
        result.warnings.push(poolValidation.warning);
      }

      // Create forms with shuffled items from sample_items pool
      for (let formNum = 1; formNum <= targetFormsPerLevel; formNum++) {
        const formId = `${assessmentId}.form${String(formNum).padStart(2, '0')}`;
        
        // Strict slice - no cycling (validated above)
        const selectedItems = shuffleArray(sampleItems).slice(0, itemsPerForm);
        
        // Create the form
        const { data: newForm, error: formError } = await supabase
          .from('forms')
          .insert({
            form_id: formId,
            content_bank_id: targetBank.content_bank_id,
            assessment_id: assessmentId,
            form_number: formNum,
            grade_or_level_tag: 'K-1', // PSF is typically K-1
            status: 'draft',
            metadata: {
              item_count: itemsPerForm,
              sample_pool_size: sampleItems.length,
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
        const itemInserts = selectedItems.map((sample, index) => ({
          item_id: `${formId}.item${String(index + 1).padStart(3, '0')}`,
          form_id: formId,
          item_type: itemType,
          sequence_number: index + 1,
          content_payload: {
            ...sample, // Include all sample item fields (prompt_word, target_phonemes, etc.)
            position: index + 1,
          },
          scoring_tags: sample.scoring_tags || ['correct', 'incorrect', 'no_response'],
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

  // Handle sample_items_by_grade generation (grade-keyed word lists like WRF)
  if (generationSource === 'sample_items_by_grade' && sectionD.sample_items_by_grade && targetBank) {
    const { data: existingForms } = await supabase
      .from('forms')
      .select('form_id')
      .eq('content_bank_id', targetBank.content_bank_id);

    if (!existingForms || existingForms.length === 0) {
      const gradeWordLists = sectionD.sample_items_by_grade;
      const targetFormsPerLevel = sectionD.target_forms_per_level || 1;
      const itemType = sectionD.item_type || 'word';
      
      // Shuffle function
      const shuffleArray = <T>(arr: T[]): T[] => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      };

      let totalItemsCreated = 0;

      // Create one form per grade level
      for (const [gradeTag, wordList] of Object.entries(gradeWordLists)) {
        if (!Array.isArray(wordList) || wordList.length === 0) continue;
        
        // Validate grade tag before creating forms
        if (!isValidGradeTag(gradeTag)) {
          result.errors.push(`Invalid grade tag '${gradeTag}' in sample_items_by_grade. Allowed: ${VALID_GRADE_TAGS.join(', ')}`);
          continue;
        }

        // Determine required items per form (use config or full list length)
        const requiredItemsPerForm = sectionD.items_per_form || wordList.length;

        // Validate pool integrity per grade
        const gradeValidation = validatePoolIntegrity(
          wordList.length,
          requiredItemsPerForm,
          `sample_items_by_grade.${gradeTag}`
        );

        if (!gradeValidation.isValid) {
          result.warnings.push(gradeValidation.error!); // Warn but continue other grades
          continue; // Skip this grade level
        }

        if (gradeValidation.warning) {
          result.warnings.push(gradeValidation.warning);
        }

        for (let formNum = 1; formNum <= targetFormsPerLevel; formNum++) {
          const formId = `${assessmentId}.${gradeTag}.form${String(formNum).padStart(2, '0')}`;
          // Strict slice to required count
          const shuffledWords = shuffleArray(wordList).slice(0, requiredItemsPerForm);
          
          // Create the form
          const { data: newForm, error: formError } = await supabase
            .from('forms')
            .insert({
              form_id: formId,
              content_bank_id: targetBank.content_bank_id,
              assessment_id: assessmentId,
              form_number: formNum,
              grade_or_level_tag: gradeTag,
              status: 'draft',
              metadata: {
                item_count: shuffledWords.length,
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

          // Create items for this form - each word becomes an item
          const itemInserts = shuffledWords.map((word, index) => ({
            item_id: `${formId}.item${String(index + 1).padStart(3, '0')}`,
            form_id: formId,
            item_type: itemType,
            sequence_number: index + 1,
            content_payload: {
              stimulus: word,
              expected_response: word,
              position: index + 1,
            },
            scoring_tags: ['correct', 'incorrect'],
          }));

          const { error: itemsError } = await supabase
            .from('items')
            .insert(itemInserts);

          if (itemsError) {
            result.errors.push(`Failed to create items for ${formId}: ${itemsError.message}`);
          } else {
            totalItemsCreated += shuffledWords.length;
          }
        }
      }

      // Update bank size
      await supabase
        .from('content_banks')
        .update({ 
          current_size: totalItemsCreated,
          status: 'ready',
        })
        .eq('content_bank_id', targetBank.content_bank_id);
    }
  }


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

  // If forms already exist in this bank, don't auto-generate more.
  // (This prevents accidental creation of duplicate "unknown" forms when items lack grade tags.)
  if (forms && forms.length > 0) {
    result.warnings.push(
      'Forms already exist for this content bank. Skipping automatic form generation to avoid duplicates.'
    );
    result.success = result.errors.length === 0;
    return result;
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
      // SAFETY: Never generate forms for 'unknown' grade - this causes mega-form explosion
      if (grade === 'unknown') {
        result.warnings.push(`Skipping item "${item.item_id}" - no valid grade tag.`);
        continue;
      }
      if (!byGrade[grade]) byGrade[grade] = [];
      byGrade[grade].push(item);
    }

    // Get config from section_d (already parsed earlier)
    const itemsPerFormConfig = sectionD.items_per_form || 1; // Default to 1 for passage-based assessments
    const sectionIData = (asr.section_i as ASRSectionI) || {};
    const targetFormsPerLevelConfig = sectionIData.target_forms_per_level || 2;

    // Generate forms for each grade with eligible content
    for (const [grade, gradeItems] of Object.entries(byGrade)) {
      // Validate we have enough items for at least one complete form
      if (gradeItems.length < itemsPerFormConfig) {
        result.warnings.push(
          `[Integrity Warning] Grade '${grade}' has ${gradeItems.length} items, need ${itemsPerFormConfig}. Skipping form generation.`
        );
        continue;
      }

      // Calculate exactly how many complete forms we can create
      const completeFormsAvailable = Math.floor(gradeItems.length / itemsPerFormConfig);
      const formsToCreate = Math.min(completeFormsAvailable, targetFormsPerLevelConfig);

      if (completeFormsAvailable < targetFormsPerLevelConfig) {
        result.warnings.push(
          `Grade '${grade}' can only produce ${completeFormsAvailable} complete forms (target: ${targetFormsPerLevelConfig}).`
        );
      }

      for (let formNum = 1; formNum <= formsToCreate; formNum++) {
        const formId = `${assessmentId}.${grade}.form${String(formNum).padStart(2, '0')}`;

        // Check if form already exists
        if (forms?.some(f => f.form_id === formId)) {
          continue;
        }

        // Get items for this form - strict slicing for exactly itemsPerFormConfig items
        const startIdx = (formNum - 1) * itemsPerFormConfig;
        const formItems = gradeItems.slice(startIdx, startIdx + itemsPerFormConfig);
        
        // Skip if we can't fill a complete form (safety check)
        if (formItems.length < itemsPerFormConfig) continue;

        // Use first item for metadata (passage-based) or aggregate
        const firstPayload = formItems[0].content_payload as Record<string, unknown>;

        const formInsert = {
          form_id: formId,
          content_bank_id: targetBankForForms.content_bank_id,
          assessment_id: assessmentId,
          form_number: formNum,
          grade_or_level_tag: grade,
          equivalence_set_id: (firstPayload.equivalence_set_id as string) || null,
          status: 'draft',
          metadata: {
            item_count: formItems.length,
            passage_id: formItems.length === 1 ? String(firstPayload.passage_id || firstPayload.item_id || '') : undefined,
            locked_word_token_order: formItems.length === 1 ? (firstPayload.word_tokens as string[] || []) : undefined,
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
