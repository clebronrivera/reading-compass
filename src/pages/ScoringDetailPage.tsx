import { useParams, Link } from 'react-router-dom';
import { useScoringOutput } from '@/lib/api/scoringOutputs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ArrowLeft } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

interface Metric {
  metric_id: string;
  name: string;
  type: string;
  description: string;
}

interface Formula {
  formula_id: string;
  name: string;
  expression: string;
  inputs: string[];
  output: string;
}

interface Flag {
  flag_id: string;
  name: string;
  condition: string;
  severity: string;
}

interface Threshold {
  threshold_id: string;
  metric_id: string;
  grade_level: string;
  benchmark_value?: number;
  status: string;
}

export default function ScoringDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: scoring, isLoading, error, refetch } = useScoringOutput(id || '');

  if (isLoading) {
    return <LoadingState title="Loading scoring output..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load scoring output" error={error} onRetry={refetch} />;
  }

  if (!scoring) {
    return (
      <div className="space-y-4">
        <Link to="/scoring" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Scoring Outputs
        </Link>
        <p className="text-muted-foreground">Scoring output not found.</p>
      </div>
    );
  }

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-primary';
      case 'warning': return 'bg-status-draft';
      case 'critical': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const rawMetrics = (Array.isArray(scoring.raw_metrics_schema) ? scoring.raw_metrics_schema : []) as unknown as Metric[];
  const derivedMetrics = (Array.isArray(scoring.derived_metrics_schema) ? scoring.derived_metrics_schema : []) as unknown as Metric[];
  const formulas = (Array.isArray(scoring.formulas) ? scoring.formulas : []) as unknown as Formula[];
  const flags = (Array.isArray(scoring.flags) ? scoring.flags : []) as unknown as Flag[];
  const thresholds = (Array.isArray(scoring.thresholds) ? scoring.thresholds : []) as unknown as Threshold[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/scoring" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Scoring Outputs
        </Link>
        <h1 className="text-2xl font-bold font-mono">{scoring.scoring_model_id}</h1>
        <p className="text-muted-foreground">
          Assessment: <Link to={`/assessment/${scoring.assessment_id}`} className="text-primary hover:underline font-mono">{scoring.assessment_id}</Link>
        </p>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Scoring Model ID</p>
            <p className="font-mono">{scoring.scoring_model_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Assessment</p>
            <Link to={`/assessment/${scoring.assessment_id}`} className="text-primary hover:underline font-mono">
              {scoring.assessment_id}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Raw Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Metrics ({rawMetrics.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rawMetrics.length === 0 ? (
            <p className="text-muted-foreground">No raw metrics defined.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawMetrics.map((metric) => (
                  <TableRow key={metric.metric_id}>
                    <TableCell className="font-mono text-xs">{metric.metric_id}</TableCell>
                    <TableCell>{metric.name}</TableCell>
                    <TableCell><Badge variant="outline">{metric.type}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{metric.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Derived Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Derived Metrics ({derivedMetrics.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {derivedMetrics.length === 0 ? (
            <p className="text-muted-foreground">No derived metrics defined.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {derivedMetrics.map((metric) => (
                  <TableRow key={metric.metric_id}>
                    <TableCell className="font-mono text-xs">{metric.metric_id}</TableCell>
                    <TableCell>{metric.name}</TableCell>
                    <TableCell><Badge variant="outline">{metric.type}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{metric.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Formulas */}
      <Card>
        <CardHeader>
          <CardTitle>Formulas ({formulas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {formulas.length === 0 ? (
            <p className="text-muted-foreground">No formulas defined.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formula ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Expression</TableHead>
                  <TableHead>Inputs</TableHead>
                  <TableHead>Output</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formulas.map((formula) => (
                  <TableRow key={formula.formula_id}>
                    <TableCell className="font-mono text-xs">{formula.formula_id}</TableCell>
                    <TableCell>{formula.name}</TableCell>
                    <TableCell className="font-mono text-xs">{formula.expression}</TableCell>
                    <TableCell className="text-xs">{formula.inputs.join(', ')}</TableCell>
                    <TableCell className="font-mono text-xs">{formula.output}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Flags ({flags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <p className="text-muted-foreground">No flags defined.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => (
                  <TableRow key={flag.flag_id}>
                    <TableCell className="font-mono text-xs">{flag.flag_id}</TableCell>
                    <TableCell>{flag.name}</TableCell>
                    <TableCell className="font-mono text-xs">{flag.condition}</TableCell>
                    <TableCell>
                      <Badge className={getSeverityClass(flag.severity)}>{flag.severity}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Thresholds ({thresholds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {thresholds.length === 0 ? (
            <p className="text-muted-foreground">No thresholds defined.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Threshold ID</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Benchmark</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thresholds.map((threshold) => (
                  <TableRow key={threshold.threshold_id}>
                    <TableCell className="font-mono text-xs">{threshold.threshold_id}</TableCell>
                    <TableCell className="font-mono text-xs">{threshold.metric_id}</TableCell>
                    <TableCell>{threshold.grade_level}</TableCell>
                    <TableCell>{threshold.benchmark_value ?? 'TBD'}</TableCell>
                    <TableCell><StatusBadge status={threshold.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
