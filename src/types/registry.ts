// Reading Assessment Registry - Core Types

export type ComponentCode = 'PA' | 'PH' | 'FL' | 'VO' | 'RC';
export type AssessmentStatus = 'stub' | 'draft' | 'active' | 'deprecated';
export type FormStatus = 'draft' | 'active' | 'retired';
export type ContentBankStatus = 'empty' | 'in-progress' | 'ready';
export type ValidationStatus = 'incomplete' | 'valid' | 'needs-review';

// 1. Assessment Registry
export interface Assessment {
  assessment_id: string;
  component_code: ComponentCode;
  subcomponent_code: string;
  subcomponent_name: string;
  content_model: string;
  grade_range: string;
  status: AssessmentStatus;
  current_asr_version_id: string | null;
  content_bank_ids: string[];
}

// 2. ASR Library - Section Types
export interface ASRSectionA {
  asr_id: string;
  assessment_name: string;
  version: string;
  status: AssessmentStatus;
  last_updated: string;
  owner: string;
}

export interface ASRSectionB {
  component: string;
  subcomponent: string;
  skill_focus: string;
  grade_range: string;
  administration_format: string;
}

export interface ASRSectionC {
  purpose: string;
  what_it_measures: string;
  intended_use: string;
  not_designed_for: string;
}

// generation_source determines how provisioning creates items:
// - "stimulus_pool": items generated from stimulus_pool array (e.g., letter naming, phoneme lists)
// - "sample_items": items generated from sample_items array in section_d
// - "external_import": items must be imported manually; provisioning skips item generation
export type GenerationSource = 'stimulus_pool' | 'sample_items' | 'external_import';

export interface ASRSectionD {
  // MANDATORY: tells provisioning where item content comes from
  generation_source: GenerationSource;
  
  content_model: string;
  item_types: string[];
  stimulus_description: string;
  response_format: string;
  
  // Optional fields used based on generation_source
  item_type?: string;
  stimulus_pool?: string[];
  stimulus_rules?: string[];
  sample_items?: Array<{
    stimulus: string;
    expected_response?: string;
    item_type?: string;
    scoring_tags?: string[];
  }>;
}

export interface ASRSectionE {
  total_items: number;
  timing: string;
  stopping_rule: string;
  materials_required: string[];
}

export interface ASRSectionF {
  administration_script: string;
  practice_items: string;
  prompts: string[];
  allowable_supports: string[];
}

export interface ASRSectionG {
  scoring_method: string;
  score_types: string[];
  error_coding: string;
  scoring_rubric: string;
}

export interface ASRSectionH {
  raw_metrics: string[];
  derived_metrics: string[];
  benchmark_status: string;
  norm_reference: string;
}

export interface ASRSectionI {
  forms_available: string[];
  equivalence_sets: string;
  differentiation_keys: string[];
  version_notes: string;
}

export interface ASRSectionJ {
  data_export_format: string;
  integration_notes: string;
  reporting_dashboard: string;
  flags_and_alerts: string;
}

export interface ASRVersion {
  asr_version_id: string;
  assessment_id: string;
  section_a: ASRSectionA;
  section_b: ASRSectionB;
  section_c: ASRSectionC;
  section_d: ASRSectionD;
  section_e: ASRSectionE;
  section_f: ASRSectionF;
  section_g: ASRSectionG;
  section_h: ASRSectionH;
  section_i: ASRSectionI;
  section_j: ASRSectionJ;
  validation_status: ValidationStatus;
  completeness_percent: number;
  change_log: ChangeLogEntry[];
}

export interface ChangeLogEntry {
  date: string;
  author: string;
  description: string;
}

// 3. Content Bank Library
export interface ContentBank {
  content_bank_id: string;
  linked_assessment_id: string;
  name: string;
  differentiation_keys: string[];
  equivalence_set_required: boolean;
  target_bank_size: number;
  current_size: number;
  status: ContentBankStatus;
}

// 4. Form Library
export interface Form {
  form_id: string;
  content_bank_id: string;
  assessment_id: string;
  grade_or_level_tag: string;
  form_number: number;
  equivalence_set_id: string | null;
  status: FormStatus;
  metadata: FormMetadata;
}

export interface FormMetadata {
  readability_level?: string;
  word_count?: number;
  created_date: string;
  last_modified: string;
}

// 5. Item Library
export type ItemType = 'letter' | 'word' | 'sentence' | 'passage' | 'question' | 'prompt';

export interface Item {
  item_id: string;
  form_id: string;
  item_type: ItemType;
  sequence_number: number;
  content_payload: ItemContent;
  scoring_tags: string[];
}

export interface ItemContent {
  stimulus?: string;
  text?: string;
  choices?: string[];
  correct_answer?: string;
  rubric?: string;
  error_types?: string[];
}

// 6. Scoring Output Library
export interface ScoringOutput {
  scoring_model_id: string;
  assessment_id: string;
  raw_metrics_schema: MetricDefinition[];
  derived_metrics_schema: MetricDefinition[];
  formulas: ScoringFormula[];
  flags: ScoringFlag[];
  thresholds: ThresholdDefinition[];
}

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
