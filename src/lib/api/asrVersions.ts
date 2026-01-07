import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ASRVersionRow, ASRVersionInsert, ASRVersionUpdate } from '@/types/database';
import { assessmentKeys } from './assessments';
import { canActivateASR, formatGateError } from '@/lib/activationGates';
import { toast } from '@/hooks/use-toast';

// Query keys
export const asrVersionKeys = {
  all: ['asrVersions'] as const,
  lists: () => [...asrVersionKeys.all, 'list'] as const,
  list: () => [...asrVersionKeys.lists()] as const,
  byAssessment: (assessmentId: string) => [...asrVersionKeys.lists(), 'assessment', assessmentId] as const,
  details: () => [...asrVersionKeys.all, 'detail'] as const,
  detail: (id: string) => [...asrVersionKeys.details(), id] as const,
};

// Fetch all ASR versions
export function useASRVersions() {
  return useQuery({
    queryKey: asrVersionKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asr_versions')
        .select('*')
        .order('asr_version_id');
      if (error) throw error;
      return data as ASRVersionRow[];
    },
  });
}

// Fetch ASR versions by assessment
export function useASRVersionsByAssessment(assessmentId: string) {
  return useQuery({
    queryKey: asrVersionKeys.byAssessment(assessmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asr_versions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('asr_version_id');
      if (error) throw error;
      return data as ASRVersionRow[];
    },
    enabled: !!assessmentId,
  });
}

// Fetch single ASR version
export function useASRVersion(id: string) {
  return useQuery({
    queryKey: asrVersionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asr_versions')
        .select('*')
        .eq('asr_version_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as ASRVersionRow | null;
    },
    enabled: !!id,
  });
}

// Create ASR version
export function useCreateASRVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asr: ASRVersionInsert) => {
      const { data, error } = await supabase
        .from('asr_versions')
        .insert(asr)
        .select()
        .single();
      if (error) throw error;
      return data as ASRVersionRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: asrVersionKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.assessment_id) });
    },
  });
}

// Update ASR version with activation gate enforcement
export function useUpdateASRVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ASRVersionUpdate }) => {
      // If trying to set validation_status to 'valid', check gate
      if (updates.validation_status === 'valid') {
        // Fetch current ASR to get full state
        const { data: currentASR, error: fetchError } = await supabase
          .from('asr_versions')
          .select('*')
          .eq('asr_version_id', id)
          .single();
        if (fetchError) throw fetchError;

        // Merge current with updates for gate check
        const mergedASR = { ...currentASR, ...updates };
        const gateResult = canActivateASR(mergedASR);

        if (!gateResult.allowed) {
          throw new Error(formatGateError(gateResult));
        }
      }

      const { data, error } = await supabase
        .from('asr_versions')
        .update(updates)
        .eq('asr_version_id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ASRVersionRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: asrVersionKeys.all });
      queryClient.invalidateQueries({ queryKey: asrVersionKeys.detail(data.asr_version_id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.assessment_id) });
      toast({
        title: 'ASR updated',
        description: `${data.asr_version_id} has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cannot update ASR',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
