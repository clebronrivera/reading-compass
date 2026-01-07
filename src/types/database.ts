// Database row types derived from Supabase schema
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Row types
export type AssessmentRow = Tables<'assessments'>;
export type ASRVersionRow = Tables<'asr_versions'>;
export type ContentBankRow = Tables<'content_banks'>;
export type AssessmentBankRow = Tables<'assessment_banks'>;
export type FormRow = Tables<'forms'>;
export type ItemRow = Tables<'items'>;
export type ScoringOutputRow = Tables<'scoring_outputs'>;
export type SessionRow = Tables<'sessions'>;
export type SessionResponseRow = Tables<'session_responses'>;

// Insert types
export type AssessmentInsert = TablesInsert<'assessments'>;
export type ASRVersionInsert = TablesInsert<'asr_versions'>;
export type ContentBankInsert = TablesInsert<'content_banks'>;
export type AssessmentBankInsert = TablesInsert<'assessment_banks'>;
export type FormInsert = TablesInsert<'forms'>;
export type ItemInsert = TablesInsert<'items'>;
export type ScoringOutputInsert = TablesInsert<'scoring_outputs'>;

// Update types
export type AssessmentUpdate = TablesUpdate<'assessments'>;
export type ASRVersionUpdate = TablesUpdate<'asr_versions'>;
export type ContentBankUpdate = TablesUpdate<'content_banks'>;
export type FormUpdate = TablesUpdate<'forms'>;
export type ItemUpdate = TablesUpdate<'items'>;
export type ScoringOutputUpdate = TablesUpdate<'scoring_outputs'>;
export type SessionUpdate = TablesUpdate<'sessions'>;
export type SessionResponseUpdate = TablesUpdate<'session_responses'>;

// Insert types for new tables
export type SessionInsert = TablesInsert<'sessions'>;
export type SessionResponseInsert = TablesInsert<'session_responses'>;

// Component code type (derived from database constraint)
export type ComponentCode = 'PA' | 'PH' | 'FL' | 'VO' | 'RC';

// Status types
export type AssessmentStatus = 'stub' | 'draft' | 'active' | 'deprecated';
export type FormStatus = 'draft' | 'active' | 'retired';
export type ContentBankStatus = 'empty' | 'in-progress' | 'ready';
export type ValidationStatus = 'incomplete' | 'valid' | 'needs-review';
export type ItemType = 'letter' | 'word' | 'sentence' | 'passage' | 'question' | 'prompt';
export type SessionStatus = 'created' | 'in_progress' | 'completed';

// ASR Section types (for type-safe JSONB access)
export interface ASRSectionA {
  asr_id?: string;
  assessment_name?: string;
  version?: string;
  status?: string;
  last_updated?: string;
  owner?: string;
}

export interface ASRSectionB {
  component?: string;
  subcomponent?: string;
  skill_focus?: string;
  grade_range?: string;
  administration_format?: string;
}

export interface ASRSectionC {
  purpose?: string;
  what_it_measures?: string;
  intended_use?: string;
  not_designed_for?: string;
}

export interface ASRSectionD {
  content_model?: string;
  item_types?: string[];
  stimulus_description?: string;
  response_format?: string;
}

export interface ASRSectionE {
  total_items?: number;
  timing?: string;
  stopping_rule?: string;
  materials_required?: string[];
}

export interface ASRSectionF {
  administration_script?: string;
  practice_items?: string;
  prompts?: string[];
  allowable_supports?: string[];
}

export interface ASRSectionG {
  scoring_method?: string;
  score_types?: string[];
  error_coding?: string;
  scoring_rubric?: string;
}

export interface ASRSectionH {
  raw_metrics?: string[];
  derived_metrics?: string[];
  benchmark_status?: string;
  norm_reference?: string;
}

export interface ASRSectionI {
  forms_available?: string[];
  equivalence_sets?: string;
  differentiation_keys?: string[];
  version_notes?: string;
}

export interface ASRSectionJ {
  data_export_format?: string;
  integration_notes?: string;
  reporting_dashboard?: string;
  flags_and_alerts?: string;
}

export interface ChangeLogEntry {
  date: string;
  author: string;
  description: string;
}

// Scoring types (for type-safe JSONB access)
export interface MetricDefinition {
  metric_id: string;
  name: string;
  type: 'count' | 'rate' | 'time' | 'composite';
  description: string;
}

export interface ScoringFormula {
  formula_id: string;
  name: string;
  expression: string;
  inputs: string[];
  output: string;
}

export interface ScoringFlag {
  flag_id: string;
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface ThresholdDefinition {
  threshold_id: string;
  metric_id: string;
  grade_level: string;
  benchmark_value: number | null;
  status: 'placeholder' | 'validated';
}

// Form metadata type
export interface FormMetadata {
  readability_level?: string;
  word_count?: number;
  created_date?: string;
  last_modified?: string;
}

// Item content type
export interface ItemContent {
  stimulus?: string;
  text?: string;
  choices?: string[];
  correct_answer?: string;
  rubric?: string;
  error_types?: string[];
}

// Component metadata for UI
export interface ComponentInfo {
  code: ComponentCode;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const COMPONENT_INFO: Record<ComponentCode, ComponentInfo> = {
  PA: { code: 'PA', name: 'Phonological Awareness', color: 'text-component-pa', bgColor: 'bg-component-pa/10', borderColor: 'border-component-pa' },
  PH: { code: 'PH', name: 'Phonics', color: 'text-component-ph', bgColor: 'bg-component-ph/10', borderColor: 'border-component-ph' },
  FL: { code: 'FL', name: 'Fluency', color: 'text-component-fl', bgColor: 'bg-component-fl/10', borderColor: 'border-component-fl' },
  VO: { code: 'VO', name: 'Vocabulary', color: 'text-component-vo', bgColor: 'bg-component-vo/10', borderColor: 'border-component-vo' },
  RC: { code: 'RC', name: 'Reading Comprehension', color: 'text-component-rc', bgColor: 'bg-component-rc/10', borderColor: 'border-component-rc' },
};
