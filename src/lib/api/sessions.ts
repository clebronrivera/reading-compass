import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SessionRow, SessionInsert, SessionUpdate } from '@/types/database';

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
};

export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SessionRow[];
    },
  });
}

export function useSession(id: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as SessionRow | null;
    },
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: SessionInsert) => {
      const { data, error } = await supabase
        .from('sessions')
        .insert(session)
        .select()
        .single();
      if (error) throw error;
      return data as SessionRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SessionUpdate }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('session_id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SessionRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(data.session_id) });
    },
  });
}
