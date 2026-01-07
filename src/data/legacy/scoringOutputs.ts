import { ScoringOutput } from '@/types/registry';

export const scoringOutputs: ScoringOutput[] = [
  {
    scoring_model_id: 'PH-ALPH.scoring1',
    assessment_id: 'PH-ALPH',
    raw_metrics_schema: [
      { metric_id: 'uppercase_correct', name: 'Uppercase Letters Correct', type: 'count', description: 'Number of uppercase letters correctly identified (0-26)' },
      { metric_id: 'lowercase_correct', name: 'Lowercase Letters Correct', type: 'count', description: 'Number of lowercase letters correctly identified (0-26)' },
      { metric_id: 'sounds_correct', name: 'Letter Sounds Correct', type: 'count', description: 'Number of letter sounds correctly produced (0-26)' },
    ],
    derived_metrics_schema: [
      { metric_id: 'total_letters', name: 'Total Letters Known', type: 'composite', description: 'Sum of uppercase and lowercase correct' },
      { metric_id: 'letter_name_pct', name: 'Letter Name Percentage', type: 'rate', description: 'Percentage of letter names known (0-100%)' },
      { metric_id: 'sound_correspondence_rate', name: 'Sound Correspondence Rate', type: 'rate', description: 'Ratio of sounds known to letters known' },
    ],
    formulas: [
      { formula_id: 'f1', name: 'Total Letters', expression: 'uppercase_correct + lowercase_correct', inputs: ['uppercase_correct', 'lowercase_correct'], output: 'total_letters' },
      { formula_id: 'f2', name: 'Letter Name Percentage', expression: '(uppercase_correct + lowercase_correct) / 52 * 100', inputs: ['uppercase_correct', 'lowercase_correct'], output: 'letter_name_pct' },
      { formula_id: 'f3', name: 'Sound Correspondence', expression: 'sounds_correct / total_letters * 100', inputs: ['sounds_correct', 'total_letters'], output: 'sound_correspondence_rate' },
    ],
    flags: [
      { flag_id: 'flag1', name: 'Low Letter Knowledge', condition: 'total_letters < 26', severity: 'warning' },
      { flag_id: 'flag2', name: 'No Sounds Known', condition: 'sounds_correct == 0', severity: 'critical' },
      { flag_id: 'flag3', name: 'Below Benchmark', condition: 'letter_name_pct < 50 AND grade == K AND period == mid-year', severity: 'warning' },
    ],
    thresholds: [
      { threshold_id: 't1', metric_id: 'total_letters', grade_level: 'End of PreK', benchmark_value: 20, status: 'placeholder' },
      { threshold_id: 't2', metric_id: 'total_letters', grade_level: 'Mid-K', benchmark_value: 40, status: 'placeholder' },
      { threshold_id: 't3', metric_id: 'total_letters', grade_level: 'End of K', benchmark_value: 52, status: 'placeholder' },
      { threshold_id: 't4', metric_id: 'sounds_correct', grade_level: 'End of K', benchmark_value: 22, status: 'placeholder' },
    ],
  },
];

export function getScoringOutputById(modelId: string): ScoringOutput | undefined {
  return scoringOutputs.find(s => s.scoring_model_id === modelId);
}

export function getScoringOutputsByAssessment(assessmentId: string): ScoringOutput[] {
  return scoringOutputs.filter(s => s.assessment_id === assessmentId);
}

export function getAllScoringOutputs(): ScoringOutput[] {
  return scoringOutputs;
}
