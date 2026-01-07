import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ScoringOutputRow, ScoringOutputInsert, ScoringOutputUpdate } from '@/types/database';
import { assessmentKeys } from './assessments';

// Query keys
export const scoringOutputKeys = {
  all: ['scoringOutputs'] as const,
  lists: () => [...scoringOutputKeys.all, 'list'] as const,
  list: () => [...scoringOutputKeys.lists()] as const,
  byAssessment: (assessmentId: string) => [...scoringOutputKeys.lists(), 'assessment', assessmentId] as const,
  details: () => [...scoringOutputKeys.all, 'detail'] as const,
  detail: (id: string) => [...scoringOutputKeys.details(), id] as const,
};

// Fetch all scoring outputs
export function useScoringOutputs() {
  return useQuery({
    queryKey: scoringOutputKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scoring_outputs')
        .select('*')
        .order('scoring_model_id');
      if (error) throw error;
      return data as ScoringOutputRow[];
    },
  });
}

// Fetch scoring outputs by assessment
export function useScoringOutputsByAssessment(assessmentId: string) {
  return useQuery({
    queryKey: scoringOutputKeys.byAssessment(assessmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scoring_outputs')
        .select('*')
        .eq('assessment_id', assessmentId);
      if (error) throw error;
      return data as ScoringOutputRow[];
    },
    enabled: !!assessmentId,
  });
}

// Fetch single scoring output
export function useScoringOutput(id: string) {
  return useQuery({
    queryKey: scoringOutputKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scoring_outputs')
        .select('*')
        .eq('scoring_model_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as ScoringOutputRow | null;
    },
    enabled: !!id,
  });
}

// Create scoring output
export function useCreateScoringOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scoring: ScoringOutputInsert) => {
      const { data, error } = await supabase
        .from('scoring_outputs')
        .insert(scoring)
        .select()
        .single();
      if (error) throw error;
      return data as ScoringOutputRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scoringOutputKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.assessment_id) });
    },
  });
}

// Update scoring output
export function useUpdateScoringOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ScoringOutputUpdate }) => {
      const { data, error } = await supabase
        .from('scoring_outputs')
        .update(updates)
        .eq('scoring_model_id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ScoringOutputRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scoringOutputKeys.all });
      queryClient.invalidateQueries({ queryKey: scoringOutputKeys.detail(data.scoring_model_id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.assessment_id) });
    },
  });
}
