import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Type for import_history (not in generated types yet)
export interface ImportHistoryRow {
  import_id: string;
  assessment_id: string | null;
  import_type: 'items' | 'forms' | 'banks' | 'asr' | 'scoring';
  rows_processed: number;
  rows_created: number;
  rows_updated: number;
  rows_failed: number;
  change_note: string | null;
  file_name: string | null;
  imported_at: string;
  imported_by: string;
}

export interface ImportHistoryInsert {
  assessment_id?: string | null;
  import_type: 'items' | 'forms' | 'banks' | 'asr' | 'scoring';
  rows_processed: number;
  rows_created: number;
  rows_updated: number;
  rows_failed: number;
  change_note?: string | null;
  file_name?: string | null;
  imported_by?: string;
}

// Query keys
export const importHistoryKeys = {
  all: ['importHistory'] as const,
  byAssessment: (assessmentId: string) => [...importHistoryKeys.all, 'assessment', assessmentId] as const,
};

/**
 * Fetch import history, optionally filtered by assessment
 */
export function useImportHistory(assessmentId?: string) {
  return useQuery({
    queryKey: assessmentId ? importHistoryKeys.byAssessment(assessmentId) : importHistoryKeys.all,
    queryFn: async () => {
      let query = supabase
        .from('import_history')
        .select('*')
        .order('imported_at', { ascending: false })
        .limit(50);
      
      if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ImportHistoryRow[];
    },
  });
}

/**
 * Record a new import
 */
export function useRecordImport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: ImportHistoryInsert) => {
      const { data, error } = await supabase
        .from('import_history')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as ImportHistoryRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: importHistoryKeys.all });
      if (data.assessment_id) {
        queryClient.invalidateQueries({ queryKey: importHistoryKeys.byAssessment(data.assessment_id) });
      }
    },
  });
}
