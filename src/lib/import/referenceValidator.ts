import { supabase } from '@/integrations/supabase/client';
import type { ImportType } from './templateSchemas';

export interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ReferenceValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  analysis: {
    existingIds: string[];
    missingIds: string[];
    toCreate: number;
    toUpdate: number;
  };
}

/**
 * Check that form_id references exist in database
 */
export async function validateFormReferences(
  rows: Record<string, string>[]
): Promise<ReferenceValidationResult> {
  const formIds = [...new Set(rows.map(r => r.form_id).filter(Boolean))];
  
  if (formIds.length === 0) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      analysis: { existingIds: [], missingIds: [], toCreate: 0, toUpdate: 0 },
    };
  }
  
  const { data: existingForms } = await supabase
    .from('forms')
    .select('form_id')
    .in('form_id', formIds);
  
  const existingSet = new Set(existingForms?.map(f => f.form_id) || []);
  const missingFormIds = formIds.filter(id => !existingSet.has(id));
  
  const errors: ValidationError[] = missingFormIds.map(id => ({
    row: 0,
    field: 'form_id',
    value: id,
    message: `Form "${id}" does not exist. Create it first or include in forms import.`,
  }));
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    analysis: {
      existingIds: [...existingSet],
      missingIds: missingFormIds,
      toCreate: 0,
      toUpdate: 0,
    },
  };
}

/**
 * Check that content_bank_id references exist
 */
export async function validateBankReferences(
  rows: Record<string, string>[]
): Promise<ReferenceValidationResult> {
  const bankIds = [...new Set(rows.map(r => r.content_bank_id).filter(Boolean))];
  
  if (bankIds.length === 0) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      analysis: { existingIds: [], missingIds: [], toCreate: 0, toUpdate: 0 },
    };
  }
  
  const { data: existingBanks } = await supabase
    .from('content_banks')
    .select('content_bank_id')
    .in('content_bank_id', bankIds);
  
  const existingSet = new Set(existingBanks?.map(b => b.content_bank_id) || []);
  const missingBankIds = bankIds.filter(id => !existingSet.has(id));
  
  const errors: ValidationError[] = missingBankIds.map(id => ({
    row: 0,
    field: 'content_bank_id',
    value: id,
    message: `Content Bank "${id}" does not exist.`,
  }));
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    analysis: {
      existingIds: [...existingSet],
      missingIds: missingBankIds,
      toCreate: 0,
      toUpdate: 0,
    },
  };
}

/**
 * Validate assessment context match
 */
export async function validateAssessmentContext(
  rows: Record<string, string>[],
  currentAssessmentId: string
): Promise<ReferenceValidationResult> {
  const errors: ValidationError[] = [];
  
  rows.forEach((row, index) => {
    if (row.assessment_id && row.assessment_id !== currentAssessmentId) {
      errors.push({
        row: index + 2,
        field: 'assessment_id',
        value: row.assessment_id,
        message: `Assessment ID "${row.assessment_id}" doesn't match current context "${currentAssessmentId}"`,
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    analysis: { existingIds: [], missingIds: [], toCreate: 0, toUpdate: 0 },
  };
}

/**
 * Analyze import to determine creates vs updates
 */
export async function analyzeImport(
  type: ImportType,
  rows: Record<string, string>[]
): Promise<ReferenceValidationResult> {
  const idField = getIdField(type);
  
  const ids = [...new Set(rows.map(r => r[idField]).filter(Boolean))];
  
  if (ids.length === 0) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      analysis: { existingIds: [], missingIds: [], toCreate: 0, toUpdate: 0 },
    };
  }
  
  // Query each table type separately to avoid type issues
  let existingIds: string[] = [];
  
  if (type === 'items') {
    const { data } = await supabase.from('items').select('item_id').in('item_id', ids);
    existingIds = data?.map(r => r.item_id) || [];
  } else if (type === 'forms') {
    const { data } = await supabase.from('forms').select('form_id').in('form_id', ids);
    existingIds = data?.map(r => r.form_id) || [];
  } else if (type === 'banks') {
    const { data } = await supabase.from('content_banks').select('content_bank_id').in('content_bank_id', ids);
    existingIds = data?.map(r => r.content_bank_id) || [];
  } else if (type === 'asr') {
    const { data } = await supabase.from('asr_versions').select('asr_version_id').in('asr_version_id', ids);
    existingIds = data?.map(r => r.asr_version_id) || [];
  } else if (type === 'scoring') {
    const { data } = await supabase.from('scoring_outputs').select('scoring_model_id').in('scoring_model_id', ids);
    existingIds = data?.map(r => r.scoring_model_id) || [];
  }
  
  const existingSet = new Set(existingIds);
  const newIds = ids.filter(id => !existingSet.has(id));
  
  return {
    valid: true,
    errors: [],
    warnings: existingIds.length > 0 ? [{
      row: 0,
      field: idField,
      value: '',
      message: `${existingIds.length} records will be UPDATED (existing IDs found)`,
    }] : [],
    analysis: {
      existingIds: [...existingSet],
      missingIds: newIds,
      toCreate: newIds.length,
      toUpdate: existingIds.length,
    },
  };
}

function getIdField(type: ImportType): string {
  switch (type) {
    case 'items': return 'item_id';
    case 'forms': return 'form_id';
    case 'banks': return 'content_bank_id';
    case 'asr': return 'asr_version_id';
    case 'scoring': return 'scoring_model_id';
  }
}
