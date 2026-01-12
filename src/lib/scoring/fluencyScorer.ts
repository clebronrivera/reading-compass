import { supabase } from '@/integrations/supabase/client';

export interface FluencyScores {
  items_correct: number;
  items_incorrect: number;
  items_per_minute: number;
  total_time_seconds: number;
  accuracy_percentage: number;
}

/**
 * Calculate fluency scores for a timed session.
 * Used by FL-LNF, FL-WRF, FL-ORF, etc.
 */
export async function calculateFluencyScore(sessionId: string): Promise<FluencyScores> {
  const { data: responses, error } = await supabase
    .from('session_responses')
    .select('is_correct, elapsed_seconds')
    .eq('session_id', sessionId)
    .order('sequence_number');

  if (error) throw error;

  if (!responses || responses.length === 0) {
    return {
      items_correct: 0,
      items_incorrect: 0,
      items_per_minute: 0,
      total_time_seconds: 0,
      accuracy_percentage: 0,
    };
  }

  const correct = responses.filter(r => r.is_correct === true).length;
  const incorrect = responses.filter(r => r.is_correct === false).length;
  const total = correct + incorrect;
  
  // Get max elapsed time from any response
  const maxElapsed = Math.max(...responses.map(r => r.elapsed_seconds || 0));
  const totalTime = maxElapsed > 0 ? maxElapsed : 60; // Default to 60 if not tracked
  
  const perMinute = totalTime > 0 ? (correct / totalTime) * 60 : 0;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  return {
    items_correct: correct,
    items_incorrect: incorrect,
    items_per_minute: Math.round(perMinute * 10) / 10,
    total_time_seconds: totalTime,
    accuracy_percentage: Math.round(accuracy * 10) / 10,
  };
}
