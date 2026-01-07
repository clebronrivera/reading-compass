import { useParams, Link } from 'react-router-dom';
import { useItem } from '@/lib/api/items';
import { isValidRouteId } from '@/lib/routeValidation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Validate route param before any queries
  if (!isValidRouteId(id)) {
    return <ErrorState title="Invalid Route" error="Invalid item ID in URL" />;
  }

  const { data: item, isLoading, error, refetch } = useItem(id);

  if (isLoading) {
    return <LoadingState title="Loading item..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load item" error={error} onRetry={refetch} />;
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Link to="/items" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Items
        </Link>
        <p className="text-muted-foreground">Item not found.</p>
      </div>
    );
  }

  const payload = (item.content_payload as Record<string, unknown>) || {};
  const scoringTags = item.scoring_tags || [];
  const errorTypes = Array.isArray(payload.error_types) ? payload.error_types : [];
  const choices = Array.isArray(payload.choices) ? payload.choices : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/items" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Items
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Item #{item.sequence_number}</h1>
            <p className="font-mono text-muted-foreground">{item.item_id}</p>
          </div>
          <Badge variant="outline" className="text-lg px-3 py-1">{item.item_type}</Badge>
        </div>
      </div>

      {/* Item Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Item Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Item ID</p>
              <p className="font-mono text-sm">{item.item_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Form</p>
              <Link to={`/forms/${item.form_id}`} className="text-primary hover:underline font-mono">
                {item.form_id}
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Item Type</p>
              <Badge variant="outline">{item.item_type}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sequence Number</p>
              <p>{item.sequence_number}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Tags</CardTitle>
        </CardHeader>
        <CardContent>
          {scoringTags.length === 0 ? (
            <p className="text-muted-foreground">No scoring tags.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {scoringTags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Payload */}
      <Card>
        <CardHeader>
          <CardTitle>Content Payload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {payload.stimulus && (
            <div>
              <p className="text-sm text-muted-foreground">Stimulus</p>
              <p className="text-2xl font-bold">{String(payload.stimulus)}</p>
            </div>
          )}
          {payload.text && (
            <div>
              <p className="text-sm text-muted-foreground">Text</p>
              <p>{String(payload.text)}</p>
            </div>
          )}
          {choices.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">Choices</p>
              <ul className="list-disc list-inside">
                {choices.map((choice, i) => (
                  <li key={i}>{String(choice)}</li>
                ))}
              </ul>
            </div>
          )}
          {payload.correct_answer && (
            <div>
              <p className="text-sm text-muted-foreground">Correct Answer</p>
              <p className="font-mono bg-muted p-2 rounded">{String(payload.correct_answer)}</p>
            </div>
          )}
          {payload.rubric && (
            <div>
              <p className="text-sm text-muted-foreground">Rubric</p>
              <p className="text-sm">{String(payload.rubric)}</p>
            </div>
          )}
          {errorTypes.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">Error Types</p>
              <div className="flex flex-wrap gap-2">
                {errorTypes.map((err) => (
                  <Badge key={String(err)} variant="outline">{String(err)}</Badge>
                ))}
              </div>
            </div>
          )}
          {/* Fallback for any other fields */}
          {!payload.stimulus && !payload.text && choices.length === 0 && !payload.correct_answer && !payload.rubric && errorTypes.length === 0 && (
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
