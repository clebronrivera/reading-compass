import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { assessmentRegistry, getComponentCounts } from '@/data/assessmentRegistry';
import { getAllASRs } from '@/data/asrLibrary';
import { getAllContentBanks } from '@/data/contentBanks';
import { getAllForms } from '@/data/forms';
import { getAllItems } from '@/data/items';
import { getAllScoringOutputs } from '@/data/scoringOutputs';
import { COMPONENT_INFO } from '@/types/registry';
import { getComponentBgClass, getComponentTextClass, type ComponentCode } from '@/lib/componentColors';
import { cn } from '@/lib/utils';
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
  const componentCounts = getComponentCounts();
  const asrs = getAllASRs();
  const banks = getAllContentBanks();
  const forms = getAllForms();
  const items = getAllItems();
  const scoringOutputs = getAllScoringOutputs();

  const activeAssessments = assessmentRegistry.filter(a => a.status === 'active').length;
  const stubAssessments = assessmentRegistry.filter(a => a.status === 'stub').length;

  // Calculate chain completion
  const chainComplete = assessmentRegistry.filter(a => 
    a.current_asr_version_id && 
    a.content_bank_ids.length > 0
  ).length;
  const chainCompletionPercent = Math.round((chainComplete / assessmentRegistry.length) * 100);

  const libraryStats = [
    { name: 'Registry', count: assessmentRegistry.length, icon: Database, url: '/registry' },
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
                <p className="text-3xl font-bold">{assessmentRegistry.length}</p>
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
                <p className="text-sm text-muted-foreground">Chain Completion</p>
                <span className="text-sm font-medium">{chainCompletionPercent}%</span>
              </div>
              <Progress value={chainCompletionPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {chainComplete} of {assessmentRegistry.length} have complete Registry → ASR → Bank chain
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
                    <p className="text-sm text-muted-foreground">{assessmentRegistry.length - chainComplete} assessments need completion</p>
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
          <CardTitle className="text-lg">Dependency Chain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 flex-wrap py-4">
            {['Registry', 'ASR', 'Bank', 'Form', 'Items', 'Scoring'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium">
                  {step}
                </div>
                {i < 5 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
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
