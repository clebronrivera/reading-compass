import { useParams, Link } from 'react-router-dom';
import { useForm } from '@/lib/api/forms';
import { useItemsByForm } from '@/lib/api/items';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ArrowLeft } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading, error, refetch } = useForm(id || '');
  const { data: items = [] } = useItemsByForm(id || '');

  if (isLoading) {
    return <LoadingState title="Loading form..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load form" error={error} onRetry={refetch} />;
  }

  if (!form) {
    return (
      <div className="space-y-4">
        <Link to="/forms" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Forms
        </Link>
        <p className="text-muted-foreground">Form not found.</p>
      </div>
    );
  }

  const metadata = (form.metadata as Record<string, unknown>) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/forms" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Forms
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Form {form.form_number} — {form.grade_or_level_tag}</h1>
            <p className="font-mono text-muted-foreground">{form.form_id}</p>
          </div>
          <StatusBadge status={form.status || 'draft'} size="lg" />
        </div>
      </div>

      {/* Form Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Form Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Form ID</p>
              <p className="font-mono">{form.form_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assessment</p>
              <Link to={`/assessment/${form.assessment_id}`} className="text-primary hover:underline font-mono">
                {form.assessment_id}
              </Link>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Content Bank</p>
              <Link to={`/banks/${form.content_bank_id}`} className="text-primary hover:underline font-mono">
                {form.content_bank_id}
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Grade/Level Tag</p>
              <p>{form.grade_or_level_tag}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Form Number</p>
              <p>{form.form_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Equivalence Set</p>
              <p className="font-mono">{form.equivalence_set_id || 'None'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Created Date</p>
            <p>{String(metadata.created_date || form.created_at || 'N/A')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Modified</p>
            <p>{String(metadata.last_modified || form.updated_at || 'N/A')}</p>
          </div>
          {metadata.readability_level && (
            <div>
              <p className="text-sm text-muted-foreground">Readability Level</p>
              <p>{String(metadata.readability_level)}</p>
            </div>
          )}
          {metadata.word_count && (
            <div>
              <p className="text-sm text-muted-foreground">Word Count</p>
              <p>{String(metadata.word_count)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items in Form */}
      <Card>
        <CardHeader>
          <CardTitle>Items in Form ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground">No items created for this form yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item ID</TableHead>
                  <TableHead>Sequence</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell>
                      <Link to={`/items/${item.item_id}`} className="text-primary hover:underline font-mono text-xs">
                        {item.item_id}
                      </Link>
                    </TableCell>
                    <TableCell>{item.sequence_number}</TableCell>
                    <TableCell><Badge variant="outline">{item.item_type}</Badge></TableCell>
                    <TableCell className="text-xs">{(item.scoring_tags || []).length} tags</TableCell>
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
