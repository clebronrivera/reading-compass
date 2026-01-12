import { supabase } from '@/integrations/supabase/client';
import { scoreSession, type SessionScores } from './scoring';

export interface SessionExport {
  session_id: string;
  student_name: string;
  grade_tag: string | null;
  assessment_id: string;
  form_id: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  scores: SessionScores | null;
  responses: Array<{
    sequence: number;
    item_id: string;
    stimulus: string | null;
    is_correct: boolean | null;
    error_tags: string[] | null;
    response_time_ms: number | null;
    notes: string | null;
  }>;
  discontinue?: {
    flag: boolean;
    reason: string | null;
  };
  metadata: {
    exported_at: string;
    export_version: string;
  };
}

/**
 * Export a complete session with all response data and computed scores.
 */
export async function exportSession(sessionId: string): Promise<SessionExport | null> {
  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (sessionError || !session) return null;

  // Fetch responses with item data
  const { data: responses, error: responsesError } = await supabase
    .from('session_responses')
    .select('*, items(content_payload)')
    .eq('session_id', sessionId)
    .order('sequence_number');

  if (responsesError) return null;

  // Calculate scores
  const scoredSession = await scoreSession(sessionId);

  // Find discontinue info from first response
  const firstResponse = responses?.[0];
  const discontinue = firstResponse?.discontinue_flag
    ? { flag: true, reason: firstResponse.discontinue_reason }
    : undefined;

  return {
    session_id: session.session_id,
    student_name: session.student_name,
    grade_tag: session.grade_tag,
    assessment_id: session.assessment_id,
    form_id: session.form_id,
    started_at: session.started_at,
    completed_at: session.completed_at,
    status: session.status,
    scores: scoredSession?.scores || null,
    responses: (responses || []).map(r => ({
      sequence: r.sequence_number,
      item_id: r.item_id,
      stimulus: (r.items as any)?.content_payload?.stimulus || null,
      is_correct: r.is_correct,
      error_tags: r.error_tags,
      response_time_ms: r.response_time_ms,
      notes: r.notes,
    })),
    discontinue,
    metadata: {
      exported_at: new Date().toISOString(),
      export_version: '1.0',
    },
  };
}

/**
 * Download session as JSON file.
 */
export async function downloadSessionJSON(sessionId: string): Promise<void> {
  const data = await exportSession(sessionId);
  
  if (!data) {
    throw new Error('Failed to export session');
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `session-${sessionId}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
