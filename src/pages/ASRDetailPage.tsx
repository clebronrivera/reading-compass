import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useASRVersion, useUpdateASRVersion } from '@/lib/api/asrVersions';
import { isValidRouteId } from '@/lib/routeValidation';
import { generateAssessmentAssets, ProvisioningResult } from '@/lib/provisioning';
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
import { ArrowLeft, Loader2, Wand2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

const VALIDATION_STATUS_OPTIONS = ['incomplete', 'needs-review', 'valid'] as const;
type ValidationStatus = typeof VALIDATION_STATUS_OPTIONS[number];

export default function ASRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedStatus, setSelectedStatus] = useState<ValidationStatus | null>(null);
  const [showValidateDialog, setShowValidateDialog] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningResult, setProvisioningResult] = useState<ProvisioningResult | null>(null);

  // Validate route param before any queries
  if (!isValidRouteId(id)) {
    return <ErrorState title="Invalid Route" error="Invalid ASR ID in URL" />;
  }

  const { data: asr, isLoading, error, refetch } = useASRVersion(id);
  const updateASR = useUpdateASRVersion();

  // canSelectValid computed early for UI disabling (asr may be null during load)
  const canSelectValid = (asr?.completeness_percent ?? 0) === 100;

  const handleStatusChange = (value: ValidationStatus) => {
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

  const handleGenerateAssets = async () => {
    if (!asr) return;
    setIsProvisioning(true);
    setProvisioningResult(null);
    try {
      const result = await generateAssessmentAssets(asr);
      setProvisioningResult(result);
    } catch (err) {
      setProvisioningResult({
        success: false,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
        warnings: [],
        created: { forms: [] },
        existing: { contentBanks: [], scoringOutputs: [] },
      });
    } finally {
      setIsProvisioning(false);
    }
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

  // Compute effective status after we know asr exists
  const effectiveStatus = selectedStatus ?? (asr.validation_status as ValidationStatus) ?? 'incomplete';
  const hasStatusChanged = selectedStatus !== null && selectedStatus !== asr.validation_status;

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

  // Helper to render section content dynamically
  const renderSectionContent = (section: Record<string, unknown>) => {
    if (!section || Object.keys(section).length === 0) {
      return <p className="text-muted-foreground italic">No data available</p>;
    }

    return (
      <div className="space-y-3">
        {Object.entries(section).map(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          
          if (Array.isArray(value)) {
            if (value.length === 0) return null;
            // Check if array contains objects
            if (typeof value[0] === 'object' && value[0] !== null) {
              return (
                <div key={key} className="space-y-2">
                  <p className="font-medium text-sm">{label}:</p>
                  <div className="pl-4 space-y-2">
                    {value.map((item, idx) => (
                      <div key={idx} className="text-sm bg-muted/50 p-2 rounded border">
                        {typeof item === 'object' ? (
                          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                        ) : (
                          String(item)
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={key}>
                <span className="font-medium text-sm">{label}:</span>
                <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
                  {value.map((item, idx) => (
                    <li key={idx}>{String(item)}</li>
                  ))}
                </ul>
              </div>
            );
          }
          
          if (typeof value === 'object' && value !== null) {
            return (
              <div key={key} className="space-y-1">
                <p className="font-medium text-sm">{label}:</p>
                <pre className="text-xs bg-muted/50 p-2 rounded border whitespace-pre-wrap">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            );
          }
          
          return (
            <p key={key} className="text-sm">
              <span className="font-medium">{label}:</span>{' '}
              <span className="text-muted-foreground">{String(value)}</span>
            </p>
          );
        })}
      </div>
    );
  };

  const sectionTitles: Record<string, string> = {
    a: 'Identity & Metadata',
    b: 'Construct & Purpose',
    c: 'Content Structure',
    d: 'Student Interaction',
    e: 'Assessor Interaction',
    f: 'Scoring Rules',
    g: 'Raw Metrics Schema',
    h: 'Derived Metrics & Thresholds',
    i: 'Content Bank Specification',
    j: 'Engineering Hooks',
  };

  const sections: Record<string, Record<string, unknown>> = {
    a: sectionA,
    b: sectionB,
    c: sectionC,
    d: sectionD,
    e: sectionE,
    f: sectionF,
    g: sectionG,
    h: sectionH,
    i: sectionI,
    j: sectionJ,
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
                disabled={!hasStatusChanged || updateASR.isPending || (selectedStatus === 'valid' && !canSelectValid)}
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

      {/* Generate Assessment Assets Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Generate Assessment Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Automatically create content bank, scoring model, and forms from this ASR specification.
          </p>
          
          <Button 
            onClick={handleGenerateAssets} 
            disabled={isProvisioning || (asr.completeness_percent ?? 0) < 100}
          >
            {isProvisioning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Assets
              </>
            )}
          </Button>

          {(asr.completeness_percent ?? 0) < 100 && (
            <p className="text-xs text-muted-foreground">
              ASR must be 100% complete before generating assets (currently {asr.completeness_percent || 0}%)
            </p>
          )}

          {/* Provisioning Results */}
          {provisioningResult && (
            <div className="space-y-3 pt-4 border-t">
              {/* Status Header */}
              <div className={`flex items-center gap-2 ${provisioningResult.success ? 'text-green-600' : 'text-destructive'}`}>
                {provisioningResult.success ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Provisioning Complete</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Provisioning Failed</span>
                  </>
                )}
              </div>

              {/* Errors */}
              {provisioningResult.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <p className="text-sm font-medium text-destructive mb-1">Errors:</p>
                  <ul className="text-sm text-destructive space-y-1">
                    {provisioningResult.errors.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {provisioningResult.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Warnings:
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                    {provisioningResult.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Created Assets */}
              {(provisioningResult.created.contentBank || provisioningResult.created.scoringOutput || provisioningResult.created.forms.length > 0) && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Created:</p>
                  <ul className="text-sm space-y-1">
                    {provisioningResult.created.contentBank && (
                      <li>
                        • Content Bank: <Link to={`/banks/${provisioningResult.created.contentBank.content_bank_id}`} className="text-primary hover:underline">
                          {provisioningResult.created.contentBank.content_bank_id}
                        </Link>
                      </li>
                    )}
                    {provisioningResult.created.scoringOutput && (
                      <li>
                        • Scoring Model: <Link to={`/scoring/${provisioningResult.created.scoringOutput.scoring_model_id}`} className="text-primary hover:underline">
                          {provisioningResult.created.scoringOutput.scoring_model_id}
                        </Link>
                      </li>
                    )}
                    {provisioningResult.created.forms.length > 0 && (
                      <li>
                        • Forms: {provisioningResult.created.forms.map((f, i) => (
                          <span key={f.form_id}>
                            {i > 0 && ', '}
                            <Link to={`/forms/${f.form_id}`} className="text-primary hover:underline">
                              {f.form_id}
                            </Link>
                          </span>
                        ))}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Existing Assets */}
              {(provisioningResult.existing.contentBanks.length > 0 || provisioningResult.existing.scoringOutputs.length > 0) && (
                <div className="bg-muted/50 border rounded-md p-3">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Already Exists:</p>
                  <ul className="text-sm space-y-1">
                    {provisioningResult.existing.contentBanks.map(b => (
                      <li key={b.content_bank_id}>
                        • Bank: <Link to={`/banks/${b.content_bank_id}`} className="text-primary hover:underline">
                          {b.content_bank_id}
                        </Link>
                      </li>
                    ))}
                    {provisioningResult.existing.scoringOutputs.map(s => (
                      <li key={s.scoring_model_id}>
                        • Scoring: <Link to={`/scoring/${s.scoring_model_id}`} className="text-primary hover:underline">
                          {s.scoring_model_id}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="a">
        <TabsList className="flex-wrap h-auto">
          {['A','B','C','D','E','F','G','H','I','J'].map(s => (
            <TabsTrigger key={s} value={s.toLowerCase()}>Section {s}</TabsTrigger>
          ))}
        </TabsList>
        {Object.entries(sections).map(([key, sectionData]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <CardTitle>Section {key.toUpperCase()}: {sectionTitles[key]}</CardTitle>
              </CardHeader>
              <CardContent>
                {renderSectionContent(sectionData)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
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
