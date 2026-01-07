import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FormRow, FormInsert, FormUpdate } from '@/types/database';
import { assessmentKeys } from './assessments';
import { contentBankKeys } from './contentBanks';

// Query keys
export const formKeys = {
  all: ['forms'] as const,
  lists: () => [...formKeys.all, 'list'] as const,
  list: () => [...formKeys.lists()] as const,
  byAssessment: (assessmentId: string) => [...formKeys.lists(), 'assessment', assessmentId] as const,
  byBank: (bankId: string) => [...formKeys.lists(), 'bank', bankId] as const,
  details: () => [...formKeys.all, 'detail'] as const,
  detail: (id: string) => [...formKeys.details(), id] as const,
};

// Fetch all forms
export function useForms() {
  return useQuery({
    queryKey: formKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('form_id');
      if (error) throw error;
      return data as FormRow[];
    },
  });
}

// Fetch forms by assessment
export function useFormsByAssessment(assessmentId: string) {
  return useQuery({
    queryKey: formKeys.byAssessment(assessmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('form_number');
      if (error) throw error;
      return data as FormRow[];
    },
    enabled: !!assessmentId,
  });
}

// Fetch forms by content bank
export function useFormsByBank(bankId: string) {
  return useQuery({
    queryKey: formKeys.byBank(bankId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('content_bank_id', bankId)
        .order('form_number');
      if (error) throw error;
      return data as FormRow[];
    },
    enabled: !!bankId,
  });
}

// Fetch single form
export function useForm(id: string) {
  return useQuery({
    queryKey: formKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('form_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as FormRow | null;
    },
    enabled: !!id,
  });
}

// Create form
export function useCreateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: FormInsert) => {
      const { data, error } = await supabase
        .from('forms')
        .insert(form)
        .select()
        .single();
      if (error) throw error;
      return data as FormRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: formKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.assessment_id) });
      queryClient.invalidateQueries({ queryKey: contentBankKeys.detail(data.content_bank_id) });
    },
  });
}

// Update form
export function useUpdateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: FormUpdate }) => {
      const { data, error } = await supabase
        .from('forms')
        .update(updates)
        .eq('form_id', id)
        .select()
        .single();
      if (error) throw error;
      return data as FormRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: formKeys.all });
      queryClient.invalidateQueries({ queryKey: formKeys.detail(data.form_id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.assessment_id) });
      queryClient.invalidateQueries({ queryKey: contentBankKeys.detail(data.content_bank_id) });
    },
  });
}
