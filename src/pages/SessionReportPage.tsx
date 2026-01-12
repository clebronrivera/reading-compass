import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { exportSession, downloadSessionJSON, type SessionExport } from '@/lib/sessionExport';
import { isValidRouteId } from '@/lib/routeValidation';

export default function SessionReportPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SessionExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id || !isValidRouteId(id)) {
      setError(new Error('Invalid session ID'));
      setLoading(false);
      return;
    }

    exportSession(id)
      .then(result => {
        if (!result) {
          setError(new Error('Session not found'));
        } else {
          setData(result);
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (id) {
      await downloadSessionJSON(id);
    }
  };

  if (loading) {
    return <LoadingState title="Loading report..." />;
  }

  if (error || !data) {
    return <ErrorState title="Failed to load report" error={error} />;
  }

  const isFluency = data.assessment_id.startsWith('FL-');

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/sessions">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Session Report</h1>
              <p className="text-muted-foreground">{data.student_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Session Info */}
        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Student</dt>
                <dd className="font-semibold">{data.student_name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Grade</dt>
                <dd className="font-semibold">{data.grade_tag || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Assessment</dt>
                <dd className="font-semibold">{data.assessment_id}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Form</dt>
                <dd className="font-semibold">{data.form_id}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Started</dt>
                <dd className="font-semibold">
                  {data.started_at ? new Date(data.started_at).toLocaleString() : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Completed</dt>
                <dd className="font-semibold">
                  {data.completed_at ? new Date(data.completed_at).toLocaleString() : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant={data.status === 'completed' ? 'default' : 'secondary'}>
                    {data.status}
                  </Badge>
                </dd>
              </div>
              {data.discontinue && (
                <div>
                  <dt className="text-sm text-muted-foreground">Discontinued</dt>
                  <dd className="font-semibold text-destructive">{data.discontinue.reason}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Scores */}
        {data.scores && (
          <Card>
            <CardHeader>
              <CardTitle>Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {isFluency ? (
                  <>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <dt className="text-sm text-muted-foreground mb-1">Items/Minute</dt>
                      <dd className="text-4xl font-bold">
                        {(data.scores as any).items_per_minute}
                      </dd>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <dt className="text-sm text-muted-foreground mb-1">Accuracy</dt>
                      <dd className="text-4xl font-bold">
                        {(data.scores as any).accuracy_percentage}%
                      </dd>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <dt className="text-sm text-muted-foreground mb-1">Correct</dt>
                      <dd className="text-4xl font-bold text-green-600">
                        {(data.scores as any).items_correct}
                      </dd>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <dt className="text-sm text-muted-foreground mb-1">Incorrect</dt>
                      <dd className="text-4xl font-bold text-red-600">
                        {(data.scores as any).items_incorrect}
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <dt className="text-sm text-muted-foreground mb-1">Total Items</dt>
                      <dd className="text-4xl font-bold">
                        {(data.scores as any).total_items}
                      </dd>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <dt className="text-sm text-muted-foreground mb-1">Accuracy</dt>
                      <dd className="text-4xl font-bold">
                        {(data.scores as any).accuracy_percentage}%
                      </dd>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <dt className="text-sm text-muted-foreground mb-1">Correct</dt>
                      <dd className="text-4xl font-bold text-green-600">
                        {(data.scores as any).correct}
                      </dd>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <dt className="text-sm text-muted-foreground mb-1">Incorrect</dt>
                      <dd className="text-4xl font-bold text-red-600">
                        {(data.scores as any).incorrect}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Response Details */}
        <Card>
          <CardHeader>
            <CardTitle>Response Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Stimulus</TableHead>
                  <TableHead className="w-24">Result</TableHead>
                  <TableHead>Error Tags</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.responses.map((r) => (
                  <TableRow key={r.sequence}>
                    <TableCell className="font-mono">{r.sequence}</TableCell>
                    <TableCell className="font-medium">{r.stimulus || '—'}</TableCell>
                    <TableCell>
                      {r.is_correct === null ? (
                        <Badge variant="secondary">No Response</Badge>
                      ) : r.is_correct ? (
                        <Badge className="bg-green-600">Correct</Badge>
                      ) : (
                        <Badge variant="destructive">Incorrect</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.error_tags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {r.error_tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Export Metadata */}
        <p className="text-xs text-muted-foreground text-center">
          Report generated: {new Date(data.metadata.exported_at).toLocaleString()} • 
          Export version: {data.metadata.export_version}
        </p>
      </div>
    </>
  );
}
