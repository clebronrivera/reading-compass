import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SessionResponseRow, SessionResponseInsert } from '@/types/database';

export const sessionResponseKeys = {
  all: ['sessionResponses'] as const,
  bySession: (sessionId: string) => [...sessionResponseKeys.all, 'session', sessionId] as const,
};

export function useSessionResponses(sessionId: string) {
  return useQuery({
    queryKey: sessionResponseKeys.bySession(sessionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_number');
      if (error) throw error;
      return data as SessionResponseRow[];
    },
    enabled: !!sessionId,
  });
}

export function useUpsertSessionResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (response: SessionResponseInsert) => {
      const { data, error } = await supabase
        .from('session_responses')
        .upsert(response, { onConflict: 'session_id,item_id' })
        .select()
        .single();
      if (error) throw error;
      return data as SessionResponseRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionResponseKeys.bySession(data.session_id) });
    },
  });
}
