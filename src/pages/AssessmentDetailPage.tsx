import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAssessment, useUpdateAssessment } from '@/lib/api/assessments';
import { useASRVersionsByAssessment } from '@/lib/api/asrVersions';
import { useContentBanks } from '@/lib/api/contentBanks';
import { useAssessmentBanks, useUnlinkAssessmentBank } from '@/lib/api/assessmentBanks';
import { useFormsByAssessment } from '@/lib/api/forms';
import { useItems } from '@/lib/api/items';
import { useScoringOutputsByAssessment } from '@/lib/api/scoringOutputs';
import { calculateChainStatus, getStepLabel, type ChainStep } from '@/lib/chainCompletion';
import { isValidRouteId } from '@/lib/routeValidation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { COMPONENT_INFO } from '@/types/registry';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Loader2, Plus, Settings, X, Layers, Upload } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { LinkBankDialog } from '@/components/assessment/LinkBankDialog';
import { LinkASRDialog } from '@/components/assessment/LinkASRDialog';
import { LinkFormDialog } from '@/components/assessment/LinkFormDialog';
import { LinkScoringDialog } from '@/components/assessment/LinkScoringDialog';
import { BulkFormGenerator } from '@/components/assessment/BulkFormGenerator';
import { toast } from 'sonner';
import { CSVImportDialog } from '@/components/import/CSVImportDialog';

const STATUS_OPTIONS = ['stub', 'draft', 'active', 'deprecated'] as const;
type AssessmentStatus = typeof STATUS_OPTIONS[number];

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedStatus, setSelectedStatus] = useState<AssessmentStatus | null>(null);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  
  // Dialog states
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showASRDialog, setShowASRDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showScoringDialog, setShowScoringDialog] = useState(false);
  const [showBulkFormDialog, setShowBulkFormDialog] = useState(false);

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

  const updateAssessment = useUpdateAssessment();
  const unlinkBank = useUnlinkAssessmentBank();

  // Resolve linked banks from join table
  const linkedBankIds = useMemo(() => 
    new Set(assessmentBanks.map(ab => ab.content_bank_id)), 
    [assessmentBanks]
  );

  const linkedBanks = useMemo(() => 
    allBanks.filter(b => linkedBankIds.has(b.content_bank_id)), 
    [allBanks, linkedBankIds]
  );

  // Filter forms to only those in linked banks (bank-aware eligibility)
  const eligibleForms = useMemo(() => 
    forms.filter(f => linkedBankIds.has(f.content_bank_id)), 
    [forms, linkedBankIds]
  );

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

  // canSelectActive computed early for UI disabling (chainStatus may be null during load)
  const canSelectActive = chainStatus?.isComplete ?? false;

  const handleStatusChange = (value: AssessmentStatus) => {
    setSelectedStatus(value);
  };

  const handleSaveStatus = () => {
    if (!assessment || !selectedStatus) return;

    // If activating, show confirmation dialog
    if (selectedStatus === 'active' && assessment.status !== 'active') {
      setShowActivateDialog(true);
      return;
    }

    // Otherwise, update directly
    performUpdate();
  };

  const performUpdate = () => {
    if (!assessment || !selectedStatus) return;
    updateAssessment.mutate(
      { id: assessment.assessment_id, updates: { status: selectedStatus } },
      {
        onSuccess: () => {
          setSelectedStatus(null); // Reset to track from server state
        },
      }
    );
  };

  const handleConfirmActivate = () => {
    setShowActivateDialog(false);
    performUpdate();
  };

  const handleUnlinkBank = async (bankId: string) => {
    try {
      await unlinkBank.mutateAsync({ assessmentId: id, bankId });
      toast.success('Content bank unlinked');
    } catch (error) {
      toast.error('Failed to unlink content bank');
    }
  };

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

  // Compute effective status after we know assessment exists
  const effectiveStatus = selectedStatus ?? (assessment.status as AssessmentStatus) ?? 'stub';
  const hasStatusChanged = selectedStatus !== null && selectedStatus !== assessment.status;

  const componentInfo = COMPONENT_INFO[assessment.component_code as keyof typeof COMPONENT_INFO];

  // Check if this is a grade-leveled assessment for bulk form button
  const isGradeLeveled = assessment.content_model === 'grade_leveled';

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
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Content Model</p>
              <p>{assessment.content_model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Grade Range</p>
              <p>{assessment.grade_range}</p>
            </div>
            
            {/* Status Change UI */}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">Status</p>
              <div className="flex items-center gap-2">
                <Select 
                  value={effectiveStatus} 
                  onValueChange={handleStatusChange}
                  disabled={updateAssessment.isPending}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem 
                        key={status} 
                        value={status}
                        disabled={status === 'active' && !canSelectActive}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleSaveStatus}
                  disabled={!hasStatusChanged || updateAssessment.isPending || (selectedStatus === 'active' && !canSelectActive)}
                >
                  {updateAssessment.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Update Status'
                  )}
                </Button>
              </div>
              {chainStatus && !chainStatus.isComplete && (
                <p className="text-xs text-muted-foreground mt-2">
                  Cannot activate until chain is complete: {chainStatus.missingSteps.map(s => getStepLabel(s)).join(', ')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Linked Records</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* ASR Versions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">ASR Versions ({asrs.length})</p>
                <Button size="sm" variant="outline" onClick={() => setShowASRDialog(true)}>
                  <Settings className="h-3 w-3 mr-1" />
                  Set Current
                </Button>
              </div>
              {asrs.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {asrs.map(a => (
                    <Link key={a.asr_version_id} to={`/asr/${a.asr_version_id}`} className="text-primary hover:underline font-mono text-sm">
                      {a.asr_version_id}
                      {a.asr_version_id === assessment.current_asr_version_id && (
                        <Badge variant="secondary" className="ml-1 text-xs">current</Badge>
                      )}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>

            {/* Linked Content Banks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Linked Content Banks ({linkedBanks.length})</p>
                <Button size="sm" variant="outline" onClick={() => setShowBankDialog(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Link Bank
                </Button>
              </div>
              {linkedBanks.length > 0 ? (
                <div className="space-y-1">
                  {linkedBanks.map(b => (
                    <div key={b.content_bank_id} className="flex items-center justify-between group">
                      <Link to={`/banks/${b.content_bank_id}`} className="text-primary hover:underline font-mono text-sm">
                        {b.content_bank_id}
                      </Link>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => handleUnlinkBank(b.content_bank_id)}
                        disabled={unlinkBank.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>

            {/* Forms */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Forms ({eligibleForms.length})</p>
                <div className="flex gap-1">
                  {isGradeLeveled && linkedBanks.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => setShowBulkFormDialog(true)}>
                      <Layers className="h-3 w-3 mr-1" />
                      Bulk Generate
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setShowFormDialog(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Create Form
                  </Button>
                </div>
              </div>
              {eligibleForms.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {eligibleForms.map(f => (
                    <Link key={f.form_id} to={`/forms/${f.form_id}`} className="text-primary hover:underline font-mono text-sm">
                      {f.form_id}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>

            {/* Scoring Models */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Scoring Models ({scoring.length})</p>
                <Button size="sm" variant="outline" onClick={() => setShowScoringDialog(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Create Scoring
                </Button>
              </div>
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

      {/* Activation Confirmation Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Activation requires a complete dependency chain: ASR Version, Content Bank, Forms, Items, and Scoring Model.
              {!canSelectActive && (
                <span className="block mt-2 text-destructive">
                  Warning: Chain is incomplete. Activation will be blocked by the gate.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmActivate}>
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link/Create Dialogs */}
      <LinkBankDialog 
        open={showBankDialog}
        onOpenChange={setShowBankDialog}
        assessmentId={id}
        linkedBankIds={linkedBankIds}
      />

      <LinkASRDialog
        open={showASRDialog}
        onOpenChange={setShowASRDialog}
        assessmentId={id}
        currentASRVersionId={assessment.current_asr_version_id}
        asrVersions={asrs}
      />

      <LinkFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        assessmentId={id}
        linkedBanks={linkedBanks}
        existingForms={eligibleForms}
      />

      <LinkScoringDialog
        open={showScoringDialog}
        onOpenChange={setShowScoringDialog}
        assessmentId={id}
        existingScoringOutputs={scoring}
      />

      <BulkFormGenerator
        open={showBulkFormDialog}
        onOpenChange={setShowBulkFormDialog}
        assessmentId={id}
        linkedBanks={linkedBanks}
        existingForms={eligibleForms}
      />
    </div>
  );
}
