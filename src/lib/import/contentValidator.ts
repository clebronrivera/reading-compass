import { VALID_GRADE_TAGS, type CanonicalGradeTag } from '@/types/database';

export interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Valid item types (from database constraint)
const VALID_ITEM_TYPES = [
  'letter',
  'word', 
  'sentence',
  'passage',
  'question',
  'prompt',
  'phoneme',
  'printed_word',
  'printed_affixed_word_with_base_context',
  'mcq',
  'spoken_onset_rime_pair',
  'word_pair',
  'syllable_word',
];

/**
 * Validate a grade tag value.
 */
export function validateGradeTag(grade: string): boolean {
  return VALID_GRADE_TAGS.includes(grade as CanonicalGradeTag);
}

/**
 * Validate an item type value.
 */
export function validateItemType(type: string): boolean {
  return VALID_ITEM_TYPES.includes(type);
}

/**
 * Validate a single import row.
 */
export function validateImportRow(
  row: Record<string, string>,
  rowIndex: number
): { errors: ValidationError[]; warnings: ValidationError[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!row.stimulus && !row.text && !row.word) {
    errors.push({
      row: rowIndex,
      field: 'stimulus',
      value: '',
      message: 'Row must have a stimulus, text, or word field',
    });
  }

  // Validate grade if present
  if (row.grade && !validateGradeTag(row.grade)) {
    errors.push({
      row: rowIndex,
      field: 'grade',
      value: row.grade,
      message: `Invalid grade tag "${row.grade}". Valid values: ${VALID_GRADE_TAGS.slice(0, 5).join(', ')}...`,
    });
  }

  // Validate item_type if present
  if (row.item_type && !validateItemType(row.item_type)) {
    errors.push({
      row: rowIndex,
      field: 'item_type',
      value: row.item_type,
      message: `Invalid item type "${row.item_type}". Valid values: ${VALID_ITEM_TYPES.slice(0, 5).join(', ')}...`,
    });
  }

  // Check for sequence number
  if (row.sequence && isNaN(parseInt(row.sequence))) {
    errors.push({
      row: rowIndex,
      field: 'sequence',
      value: row.sequence,
      message: 'Sequence must be a number',
    });
  }

  // Warnings for optional but recommended fields
  if (!row.form_id) {
    warnings.push({
      row: rowIndex,
      field: 'form_id',
      value: '',
      message: 'No form_id specified - items will need to be assigned to a form',
    });
  }

  return { errors, warnings };
}

/**
 * Validate all rows in an import batch.
 */
export function validateImportBatch(rows: Record<string, string>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowValidation = validateImportRow(row, index + 2); // +2 for 1-indexed and header row
    errors.push(...rowValidation.errors);
    warnings.push(...rowValidation.warnings);
  });

  // Check for duplicate stimuli across batch
  const stimuli = rows.map(r => r.stimulus || r.text || r.word).filter(Boolean);
  const seenStimuli = new Set<string>();
  const duplicates = new Set<string>();

  stimuli.forEach(s => {
    if (seenStimuli.has(s)) {
      duplicates.add(s);
    }
    seenStimuli.add(s);
  });

  if (duplicates.size > 0) {
    warnings.push({
      row: 0,
      field: 'stimulus',
      value: '',
      message: `${duplicates.size} duplicate stimulus values found`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
