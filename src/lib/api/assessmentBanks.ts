import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AssessmentBankRow, AssessmentBankInsert } from '@/types/database';
import { assessmentKeys } from './assessments';
import { contentBankKeys } from './contentBanks';

// Query keys
export const assessmentBankKeys = {
  all: ['assessmentBanks'] as const,
  byAssessment: (assessmentId: string) => [...assessmentBankKeys.all, 'assessment', assessmentId] as const,
  byBank: (bankId: string) => [...assessmentBankKeys.all, 'bank', bankId] as const,
};

// Fetch assessment banks by assessment
export function useAssessmentBanks(assessmentId: string) {
  return useQuery({
    queryKey: assessmentBankKeys.byAssessment(assessmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_banks')
        .select('*')
        .eq('assessment_id', assessmentId);
      if (error) throw error;
      return data as AssessmentBankRow[];
    },
    enabled: !!assessmentId,
  });
}

// Fetch all assessment_banks (for chain completion)
export function useAllAssessmentBanks() {
  return useQuery({
    queryKey: assessmentBankKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_banks')
        .select('*');
      if (error) throw error;
      return data as AssessmentBankRow[];
    },
  });
}

// Link assessment to bank
export function useLinkAssessmentBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: AssessmentBankInsert) => {
      const { data, error } = await supabase
        .from('assessment_banks')
        .insert(link)
        .select()
        .single();
      if (error) throw error;
      return data as AssessmentBankRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assessmentBankKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.assessment_id) });
      queryClient.invalidateQueries({ queryKey: contentBankKeys.detail(data.content_bank_id) });
    },
  });
}

// Unlink assessment from bank
export function useUnlinkAssessmentBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assessmentId, bankId }: { assessmentId: string; bankId: string }) => {
      const { error } = await supabase
        .from('assessment_banks')
        .delete()
        .eq('assessment_id', assessmentId)
        .eq('content_bank_id', bankId);
      if (error) throw error;
      return { assessmentId, bankId };
    },
    onSuccess: ({ assessmentId, bankId }) => {
      queryClient.invalidateQueries({ queryKey: assessmentBankKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(assessmentId) });
      queryClient.invalidateQueries({ queryKey: contentBankKeys.detail(bankId) });
    },
  });
}
