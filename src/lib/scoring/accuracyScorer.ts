import { supabase } from '@/integrations/supabase/client';

export interface AccuracyScores {
  total_items: number;
  correct: number;
  incorrect: number;
  accuracy_percentage: number;
  error_breakdown: Record<string, number>;
}

/**
 * Calculate accuracy scores for untimed assessments.
 * Used by PA-*, VO-*, PH-* assessments.
 */
export async function calculateAccuracyScore(sessionId: string): Promise<AccuracyScores> {
  const { data: responses, error } = await supabase
    .from('session_responses')
    .select('is_correct, error_tags')
    .eq('session_id', sessionId);

  if (error) throw error;

  if (!responses || responses.length === 0) {
    return {
      total_items: 0,
      correct: 0,
      incorrect: 0,
      accuracy_percentage: 0,
      error_breakdown: {},
    };
  }

  const total = responses.length;
  const correct = responses.filter(r => r.is_correct === true).length;
  const incorrect = responses.filter(r => r.is_correct === false).length;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  // Build error breakdown
  const errorBreakdown: Record<string, number> = {};
  responses.forEach(r => {
    if (!r.is_correct && r.error_tags) {
      r.error_tags.forEach((tag: string) => {
        errorBreakdown[tag] = (errorBreakdown[tag] || 0) + 1;
      });
    }
  });

  return {
    total_items: total,
    correct,
    incorrect,
    accuracy_percentage: Math.round(accuracy * 10) / 10,
    error_breakdown: errorBreakdown,
  };
}
