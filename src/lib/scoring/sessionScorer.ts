import { supabase } from '@/integrations/supabase/client';
import { calculateFluencyScore, type FluencyScores } from './fluencyScorer';
import { calculateAccuracyScore, type AccuracyScores } from './accuracyScorer';

export type SessionScores = FluencyScores | AccuracyScores;

export interface ScoredSession {
  session_id: string;
  assessment_id: string;
  scoring_type: 'fluency' | 'accuracy';
  scores: SessionScores;
}

/**
 * Unified scoring dispatcher that routes to appropriate scorer based on assessment type.
 */
export async function scoreSession(sessionId: string): Promise<ScoredSession | null> {
  const { data: session, error } = await supabase
    .from('sessions')
    .select('session_id, assessment_id')
    .eq('session_id', sessionId)
    .single();

  if (error || !session) return null;

  const isFluency = session.assessment_id.startsWith('FL-');
  
  const scores = isFluency
    ? await calculateFluencyScore(sessionId)
    : await calculateAccuracyScore(sessionId);

  return {
    session_id: sessionId,
    assessment_id: session.assessment_id,
    scoring_type: isFluency ? 'fluency' : 'accuracy',
    scores,
  };
}

/**
 * Score a session and persist the scores to the first response record.
 */
export async function scoreAndPersistSession(sessionId: string): Promise<ScoredSession | null> {
  const result = await scoreSession(sessionId);
  
  if (!result) return null;

  // Update the first response with computed scores
  const { data: responses } = await supabase
    .from('session_responses')
    .select('response_id')
    .eq('session_id', sessionId)
    .order('sequence_number')
    .limit(1);

  if (responses && responses.length > 0) {
    await supabase
      .from('session_responses')
      .update({ computed_scores: result.scores as unknown as import('@/integrations/supabase/types').Json })
      .eq('response_id', responses[0].response_id);
  }

  return result;
}
