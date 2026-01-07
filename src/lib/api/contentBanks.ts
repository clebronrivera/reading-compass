import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ContentBankRow, ContentBankInsert, ContentBankUpdate } from '@/types/database';
import { assessmentKeys } from './assessments';

// Query keys
export const contentBankKeys = {
  all: ['contentBanks'] as const,
  lists: () => [...contentBankKeys.all, 'list'] as const,
  list: () => [...contentBankKeys.lists()] as const,
  byAssessment: (assessmentId: string) => [...contentBankKeys.lists(), 'assessment', assessmentId] as const,
  details: () => [...contentBankKeys.all, 'detail'] as const,
  detail: (id: string) => [...contentBankKeys.details(), id] as const,
};

// Fetch all content banks
export function useContentBanks() {
  return useQuery({
    queryKey: contentBankKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_banks')
        .select('*')
        .order('content_bank_id');
      if (error) throw error;
      return data as ContentBankRow[];
    },
  });
}

// Fetch content banks by assessment (via linked_assessment_id)
export function useContentBanksByAssessment(assessmentId: string) {
  return useQuery({
    queryKey: contentBankKeys.byAssessment(assessmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_banks')
        .select('*')
        .eq('linked_assessment_id', assessmentId)
        .order('content_bank_id');
      if (error) throw error;
      return data as ContentBankRow[];
    },
    enabled: !!assessmentId,
  });
}

// Fetch single content bank
export function useContentBank(id: string) {
  return useQuery({
    queryKey: contentBankKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_banks')
        .select('*')
        .eq('content_bank_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as ContentBankRow | null;
    },
    enabled: !!id,
  });
}

// Create content bank
export function useCreateContentBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bank: ContentBankInsert) => {
      const { data, error } = await supabase
        .from('content_banks')
        .insert(bank)
        .select()
        .single();
      if (error) throw error;
      return data as ContentBankRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contentBankKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.linked_assessment_id) });
    },
  });
}

// Update content bank
export function useUpdateContentBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ContentBankUpdate }) => {
      const { data, error } = await supabase
        .from('content_banks')
        .update(updates)
        .eq('content_bank_id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ContentBankRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contentBankKeys.all });
      queryClient.invalidateQueries({ queryKey: contentBankKeys.detail(data.content_bank_id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.linked_assessment_id) });
    },
  });
}
