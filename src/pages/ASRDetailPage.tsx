import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useASRVersion, useUpdateASRVersion } from '@/lib/api/asrVersions';
import { isValidRouteId } from '@/lib/routeValidation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ArrowLeft, Loader2 } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

const VALIDATION_STATUS_OPTIONS = ['incomplete', 'needs-review', 'valid'] as const;

export default function ASRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showValidateDialog, setShowValidateDialog] = useState(false);

  // Validate route param before any queries
  if (!isValidRouteId(id)) {
    return <ErrorState title="Invalid Route" error="Invalid ASR ID in URL" />;
  }

  const { data: asr, isLoading, error, refetch } = useASRVersion(id);
  const updateASR = useUpdateASRVersion();

  // Get the effective status for display and selection
  const effectiveStatus = selectedStatus ?? asr?.validation_status ?? 'incomplete';
  const hasStatusChanged = selectedStatus !== null && selectedStatus !== asr?.validation_status;

  // Check if "valid" can be selected (100% complete)
  const canSelectValid = (asr?.completeness_percent ?? 0) === 100;

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
  };

  const handleSaveStatus = () => {
    if (!asr || !selectedStatus) return;

    // If validating, show confirmation dialog
    if (selectedStatus === 'valid' && asr.validation_status !== 'valid') {
      setShowValidateDialog(true);
      return;
    }

    // Otherwise, update directly
    performUpdate();
  };

  const performUpdate = () => {
    if (!asr || !selectedStatus) return;
    updateASR.mutate(
      { id: asr.asr_version_id, updates: { validation_status: selectedStatus } },
      {
        onSuccess: () => {
          setSelectedStatus(null); // Reset to track from server state
        },
      }
    );
  };

  const handleConfirmValidate = () => {
    setShowValidateDialog(false);
    performUpdate();
  };

  if (isLoading) {
    return <LoadingState title="Loading ASR..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load ASR" error={error} onRetry={refetch} />;
  }

  if (!asr) {
    return (
      <div className="space-y-4">
        <Link to="/asr" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to ASR Library
        </Link>
        <p className="text-muted-foreground">ASR not found.</p>
      </div>
    );
  }

  // Parse section data safely
  const sectionA = (asr.section_a as Record<string, unknown>) || {};
  const sectionB = (asr.section_b as Record<string, unknown>) || {};
  const sectionC = (asr.section_c as Record<string, unknown>) || {};
  const sectionD = (asr.section_d as Record<string, unknown>) || {};
  const sectionE = (asr.section_e as Record<string, unknown>) || {};
  const sectionF = (asr.section_f as Record<string, unknown>) || {};
  const sectionG = (asr.section_g as Record<string, unknown>) || {};
  const sectionH = (asr.section_h as Record<string, unknown>) || {};
  const sectionI = (asr.section_i as Record<string, unknown>) || {};
  const sectionJ = (asr.section_j as Record<string, unknown>) || {};

  const getArrayField = (obj: Record<string, unknown>, key: string): string[] => {
    const val = obj[key];
    return Array.isArray(val) ? val : [];
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/asr" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to ASR Library
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">ASR</Badge>
          <StatusBadge status={String(sectionA.status || 'draft')} />
        </div>
        <h1 className="text-2xl font-bold">{String(sectionA.assessment_name || asr.asr_version_id)}</h1>
        <p className="font-mono text-muted-foreground">{asr.asr_version_id}</p>
        <Link to={`/assessment/${asr.assessment_id}`} className="text-sm text-primary hover:underline">
          View Assessment →
        </Link>
      </div>

      {/* Completeness and Validation Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>ASR Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Completeness</p>
              <p className="text-lg font-semibold">{asr.completeness_percent || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Validation</p>
              <StatusBadge status={asr.validation_status || 'incomplete'} />
            </div>
          </div>

          {/* Validation Status Change UI */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Update Validation Status</p>
            <div className="flex items-center gap-2">
              <Select 
                value={effectiveStatus} 
                onValueChange={handleStatusChange}
                disabled={updateASR.isPending}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALIDATION_STATUS_OPTIONS.map((status) => (
                    <SelectItem 
                      key={status} 
                      value={status}
                      disabled={status === 'valid' && !canSelectValid}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleSaveStatus}
                disabled={!hasStatusChanged || updateASR.isPending}
              >
                {updateASR.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            </div>
            {!canSelectValid && (
              <p className="text-xs text-muted-foreground mt-2">
                Cannot validate until ASR is 100% complete (currently {asr.completeness_percent || 0}%)
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="a">
        <TabsList className="flex-wrap h-auto">
          {['A','B','C','D','E','F','G','H','I','J'].map(s => <TabsTrigger key={s} value={s.toLowerCase()}>Section {s}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="a">
          <Card>
            <CardHeader><CardTitle>Section A: Identification</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>ASR ID:</strong> {String(sectionA.asr_id || 'N/A')}</p>
              <p><strong>Version:</strong> {String(sectionA.version || 'N/A')}</p>
              <p><strong>Owner:</strong> {String(sectionA.owner || 'N/A')}</p>
              <p><strong>Last Updated:</strong> {String(sectionA.last_updated || 'N/A')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="b">
          <Card>
            <CardHeader><CardTitle>Section B: Classification</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Component:</strong> {String(sectionB.component || 'N/A')}</p>
              <p><strong>Subcomponent:</strong> {String(sectionB.subcomponent || 'N/A')}</p>
              <p><strong>Skill Focus:</strong> {String(sectionB.skill_focus || 'N/A')}</p>
              <p><strong>Grade Range:</strong> {String(sectionB.grade_range || 'N/A')}</p>
              <p><strong>Administration:</strong> {String(sectionB.administration_format || 'N/A')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="c">
          <Card>
            <CardHeader><CardTitle>Section C: Purpose</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Purpose:</strong> {String(sectionC.purpose || 'N/A')}</p>
              <p><strong>What it Measures:</strong> {String(sectionC.what_it_measures || 'N/A')}</p>
              <p><strong>Intended Use:</strong> {String(sectionC.intended_use || 'N/A')}</p>
              <p><strong>Not Designed For:</strong> {String(sectionC.not_designed_for || 'N/A')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="d">
          <Card>
            <CardHeader><CardTitle>Section D: Content</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Content Model:</strong> {String(sectionD.content_model || 'N/A')}</p>
              <p><strong>Item Types:</strong> {getArrayField(sectionD, 'item_types').join(', ') || 'N/A'}</p>
              <p><strong>Stimulus:</strong> {String(sectionD.stimulus_description || 'N/A')}</p>
              <p><strong>Response Format:</strong> {String(sectionD.response_format || 'N/A')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="e">
          <Card>
            <CardHeader><CardTitle>Section E: Structure</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Total Items:</strong> {String(sectionE.total_items || 'N/A')}</p>
              <p><strong>Timing:</strong> {String(sectionE.timing || 'N/A')}</p>
              <p><strong>Stopping Rule:</strong> {String(sectionE.stopping_rule || 'N/A')}</p>
              <p><strong>Materials:</strong> {getArrayField(sectionE, 'materials_required').join(', ') || 'N/A'}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="f">
          <Card>
            <CardHeader><CardTitle>Section F: Administration</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Script:</strong> {String(sectionF.administration_script || 'N/A')}</p>
              <p><strong>Practice Items:</strong> {String(sectionF.practice_items || 'N/A')}</p>
              <p><strong>Prompts:</strong> {getArrayField(sectionF, 'prompts').join(' | ') || 'N/A'}</p>
              <p><strong>Supports:</strong> {getArrayField(sectionF, 'allowable_supports').join(', ') || 'N/A'}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="g">
          <Card>
            <CardHeader><CardTitle>Section G: Scoring</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Method:</strong> {String(sectionG.scoring_method || 'N/A')}</p>
              <p><strong>Score Types:</strong> {getArrayField(sectionG, 'score_types').join(', ') || 'N/A'}</p>
              <p><strong>Error Coding:</strong> {String(sectionG.error_coding || 'N/A')}</p>
              <p><strong>Rubric:</strong> {String(sectionG.scoring_rubric || 'N/A')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="h">
          <Card>
            <CardHeader><CardTitle>Section H: Metrics</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Raw Metrics:</strong> {getArrayField(sectionH, 'raw_metrics').join(', ') || 'N/A'}</p>
              <p><strong>Derived:</strong> {getArrayField(sectionH, 'derived_metrics').join(', ') || 'N/A'}</p>
              <p><strong>Benchmarks:</strong> {String(sectionH.benchmark_status || 'N/A')}</p>
              <p><strong>Norm Ref:</strong> {String(sectionH.norm_reference || 'N/A')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="i">
          <Card>
            <CardHeader><CardTitle>Section I: Forms</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Available:</strong> {getArrayField(sectionI, 'forms_available').join(', ') || 'N/A'}</p>
              <p><strong>Equivalence:</strong> {String(sectionI.equivalence_sets || 'N/A')}</p>
              <p><strong>Differentiation:</strong> {getArrayField(sectionI, 'differentiation_keys').join(', ') || 'N/A'}</p>
              <p><strong>Notes:</strong> {String(sectionI.version_notes || 'N/A')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="j">
          <Card>
            <CardHeader><CardTitle>Section J: Integration</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Export Format:</strong> {String(sectionJ.data_export_format || 'N/A')}</p>
              <p><strong>Integration:</strong> {String(sectionJ.integration_notes || 'N/A')}</p>
              <p><strong>Dashboard:</strong> {String(sectionJ.reporting_dashboard || 'N/A')}</p>
              <p><strong>Flags:</strong> {String(sectionJ.flags_and_alerts || 'N/A')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Validation Confirmation Dialog */}
      <AlertDialog open={showValidateDialog} onOpenChange={setShowValidateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validate ASR?</AlertDialogTitle>
            <AlertDialogDescription>
              Validation requires 100% completeness across all sections.
              {!canSelectValid && (
                <span className="block mt-2 text-destructive">
                  Warning: ASR is only {asr.completeness_percent || 0}% complete. Validation will be blocked.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmValidate}>
              Validate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
