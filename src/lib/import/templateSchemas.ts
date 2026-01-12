import { z } from 'zod';
import { VALID_GRADE_TAGS } from '@/types/database';

// Valid item types including comprehension types
export const VALID_ITEM_TYPES = [
  'letter', 'word', 'sentence', 'passage', 'question', 'prompt', 'phoneme',
  'printed_word', 'printed_affixed_word_with_base_context', 'mcq',
  'spoken_onset_rime_pair', 'word_pair', 'syllable_word',
  // Comprehension-specific types
  'recall_sentence_unit', 'mcq_item', 'letter-name', 'letter-sound', 'cloze_blank',
] as const;

export const VALID_SKILL_TAGS = [
  'main_idea', 'key_detail', 'inference', 
  'vocabulary', 'sequence', 'cause_effect'
] as const;

export const VALID_GENRES = ['narrative', 'informational', 'procedural'] as const;

export type ImportType = 'items' | 'forms' | 'banks' | 'asr' | 'scoring';

// Items CSV schema
export const itemsCSVSchema = z.object({
  item_id: z.string().min(1, 'item_id is required'),
  form_id: z.string().min(1, 'form_id is required'),
  item_type: z.string().min(1, 'item_type is required'),
  sequence_number: z.string().regex(/^\d+$/, 'Must be a number'),
  stimulus: z.string().optional(),
  text: z.string().optional(),
  choices: z.string().optional(), // pipe-delimited
  correct_answer: z.string().optional(),
  scoring_tags: z.string().optional(), // pipe-delimited
  // Comprehension-specific
  sentence_id: z.string().optional(),
  skill_tag: z.string().optional(),
  genre: z.string().optional(),
  word_count: z.string().optional(),
  sentence_count: z.string().optional(),
}).refine(
  data => data.stimulus || data.text,
  { message: 'Either stimulus or text is required' }
);

// Forms CSV schema
export const formsCSVSchema = z.object({
  form_id: z.string().min(1, 'form_id is required'),
  assessment_id: z.string().min(1, 'assessment_id is required'),
  content_bank_id: z.string().min(1, 'content_bank_id is required'),
  grade_or_level_tag: z.string().refine(
    val => VALID_GRADE_TAGS.includes(val as typeof VALID_GRADE_TAGS[number]),
    { message: 'Invalid grade tag' }
  ),
  form_number: z.string().regex(/^\d+$/, 'Must be a number'),
  status: z.enum(['draft', 'active', 'retired']).optional(),
  equivalence_set_id: z.string().optional(),
});

// Content Banks CSV schema
export const banksCSVSchema = z.object({
  content_bank_id: z.string().min(1, 'content_bank_id is required'),
  linked_assessment_id: z.string().min(1, 'linked_assessment_id is required'),
  name: z.string().min(1, 'name is required'),
  target_bank_size: z.string().optional(),
  equivalence_set_required: z.string().optional(),
  differentiation_keys: z.string().optional(), // pipe-delimited
  status: z.enum(['empty', 'in-progress', 'ready']).optional(),
});

// ASR vertical format schema
export const asrCSVSchema = z.object({
  asr_version_id: z.string().min(1, 'asr_version_id is required'),
  assessment_id: z.string().min(1, 'assessment_id is required'),
  section: z.string().regex(/^section_[a-j]$/, 'Section must be section_a through section_j'),
  field: z.string().min(1, 'field is required'),
  value: z.string(),
});

// Scoring outputs CSV schema
export const scoringCSVSchema = z.object({
  scoring_model_id: z.string().min(1, 'scoring_model_id is required'),
  assessment_id: z.string().min(1, 'assessment_id is required'),
  metric_type: z.enum(['raw', 'derived']),
  metric_id: z.string().min(1, 'metric_id is required'),
  metric_name: z.string().min(1, 'metric_name is required'),
  metric_data_type: z.string().optional(),
  formula: z.string().optional(),
});

// Schema map for validation
export const schemaMap: Record<ImportType, z.ZodType<unknown>> = {
  items: itemsCSVSchema,
  forms: formsCSVSchema,
  banks: banksCSVSchema,
  asr: asrCSVSchema,
  scoring: scoringCSVSchema,
};

// Required columns per import type
export const requiredColumns: Record<ImportType, string[]> = {
  items: ['item_id', 'form_id', 'item_type', 'sequence_number'],
  forms: ['form_id', 'assessment_id', 'content_bank_id', 'grade_or_level_tag', 'form_number'],
  banks: ['content_bank_id', 'linked_assessment_id', 'name'],
  asr: ['asr_version_id', 'assessment_id', 'section', 'field', 'value'],
  scoring: ['scoring_model_id', 'assessment_id', 'metric_type', 'metric_id', 'metric_name'],
};

// Validate a single row against its schema
export function validateRow(
  type: ImportType,
  row: Record<string, string>,
  rowIndex: number
): { valid: boolean; errors: string[] } {
  const schema = schemaMap[type];
  const result = schema.safeParse(row);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `Row ${rowIndex}: ${e.path.join('.')}: ${e.message}`),
    };
  }
  
  return { valid: true, errors: [] };
}

// Validate all rows
export function validateAllRows(
  type: ImportType,
  rows: Record<string, string>[]
): { valid: boolean; errors: string[]; validRows: number } {
  const allErrors: string[] = [];
  let validCount = 0;
  
  rows.forEach((row, index) => {
    const result = validateRow(type, row, index + 2); // +2 for header and 1-indexed
    if (result.valid) {
      validCount++;
    } else {
      allErrors.push(...result.errors);
    }
  });
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    validRows: validCount,
  };
}
