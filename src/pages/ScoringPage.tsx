import { Link } from 'react-router-dom';
import { useScoringOutputs } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import type { MetricDefinition, ScoringFlag, ThresholdDefinition } from '@/types/database';

export default function ScoringPage() {
  const { data: scoring, isLoading, error, refetch } = useScoringOutputs();

  if (isLoading) {
    return <LoadingState title="Loading scoring outputs..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load scoring outputs" error={error} onRetry={refetch} />;
  }

  if (!scoring || scoring.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Scoring Outputs</h1>
        <EmptyState 
          title="No scoring outputs found" 
          description="No scoring models have been created yet."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scoring Outputs</h1>
      <div className="grid gap-4">
        {scoring.map((s) => {
          const rawMetrics = (s.raw_metrics_schema || []) as unknown as MetricDefinition[];
          const derivedMetrics = (s.derived_metrics_schema || []) as unknown as MetricDefinition[];
          const flags = (s.flags || []) as unknown as ScoringFlag[];
          const thresholds = (s.thresholds || []) as unknown as ThresholdDefinition[];
          
          return (
            <Card key={s.scoring_model_id}>
              <CardHeader>
                <CardTitle>
                  <Link to={`/scoring/${s.scoring_model_id}`} className="font-mono text-lg text-primary hover:underline">
                    {s.scoring_model_id}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Assessment: <Link to={`/assessment/${s.assessment_id}`} className="text-primary hover:underline">{s.assessment_id}</Link>
                </p>
                <p className="text-sm">Raw Metrics: {rawMetrics.length} | Derived: {derivedMetrics.length}</p>
                <p className="text-sm">Flags: {flags.length} | Thresholds: {thresholds.length}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
