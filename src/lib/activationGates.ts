import type { 
  AssessmentRow, 
  ASRVersionRow, 
  AssessmentBankRow, 
  ScoringOutputRow 
} from '@/types/database';

export interface GateResult {
  allowed: boolean;
  reasons: string[];
}

/**
 * Check if an ASR version can be marked as valid/ready.
 * Rules:
 * - validation_status must be 'valid'
 * - completeness_percent must be 100
 */
export function canActivateASR(asr: ASRVersionRow): GateResult {
  const reasons: string[] = [];

  if (asr.validation_status !== 'valid') {
    reasons.push(`ASR validation_status must be 'valid' (currently: '${asr.validation_status || 'incomplete'}')`);
  }

  if ((asr.completeness_percent ?? 0) < 100) {
    reasons.push(`ASR completeness_percent must be 100 (currently: ${asr.completeness_percent ?? 0}%)`);
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

/**
 * Check if an assessment can be set to 'active' status.
 * Rules:
 * - current_asr_version_id exists and the referenced ASR passes canActivateASR
 * - assessment has at least one linked bank via assessment_banks
 * - scoring output exists for assessment_id
 */
export function canActivateAssessment(
  assessment: AssessmentRow,
  asrVersions: ASRVersionRow[],
  assessmentBanks: AssessmentBankRow[],
  scoringOutputs: ScoringOutputRow[]
): GateResult {
  const reasons: string[] = [];
  const assessmentId = assessment.assessment_id;

  // Check ASR requirement
  if (!assessment.current_asr_version_id) {
    reasons.push('Assessment must have a current_asr_version_id set');
  } else {
    const linkedASR = asrVersions.find(
      asr => asr.asr_version_id === assessment.current_asr_version_id
    );
    
    if (!linkedASR) {
      reasons.push(`Linked ASR version '${assessment.current_asr_version_id}' not found`);
    } else {
      const asrGate = canActivateASR(linkedASR);
      if (!asrGate.allowed) {
        reasons.push(`Linked ASR is not valid: ${asrGate.reasons.join('; ')}`);
      }
    }
  }

  // Check bank requirement
  const linkedBanks = assessmentBanks.filter(ab => ab.assessment_id === assessmentId);
  if (linkedBanks.length === 0) {
    reasons.push('Assessment must have at least one linked content bank');
  }

  // Check scoring output requirement
  const hasScoring = scoringOutputs.some(s => s.assessment_id === assessmentId);
  if (!hasScoring) {
    reasons.push('Assessment must have a scoring output defined');
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

/**
 * Format gate result as a user-friendly error message
 */
export function formatGateError(result: GateResult): string {
  if (result.allowed) return '';
  return `Cannot activate:\n• ${result.reasons.join('\n• ')}`;
}
