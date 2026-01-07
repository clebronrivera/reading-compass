import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAssessment } from '@/lib/api/assessments';
import { useASRVersionsByAssessment } from '@/lib/api/asrVersions';
import { useContentBanks } from '@/lib/api/contentBanks';
import { useAssessmentBanks } from '@/lib/api/assessmentBanks';
import { useFormsByAssessment } from '@/lib/api/forms';
import { useItems } from '@/lib/api/items';
import { useScoringOutputsByAssessment } from '@/lib/api/scoringOutputs';
import { calculateChainStatus, getStepLabel, type ChainStep } from '@/lib/chainCompletion';
import { isValidRouteId } from '@/lib/routeValidation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { COMPONENT_INFO } from '@/types/registry';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Validate route param before any queries
  if (!isValidRouteId(id)) {
    return <ErrorState title="Invalid Route" error="Invalid assessment ID in URL" />;
  }

  const { data: assessment, isLoading: assessmentLoading, error, refetch } = useAssessment(id);
  const { data: asrs = [], isLoading: asrsLoading } = useASRVersionsByAssessment(id);
  const { data: assessmentBanks = [], isLoading: assessmentBanksLoading } = useAssessmentBanks(id);
  const { data: allBanks = [], isLoading: banksLoading } = useContentBanks();
  const { data: forms = [], isLoading: formsLoading } = useFormsByAssessment(id);
  const { data: allItems = [], isLoading: itemsLoading } = useItems();
  const { data: scoring = [], isLoading: scoringLoading } = useScoringOutputsByAssessment(id);

  // Resolve linked banks from join table
  const linkedBanks = useMemo(() => {
    const linkedBankIds = new Set(assessmentBanks.map(ab => ab.content_bank_id));
    return allBanks.filter(b => linkedBankIds.has(b.content_bank_id));
  }, [assessmentBanks, allBanks]);

  // Calculate chain status
  const chainStatus = useMemo(() => {
    if (!assessment) return null;
    return calculateChainStatus(
      assessment,
      asrs,
      assessmentBanks,
      forms,
      allItems,
      scoring
    );
  }, [assessment, asrs, assessmentBanks, forms, allItems, scoring]);

  const isLoading = assessmentLoading || asrsLoading || assessmentBanksLoading || 
                    banksLoading || formsLoading || itemsLoading || scoringLoading;

  if (isLoading) {
    return <LoadingState title="Loading assessment..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load assessment" error={error} onRetry={refetch} />;
  }

  if (!assessment) {
    return (
      <div className="space-y-4">
        <Link to="/registry" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Registry
        </Link>
        <p className="text-muted-foreground">Assessment not found.</p>
      </div>
    );
  }

  const componentInfo = COMPONENT_INFO[assessment.component_code as keyof typeof COMPONENT_INFO];

  // Helper to get chain step status
  const getStepStatus = (step: ChainStep): boolean => {
    if (!chainStatus) return false;
    switch (step) {
      case 'ASR': return chainStatus.hasASR;
      case 'BANK': return chainStatus.hasBank;
      case 'FORMS': return chainStatus.hasForms;
      case 'ITEMS': return chainStatus.hasItems;
      case 'SCORING': return chainStatus.hasScoring;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/registry" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Registry
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{componentInfo?.name || assessment.component_code}</Badge>
          <StatusBadge status={assessment.status} />
        </div>
        <h1 className="text-2xl font-bold">{assessment.subcomponent_name}</h1>
        <p className="font-mono text-muted-foreground">{assessment.assessment_id}</p>
      </div>

      {/* Dependency Chain Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dependency Chain</span>
            <span className="text-sm font-normal text-muted-foreground">
              {chainStatus?.completedSteps ?? 0}/5 complete ({chainStatus?.percent ?? 0}%)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 mb-4">
            {(['ASR', 'BANK', 'FORMS', 'ITEMS', 'SCORING'] as ChainStep[]).map((step, i) => {
              const isComplete = getStepStatus(step);
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    {isComplete ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                    <span className="text-xs text-muted-foreground text-center">{getStepLabel(step)}</span>
                  </div>
                  {i < 4 && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </div>
              );
            })}
          </div>
          {chainStatus && !chainStatus.isComplete && (
            <p className="text-sm text-muted-foreground mb-2">
              Missing: {chainStatus.missingSteps.map(s => getStepLabel(s)).join(', ')}
            </p>
          )}
          <Progress value={chainStatus?.percent ?? 0} className="h-2" />
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Content Model</p>
              <p>{assessment.content_model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Grade Range</p>
              <p>{assessment.grade_range}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={assessment.status} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Linked Records</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">ASR Versions ({asrs.length})</p>
              {asrs.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {asrs.map(a => (
                    <Link key={a.asr_version_id} to={`/asr/${a.asr_version_id}`} className="text-primary hover:underline font-mono text-sm">
                      {a.asr_version_id}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Linked Content Banks ({linkedBanks.length})</p>
              {linkedBanks.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {linkedBanks.map(b => (
                    <Link key={b.content_bank_id} to={`/banks/${b.content_bank_id}`} className="text-primary hover:underline font-mono text-sm">
                      {b.content_bank_id}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Forms ({forms.length})</p>
              {forms.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {forms.map(f => (
                    <Link key={f.form_id} to={`/forms/${f.form_id}`} className="text-primary hover:underline font-mono text-sm">
                      {f.form_id}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scoring Models ({scoring.length})</p>
              {scoring.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {scoring.map(s => (
                    <Link key={s.scoring_model_id} to={`/scoring/${s.scoring_model_id}`} className="text-primary hover:underline font-mono text-sm">
                      {s.scoring_model_id}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
