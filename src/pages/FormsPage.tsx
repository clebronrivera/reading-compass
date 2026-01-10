import { Link } from 'react-router-dom';
import { useForms } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { getGradeLabel } from '@/lib/gradeUtils';

export default function FormsPage() {
  const { data: forms, isLoading, error, refetch } = useForms();

  if (isLoading) {
    return <LoadingState title="Loading forms..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load forms" error={error} onRetry={refetch} />;
  }

  if (!forms || forms.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Forms Library</h1>
        <EmptyState 
          title="No forms found" 
          description="No forms have been created yet."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Forms Library</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Form ID</TableHead>
            <TableHead>Grade/Level</TableHead>
            <TableHead>Form #</TableHead>
            <TableHead>Content Bank</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.map((f) => (
            <TableRow key={f.form_id}>
              <TableCell>
                <Link to={`/forms/${f.form_id}`} className="text-primary hover:underline font-mono">
                  {f.form_id}
                </Link>
              </TableCell>
              <TableCell>{getGradeLabel(f.grade_or_level_tag)}</TableCell>
              <TableCell>{f.form_number}</TableCell>
              <TableCell>
                <Link to={`/banks/${f.content_bank_id}`} className="text-primary hover:underline font-mono text-xs">
                  {f.content_bank_id}
                </Link>
              </TableCell>
              <TableCell><StatusBadge status={f.status || 'draft'} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
