import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  useAssessments, 
  useASRVersions, 
  useContentBanks, 
  useForms, 
  useItems, 
  useScoringOutputs,
  useAllAssessmentBanks 
} from '@/lib/api';
import { COMPONENT_INFO, type ComponentCode } from '@/types/database';
import { getComponentBgClass, getComponentTextClass } from '@/lib/componentColors';
import { calculateAllChainStatuses, getStepLabel } from '@/lib/chainCompletion';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  Database,
  FileText,
  FolderOpen,
  FileBox,
  LayoutList,
  Calculator,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function Dashboard() {
  const { data: assessments = [], isLoading: loadingAssessments, error: assessmentsError, refetch: refetchAssessments } = useAssessments();
  const { data: asrs = [], isLoading: loadingASRs } = useASRVersions();
  const { data: banks = [], isLoading: loadingBanks } = useContentBanks();
  const { data: forms = [], isLoading: loadingForms } = useForms();
  const { data: items = [], isLoading: loadingItems } = useItems();
  const { data: scoringOutputs = [], isLoading: loadingScoring } = useScoringOutputs();
  const { data: assessmentBanks = [], isLoading: loadingAssessmentBanks } = useAllAssessmentBanks();

  const isLoading = loadingAssessments || loadingASRs || loadingBanks || loadingForms || loadingItems || loadingScoring || loadingAssessmentBanks;

  if (isLoading) {
    return <LoadingState title="Loading dashboard..." />;
  }

  if (assessmentsError) {
    return <ErrorState title="Failed to load dashboard" error={assessmentsError} onRetry={refetchAssessments} />;
  }

  // Calculate component counts
  const componentCounts: Record<ComponentCode, number> = { PA: 0, PH: 0, FL: 0, VO: 0, RC: 0 };
  assessments.forEach((a) => {
    const code = a.component_code as ComponentCode;
    if (componentCounts[code] !== undefined) {
      componentCounts[code]++;
    }
  });

  const activeAssessments = assessments.filter(a => a.status === 'active').length;
  const stubAssessments = assessments.filter(a => a.status === 'stub').length;

  // Calculate chain completion for all assessments
  const chainStatuses = calculateAllChainStatuses(assessments, asrs, assessmentBanks, forms, items, scoringOutputs);
  const completeChains = Array.from(chainStatuses.values()).filter(s => s.isComplete).length;
  const chainCompletionPercent = assessments.length > 0 
    ? Math.round((completeChains / assessments.length) * 100) 
    : 0;

  const libraryStats = [
    { name: 'Registry', count: assessments.length, icon: Database, url: '/registry' },
    { name: 'ASRs', count: asrs.length, icon: FileText, url: '/asr' },
    { name: 'Banks', count: banks.length, icon: FolderOpen, url: '/banks' },
    { name: 'Forms', count: forms.length, icon: FileBox, url: '/forms' },
    { name: 'Items', count: items.length, icon: LayoutList, url: '/items' },
    { name: 'Scoring', count: scoringOutputs.length, icon: Calculator, url: '/scoring' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reading Assessment Registry</h1>
        <p className="text-muted-foreground mt-1">System of record for all assessment specifications and content</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assessments</p>
                <p className="text-3xl font-bold">{assessments.length}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-status-active/20 text-status-active">
                  {activeAssessments} Active
                </Badge>
                <Badge variant="secondary" className="bg-status-stub/20 text-status-stub">
                  {stubAssessments} Stub
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Chain Completion (5 steps)</p>
                <span className="text-sm font-medium">{chainCompletionPercent}%</span>
              </div>
              <Progress value={chainCompletionPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {completeChains} of {assessments.length} have complete ASR → Bank → Form → Items → Scoring chain
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {chainCompletionPercent === 100 ? (
                <>
                  <CheckCircle2 className="h-10 w-10 text-status-active" />
                  <div>
                    <p className="font-medium">All Chains Complete</p>
                    <p className="text-sm text-muted-foreground">Ready for production use</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-10 w-10 text-status-draft" />
                  <div>
                    <p className="font-medium">Work in Progress</p>
                    <p className="text-sm text-muted-foreground">{assessments.length - completeChains} assessments need completion</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Component Areas */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Component Areas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(Object.keys(COMPONENT_INFO) as ComponentCode[]).map((code) => (
            <Link key={code} to={`/component/${code}`}>
              <Card className={cn(
                'transition-all cursor-pointer border-2',
                getComponentBgClass(code)
              )}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn('text-2xl font-bold', getComponentTextClass(code))}>{code}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{COMPONENT_INFO[code].name}</p>
                  <p className="text-2xl font-bold mt-2">{componentCounts[code]}</p>
                  <p className="text-xs text-muted-foreground">assessments</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Library Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Libraries</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {libraryStats.map((lib) => (
            <Link key={lib.name} to={lib.url}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <lib.icon className="h-5 w-5 text-muted-foreground" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-bold">{lib.count}</p>
                  <p className="text-sm text-muted-foreground">{lib.name}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Dependency Chain Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dependency Chain (5 Steps)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 flex-wrap py-4">
            {(['ASR', 'BANK', 'FORMS', 'ITEMS', 'SCORING'] as const).map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium">
                  {getStepLabel(step)}
                </div>
                {i < 4 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Every assessment must satisfy this chain to be production-ready
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
