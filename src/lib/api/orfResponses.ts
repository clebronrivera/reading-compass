import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sessionResponseKeys } from './sessionResponses';
import type { TokenState, ORFComputedScores } from '@/types/orf';

export interface ORFResponseInsert {
  session_id: string;
  item_id: string;
  sequence_number: number;
  is_correct?: boolean;
  token_state_map: Record<number, TokenState>;
  elapsed_seconds: number;
  discontinue_flag: boolean;
  discontinue_reason?: string;
  computed_scores: ORFComputedScores;
  notes?: string;
}

export function useUpsertORFResponse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (response: ORFResponseInsert) => {
      // Cast to any to handle JSONB fields that Supabase types as Json
      const { data, error } = await supabase
        .from('session_responses')
        .upsert({
          session_id: response.session_id,
          item_id: response.item_id,
          sequence_number: response.sequence_number,
          is_correct: response.is_correct,
          token_state_map: response.token_state_map as unknown as Record<string, unknown>,
          elapsed_seconds: response.elapsed_seconds,
          discontinue_flag: response.discontinue_flag,
          discontinue_reason: response.discontinue_reason,
          computed_scores: response.computed_scores as unknown as Record<string, unknown>,
          notes: response.notes,
        } as never, { onConflict: 'session_id,item_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionResponseKeys.bySession(data.session_id) });
    },
  });
}
