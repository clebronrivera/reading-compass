import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ItemRow, ItemInsert, ItemUpdate } from '@/types/database';
import { formKeys } from './forms';

// Query keys
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: () => [...itemKeys.lists()] as const,
  byForm: (formId: string) => [...itemKeys.lists(), 'form', formId] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

// Fetch all items
export function useItems() {
  return useQuery({
    queryKey: itemKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('form_id')
        .order('sequence_number');
      if (error) throw error;
      return data as ItemRow[];
    },
  });
}

// Fetch items by form
export function useItemsByForm(formId: string) {
  return useQuery({
    queryKey: itemKeys.byForm(formId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('form_id', formId)
        .order('sequence_number');
      if (error) throw error;
      return data as ItemRow[];
    },
    enabled: !!formId,
  });
}

// Fetch single item
export function useItem(id: string) {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('item_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as ItemRow | null;
    },
    enabled: !!id,
  });
}

// Create item
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: ItemInsert) => {
      const { data, error } = await supabase
        .from('items')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data as ItemRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: formKeys.detail(data.form_id) });
    },
  });
}

// Update item
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ItemUpdate }) => {
      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('item_id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ItemRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(data.item_id) });
      queryClient.invalidateQueries({ queryKey: formKeys.detail(data.form_id) });
    },
  });
}

// Bulk create items
export function useBulkCreateItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: ItemInsert[]) => {
      const { data, error } = await supabase
        .from('items')
        .insert(items)
        .select();
      if (error) throw error;
      return data as ItemRow[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}
