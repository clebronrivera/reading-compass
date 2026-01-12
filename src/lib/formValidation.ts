import { supabase } from '@/integrations/supabase/client';
import type { ItemRow, FormRow } from '@/types/database';

export interface FormValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Assessment-specific item count requirements
const ITEM_COUNT_RULES: Record<string, { min: number; max: number }> = {
  'FL-LNF': { min: 100, max: 100 },
  'FL-ORF': { min: 1, max: 1 },
  'FL-WRF': { min: 40, max: 50 },
  'FL-PSF': { min: 20, max: 20 },
  'PA-OONS': { min: 20, max: 20 },
  'PA-RHYM': { min: 20, max: 20 },
  'PA-SYLS': { min: 20, max: 20 },
  'PA-PHON': { min: 20, max: 20 },
  'PH-LWID': { min: 40, max: 40 },
  'PH-MPHY': { min: 25, max: 25 },
  'PH-ALPH': { min: 26, max: 52 },
  'VO-MORP': { min: 24, max: 24 },
  'VO-VOCA': { min: 24, max: 24 },
  'VO-EPVT': { min: 30, max: 30 },
  'VO-RPVT': { min: 30, max: 30 },
};

/**
 * Validate items for a form meet all requirements.
 */
export async function validateFormItems(formId: string): Promise<FormValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Fetch form and items
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('*')
    .eq('form_id', formId)
    .single();

  if (formError || !form) {
    return { valid: false, errors: ['Form not found'], warnings: [] };
  }

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('form_id', formId)
    .order('sequence_number');

  if (itemsError) {
    return { valid: false, errors: ['Failed to fetch items'], warnings: [] };
  }

  const itemCount = items?.length || 0;

  // Check item count requirements
  const countRule = ITEM_COUNT_RULES[form.assessment_id];
  if (countRule) {
    if (itemCount < countRule.min) {
      errors.push(`Form requires at least ${countRule.min} items (has ${itemCount})`);
    }
    if (itemCount > countRule.max) {
      errors.push(`Form allows at most ${countRule.max} items (has ${itemCount})`);
    }
  }

  // Check for no items
  if (itemCount === 0) {
    errors.push('Form has no items');
    return { valid: false, errors, warnings };
  }

  // Check sequence number integrity
  const sequences = items!.map(i => i.sequence_number);
  const uniqueSequences = new Set(sequences);
  if (sequences.length !== uniqueSequences.size) {
    errors.push('Duplicate sequence numbers detected');
  }

  // Check for gaps in sequence
  const sortedSequences = [...sequences].sort((a, b) => a - b);
  for (let i = 0; i < sortedSequences.length; i++) {
    if (sortedSequences[i] !== i + 1) {
      warnings.push('Sequence numbers have gaps (expected 1, 2, 3, ...)');
      break;
    }
  }

  // Check for duplicate stimuli
  const stimuli = items!
    .map(i => (i.content_payload as { stimulus?: string })?.stimulus)
    .filter(Boolean);
  
  const uniqueStimuli = new Set(stimuli);
  if (stimuli.length !== uniqueStimuli.size) {
    warnings.push('Duplicate stimuli found in form');
  }

  // Check all items have content
  const emptyItems = items!.filter(i => {
    const payload = i.content_payload as { stimulus?: string; text?: string };
    return !payload?.stimulus && !payload?.text;
  });
  
  if (emptyItems.length > 0) {
    errors.push(`${emptyItems.length} items have no stimulus content`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a form can be activated (set to 'active' status).
 */
export async function canActivateForm(formId: string): Promise<FormValidationResult> {
  const validation = await validateFormItems(formId);
  
  // Add additional activation-specific checks
  if (validation.valid) {
    // Could add more checks here like:
    // - Form must have metadata
    // - Grade tag must be set
    // - etc.
  }

  return validation;
}
