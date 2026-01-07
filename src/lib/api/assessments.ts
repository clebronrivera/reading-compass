import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AssessmentRow, AssessmentInsert, AssessmentUpdate, ComponentCode } from '@/types/database';
import { canActivateAssessment, formatGateError } from '@/lib/activationGates';

// Query keys
export const assessmentKeys = {
  all: ['assessments'] as const,
  lists: () => [...assessmentKeys.all, 'list'] as const,
  list: (filters?: { component?: ComponentCode }) => [...assessmentKeys.lists(), filters] as const,
  details: () => [...assessmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...assessmentKeys.details(), id] as const,
};

// Fetch all assessments
export function useAssessments(componentCode?: ComponentCode) {
  return useQuery({
    queryKey: assessmentKeys.list(componentCode ? { component: componentCode } : undefined),
    queryFn: async () => {
      let query = supabase
        .from('assessments')
        .select('*')
        .order('component_code')
        .order('assessment_id');

      if (componentCode) {
        query = query.eq('component_code', componentCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AssessmentRow[];
    },
  });
}

// Fetch single assessment
export function useAssessment(id: string) {
  return useQuery({
    queryKey: assessmentKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('assessment_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as AssessmentRow | null;
    },
    enabled: !!id,
  });
}

// Create assessment
export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessment: AssessmentInsert) => {
      const { data, error } = await supabase
        .from('assessments')
        .insert(assessment)
        .select()
        .single();
      if (error) throw error;
      return data as AssessmentRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
}

// Update assessment with activation gate enforcement
export function useUpdateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AssessmentUpdate }) => {
      // If trying to set status to 'active', enforce activation gate
      if (updates.status === 'active') {
        // Fetch current assessment
        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .select('*')
          .eq('assessment_id', id)
          .single();
        if (assessmentError) throw assessmentError;

        // Fetch required data for gate check
        const [asrResult, banksResult, scoringResult] = await Promise.all([
          supabase.from('asr_versions').select('*'),
          supabase.from('assessment_banks').select('*').eq('assessment_id', id),
          supabase.from('scoring_outputs').select('*').eq('assessment_id', id),
        ]);

        if (asrResult.error) throw asrResult.error;
        if (banksResult.error) throw banksResult.error;
        if (scoringResult.error) throw scoringResult.error;

        // Check activation gate
        const gateResult = canActivateAssessment(
          assessment,
          asrResult.data,
          banksResult.data,
          scoringResult.data
        );

        if (!gateResult.allowed) {
          throw new Error(formatGateError(gateResult));
        }
      }

      const { data, error } = await supabase
        .from('assessments')
        .update(updates)
        .eq('assessment_id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AssessmentRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.assessment_id) });
    },
  });
}

// Get component counts
export function useComponentCounts() {
  return useQuery({
    queryKey: ['componentCounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('component_code');
      if (error) throw error;

      const counts: Record<ComponentCode, number> = { PA: 0, PH: 0, FL: 0, VO: 0, RC: 0 };
      data.forEach((row) => {
        const code = row.component_code as ComponentCode;
        if (counts[code] !== undefined) {
          counts[code]++;
        }
      });
      return counts;
    },
  });
}
