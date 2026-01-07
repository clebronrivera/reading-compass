import { ASRVersion } from '@/types/registry';

// Complete ASR for PH-ALPH (Alphabet Knowledge) as reference example
export const asrLibrary: ASRVersion[] = [
  {
    asr_version_id: 'PH-ALPH.v1',
    assessment_id: 'PH-ALPH',
    section_a: {
      asr_id: 'ASR-001',
      assessment_name: 'Alphabet Knowledge Assessment',
      version: '1.0',
      status: 'active',
      last_updated: '2024-01-15',
      owner: 'Reading Assessment Team',
    },
    section_b: {
      component: 'Phonics',
      subcomponent: 'Alphabet Knowledge',
      skill_focus: 'Letter name identification and letter-sound correspondence',
      grade_range: 'PreK-1',
      administration_format: 'Individual, 1:1 with assessor',
    },
    section_c: {
      purpose: 'To measure student knowledge of letter names and their corresponding sounds',
      what_it_measures: 'Automatic recognition of uppercase and lowercase letters; association between letters and their primary sounds',
      intended_use: 'Screening, diagnostic assessment, and progress monitoring for early literacy',
      not_designed_for: 'Advanced phonics patterns, digraphs, or blends assessment',
    },
    section_d: {
      generation_source: 'stimulus_pool',
      content_model: 'Fixed Set',
      item_types: ['Letter identification (uppercase)', 'Letter identification (lowercase)', 'Letter-sound production'],
      stimulus_description: 'Individual letters presented on cards or screen in randomized order',
      response_format: 'Oral response - student names letter or produces sound',
    },
    section_e: {
      total_items: 78,
      timing: 'Untimed, approximately 3-5 minutes',
      stopping_rule: 'Complete all items; no ceiling rule',
      materials_required: ['Letter cards or digital display', 'Scoring sheet', 'Timer (optional)'],
    },
    section_f: {
      administration_script: 'Say: "I am going to show you some letters. Tell me the name of each letter." For sounds: "Now tell me the sound this letter makes."',
      practice_items: '2 practice letters with corrective feedback before scored items',
      prompts: ['What letter is this?', 'What sound does this letter make?'],
      allowable_supports: ['Repeat prompt once', 'Point to letter', 'No phonetic hints'],
    },
    section_g: {
      scoring_method: 'Binary (correct/incorrect) for each item',
      score_types: ['Raw score (0-78)', 'Percentage correct', 'Separate scores for names vs. sounds'],
      error_coding: 'Record specific errors: substitutions, no response, self-corrections',
      scoring_rubric: 'Correct: Clear, accurate response within 3 seconds. Incorrect: Wrong response, no response after 3 seconds, or unclear articulation.',
    },
    section_h: {
      raw_metrics: ['Uppercase letters correct (0-26)', 'Lowercase letters correct (0-26)', 'Letter sounds correct (0-26)'],
      derived_metrics: ['Total letters known', 'Total sounds known', 'Letter-sound correspondence rate'],
      benchmark_status: 'Benchmarks established for end of PreK, mid-K, end of K',
      norm_reference: 'Local norms; aligned with DIBELS letter naming fluency concepts',
    },
    section_i: {
      forms_available: ['Form A (standard randomized)', 'Form B (alternate randomized)'],
      equivalence_sets: 'Forms A and B are equivalent in difficulty',
      differentiation_keys: ['Grade level', 'Uppercase/lowercase focus'],
      version_notes: 'v1.0 - Initial validated version',
    },
    section_j: {
      data_export_format: 'CSV with student ID, date, item-level responses, and summary scores',
      integration_notes: 'Compatible with standard SIS data import formats',
      reporting_dashboard: 'Individual student report, class summary, grade-level trends',
      flags_and_alerts: 'Flag students below 50% at mid-K; alert for 0 sounds known',
    },
    validation_status: 'valid',
    completeness_percent: 100,
    change_log: [
      { date: '2024-01-15', author: 'Assessment Team', description: 'Initial version created' },
      { date: '2024-01-20', author: 'Assessment Team', description: 'Added Form B equivalence notes' },
    ],
  },
];

// Helper functions
export function getASRByVersionId(versionId: string): ASRVersion | undefined {
  return asrLibrary.find(asr => asr.asr_version_id === versionId);
}

export function getASRsByAssessmentId(assessmentId: string): ASRVersion[] {
  return asrLibrary.filter(asr => asr.assessment_id === assessmentId);
}

export function getAllASRs(): ASRVersion[] {
  return asrLibrary;
}
