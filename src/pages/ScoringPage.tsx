import { getAllScoringOutputs } from '@/data/scoringOutputs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ScoringPage() {
  const scoring = getAllScoringOutputs();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scoring Outputs</h1>
      {scoring.length === 0 ? <p className="text-muted-foreground">No scoring models created yet.</p> : (
        <div className="grid gap-4">
          {scoring.map((s) => (
            <Card key={s.scoring_model_id}>
              <CardHeader><CardTitle className="font-mono text-lg">{s.scoring_model_id}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Assessment: {s.assessment_id}</p>
                <p className="text-sm">Raw Metrics: {s.raw_metrics_schema.length} | Derived: {s.derived_metrics_schema.length}</p>
                <p className="text-sm">Flags: {s.flags.length} | Thresholds: {s.thresholds.length}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
