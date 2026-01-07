import type { 
  AssessmentRow, 
  ASRVersionRow, 
  AssessmentBankRow, 
  FormRow, 
  ItemRow, 
  ScoringOutputRow 
} from '@/types/database';

export type ChainStep = 'ASR' | 'BANK' | 'FORMS' | 'ITEMS' | 'SCORING';

export interface ChainStatus {
  hasASR: boolean;
  hasBank: boolean;
  hasForms: boolean;
  hasItems: boolean;
  hasScoring: boolean;
  completedSteps: number;
  totalSteps: 5;
  percent: number;
  isComplete: boolean;
  missingSteps: ChainStep[];
}

/**
 * Calculate chain completion status for a single assessment.
 * Uses bank-aware logic to check forms and items are properly linked.
 */
export function calculateChainStatus(
  assessment: AssessmentRow,
  asrVersions: ASRVersionRow[],
  assessmentBanks: AssessmentBankRow[],
  forms: FormRow[],
  items: ItemRow[],
  scoringOutputs: ScoringOutputRow[]
): ChainStatus {
  const assessmentId = assessment.assessment_id;

  // 1. hasASR: current_asr_version_id exists AND there's a matching ASR record
  const hasASR = Boolean(
    assessment.current_asr_version_id &&
    asrVersions.some(asr => asr.asr_version_id === assessment.current_asr_version_id)
  );

  // 2. hasBank: at least one assessment_banks row exists for this assessment
  const linkedBanks = assessmentBanks.filter(ab => ab.assessment_id === assessmentId);
  const hasBank = linkedBanks.length > 0;

  // 3. hasForms (bank-aware): at least one form where:
  //    - form.assessment_id matches AND
  //    - form.content_bank_id is in the linked banks
  const linkedBankIds = new Set(linkedBanks.map(ab => ab.content_bank_id));
  const eligibleForms = forms.filter(
    f => f.assessment_id === assessmentId && linkedBankIds.has(f.content_bank_id)
  );
  const hasForms = eligibleForms.length > 0;

  // 4. hasItems (bank-aware): at least one item with form_id in eligible forms
  const eligibleFormIds = new Set(eligibleForms.map(f => f.form_id));
  const hasItems = items.some(item => eligibleFormIds.has(item.form_id));

  // 5. hasScoring: at least one scoring_outputs record for this assessment
  const hasScoring = scoringOutputs.some(s => s.assessment_id === assessmentId);

  // Calculate completion
  const steps = [hasASR, hasBank, hasForms, hasItems, hasScoring];
  const completedSteps = steps.filter(Boolean).length;
  const totalSteps = 5 as const;
  const percent = Math.round((completedSteps / totalSteps) * 100);
  const isComplete = completedSteps === totalSteps;

  // Determine missing steps
  const missingSteps: ChainStep[] = [];
  if (!hasASR) missingSteps.push('ASR');
  if (!hasBank) missingSteps.push('BANK');
  if (!hasForms) missingSteps.push('FORMS');
  if (!hasItems) missingSteps.push('ITEMS');
  if (!hasScoring) missingSteps.push('SCORING');

  return {
    hasASR,
    hasBank,
    hasForms,
    hasItems,
    hasScoring,
    completedSteps,
    totalSteps,
    percent,
    isComplete,
    missingSteps,
  };
}

/**
 * Calculate chain status for all assessments at once.
 * Returns a map of assessment_id to ChainStatus.
 */
export function calculateAllChainStatuses(
  assessments: AssessmentRow[],
  asrVersions: ASRVersionRow[],
  assessmentBanks: AssessmentBankRow[],
  forms: FormRow[],
  items: ItemRow[],
  scoringOutputs: ScoringOutputRow[]
): Map<string, ChainStatus> {
  const result = new Map<string, ChainStatus>();
  
  for (const assessment of assessments) {
    result.set(
      assessment.assessment_id,
      calculateChainStatus(assessment, asrVersions, assessmentBanks, forms, items, scoringOutputs)
    );
  }
  
  return result;
}

/**
 * Get step label for display
 */
export function getStepLabel(step: ChainStep): string {
  switch (step) {
    case 'ASR': return 'ASR Version';
    case 'BANK': return 'Content Bank';
    case 'FORMS': return 'Forms';
    case 'ITEMS': return 'Items';
    case 'SCORING': return 'Scoring Model';
  }
}
