import { supabase } from '@/integrations/supabase/client';
import type { ImportType } from './templateSchemas';
import type { FormInsert, ContentBankInsert, ScoringOutputInsert } from '@/types/database';
import { createChangeLogEntry, formatImportSummary } from './changeLogger';

const BATCH_SIZE = 100;

export interface ImportResult {
  success: boolean;
  rowsProcessed: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsFailed: number;
  errors: string[];
}

export type ProgressCallback = (processed: number, total: number, phase: string) => void;

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Build content_payload from flat CSV columns
 */
function buildContentPayload(row: Record<string, string>): Json {
  const payload: Record<string, Json | undefined> = {};
  
  // Core fields
  if (row.stimulus) payload.stimulus = row.stimulus;
  if (row.text) payload.text = row.text;
  
  // MCQ-specific: parse pipe-delimited choices
  if (row.choices) {
    payload.options = row.choices.split('|').map((text, idx) => ({
      option_id: String.fromCharCode(65 + idx), // A, B, C, D
      text: text.trim(),
    })) as Json;
  }
  
  // Find correct_answer option_id
  if (row.correct_answer && payload.options) {
    const options = payload.options as { option_id: string; text: string }[];
    const match = options.find(o => o.text === row.correct_answer);
    payload.correct_option_id = match?.option_id || 'A';
  }
  
  // Comprehension-specific fields
  if (row.sentence_id) payload.sentence_id = row.sentence_id;
  if (row.skill_tag) payload.skill_tag = row.skill_tag;
  if (row.genre) payload.genre = row.genre;
  if (row.word_count) payload.word_count = parseInt(row.word_count);
  if (row.sentence_count) payload.sentence_count = parseInt(row.sentence_count);
  
  // Auto-calculate word count for passages
  if (row.item_type === 'passage' && row.text && !row.word_count) {
    payload.word_count = row.text.split(/\s+/).filter(Boolean).length;
  }
  
  return payload as Json;
}

/**
 * Batch upsert records
 */
async function batchUpsert(
  table: 'items' | 'forms' | 'content_banks' | 'scoring_outputs',
  records: Record<string, unknown>[],
  conflictColumn: string,
  onProgress?: ProgressCallback
): Promise<{ data: Record<string, unknown>[]; errors: string[] }> {
  const results: Record<string, unknown>[] = [];
  const errors: string[] = [];
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);
    
    onProgress?.(i + batch.length, records.length, `Uploading batch ${batchNum}/${totalBatches}`);
    
    try {
      const { data, error } = await supabase
        .from(table)
        .upsert(batch as never[], { onConflict: conflictColumn })
        .select();
      
      if (error) throw error;
      results.push(...(data as Record<string, unknown>[]));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Batch ${batchNum} failed: ${message}`);
    }
  }
  
  return { data: results, errors };
}

/**
 * Process items import
 */
export async function processItemsImport(
  rows: Record<string, string>[],
  changeNote: string,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  onProgress?.(0, rows.length, 'Building items...');
  
  const items: ItemInsert[] = rows.map(row => ({
    item_id: row.item_id,
    form_id: row.form_id,
    item_type: row.item_type,
    sequence_number: parseInt(row.sequence_number),
    content_payload: buildContentPayload(row),
    scoring_tags: row.scoring_tags ? row.scoring_tags.split('|').map(t => t.trim()) : [],
  }));
  
  const { data, errors } = await batchUpsert('items', items, 'item_id', onProgress);
  
  return {
    success: errors.length === 0,
    rowsProcessed: rows.length,
    rowsCreated: data.length, // Note: can't distinguish create vs update with upsert
    rowsUpdated: 0,
    rowsFailed: rows.length - data.length,
    errors,
  };
}

/**
 * Process forms import
 */
export async function processFormsImport(
  rows: Record<string, string>[],
  changeNote: string,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  onProgress?.(0, rows.length, 'Building forms...');
  
  const forms: FormInsert[] = rows.map(row => ({
    form_id: row.form_id,
    assessment_id: row.assessment_id,
    content_bank_id: row.content_bank_id,
    grade_or_level_tag: row.grade_or_level_tag,
    form_number: parseInt(row.form_number),
    status: (row.status as 'draft' | 'active' | 'retired') || 'draft',
    equivalence_set_id: row.equivalence_set_id || null,
  }));
  
  const { data, errors } = await batchUpsert('forms', forms, 'form_id', onProgress);
  
  return {
    success: errors.length === 0,
    rowsProcessed: rows.length,
    rowsCreated: data.length,
    rowsUpdated: 0,
    rowsFailed: rows.length - data.length,
    errors,
  };
}

/**
 * Process content banks import
 */
export async function processBanksImport(
  rows: Record<string, string>[],
  changeNote: string,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  onProgress?.(0, rows.length, 'Building banks...');
  
  const banks: ContentBankInsert[] = rows.map(row => ({
    content_bank_id: row.content_bank_id,
    linked_assessment_id: row.linked_assessment_id,
    name: row.name,
    target_bank_size: row.target_bank_size ? parseInt(row.target_bank_size) : 0,
    equivalence_set_required: row.equivalence_set_required === 'true',
    differentiation_keys: row.differentiation_keys ? row.differentiation_keys.split('|').map(k => k.trim()) : [],
    status: (row.status as 'empty' | 'in-progress' | 'ready') || 'empty',
  }));
  
  const { data, errors } = await batchUpsert('content_banks', banks, 'content_bank_id', onProgress);
  
  return {
    success: errors.length === 0,
    rowsProcessed: rows.length,
    rowsCreated: data.length,
    rowsUpdated: 0,
    rowsFailed: rows.length - data.length,
    errors,
  };
}

/**
 * Process ASR vertical format import (section merging)
 */
export async function processASRImport(
  rows: Record<string, string>[],
  changeNote: string,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  onProgress?.(0, rows.length, 'Processing ASR sections...');
  
  // Group rows by asr_version_id
  const grouped = new Map<string, Record<string, string>[]>();
  rows.forEach(row => {
    const id = row.asr_version_id;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id)!.push(row);
  });
  
  const errors: string[] = [];
  let processed = 0;
  
  for (const [asrId, sectionRows] of grouped.entries()) {
    try {
      // Fetch current ASR
      const { data: current, error: fetchError } = await supabase
        .from('asr_versions')
        .select('*')
        .eq('asr_version_id', asrId)
        .single();
      
      if (fetchError) throw new Error(`ASR ${asrId} not found`);
      
      // Build section updates
      const updates: Record<string, Record<string, unknown>> = {};
      
      for (const row of sectionRows) {
        const section = row.section;
        const field = row.field;
        const value = parseValue(row.value);
        
        if (!updates[section]) {
          // Start with existing section data
          updates[section] = (current[section as keyof typeof current] as Record<string, unknown>) || {};
        }
        updates[section][field] = value;
      }
      
      // Add to change_log
      const newLogEntry = createChangeLogEntry(formatImportSummary('asr', 0, sectionRows.length, changeNote));
      const existingLog = Array.isArray(current.change_log) ? current.change_log : [];
      const newLog = [...existingLog, newLogEntry];
      
      // Update ASR
      const { error: updateError } = await supabase
        .from('asr_versions')
        .update({
          ...updates,
          change_log: newLog as Json[],
        })
        .eq('asr_version_id', asrId);
      
      if (updateError) throw updateError;
      
      processed += sectionRows.length;
      onProgress?.(processed, rows.length, 'Updating ASR sections...');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`ASR ${asrId}: ${message}`);
    }
  }
  
  return {
    success: errors.length === 0,
    rowsProcessed: rows.length,
    rowsCreated: 0,
    rowsUpdated: processed,
    rowsFailed: rows.length - processed,
    errors,
  };
}

/**
 * Process scoring outputs import
 */
export async function processScoringImport(
  rows: Record<string, string>[],
  changeNote: string,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  onProgress?.(0, rows.length, 'Processing scoring data...');
  
  // Group rows by scoring_model_id
  const grouped = new Map<string, Record<string, string>[]>();
  rows.forEach(row => {
    const id = row.scoring_model_id;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id)!.push(row);
  });
  
  const scoringOutputs: ScoringOutputInsert[] = [];
  
  for (const [modelId, metricRows] of grouped.entries()) {
    const assessmentId = metricRows[0]?.assessment_id;
    
    const rawMetrics = metricRows
      .filter(r => r.metric_type === 'raw')
      .map(r => ({
        metric_id: r.metric_id,
        name: r.metric_name,
        type: r.metric_data_type || 'count',
        description: '',
      }));
    
    const derivedMetrics = metricRows
      .filter(r => r.metric_type === 'derived')
      .map(r => ({
        metric_id: r.metric_id,
        name: r.metric_name,
        type: r.metric_data_type || 'rate',
        description: '',
      }));
    
    const formulas = metricRows
      .filter(r => r.metric_type === 'derived' && r.formula)
      .map(r => ({
        formula_id: `${r.metric_id}_formula`,
        name: r.metric_name,
        expression: r.formula,
        inputs: [],
        output: r.metric_id,
      }));
    
    scoringOutputs.push({
      scoring_model_id: modelId,
      assessment_id: assessmentId,
      raw_metrics_schema: rawMetrics,
      derived_metrics_schema: derivedMetrics,
      formulas,
    });
  }
  
  const { data, errors } = await batchUpsert('scoring_outputs', scoringOutputs, 'scoring_model_id', onProgress);
  
  return {
    success: errors.length === 0,
    rowsProcessed: rows.length,
    rowsCreated: data.length,
    rowsUpdated: 0,
    rowsFailed: grouped.size - data.length,
    errors,
  };
}

/**
 * Parse value from CSV (handle arrays, numbers, booleans)
 */
function parseValue(value: string): unknown {
  // Handle pipe-delimited arrays
  if (value.includes('|')) {
    return value.split('|').map(v => v.trim());
  }
  
  // Handle numbers
  if (/^\d+$/.test(value)) {
    return parseInt(value);
  }
  if (/^\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }
  
  // Handle booleans
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  
  return value;
}

/**
 * Main import dispatcher
 */
export async function processImport(
  type: ImportType,
  rows: Record<string, string>[],
  changeNote: string,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  switch (type) {
    case 'items':
      return processItemsImport(rows, changeNote, onProgress);
    case 'forms':
      return processFormsImport(rows, changeNote, onProgress);
    case 'banks':
      return processBanksImport(rows, changeNote, onProgress);
    case 'asr':
      return processASRImport(rows, changeNote, onProgress);
    case 'scoring':
      return processScoringImport(rows, changeNote, onProgress);
  }
}
