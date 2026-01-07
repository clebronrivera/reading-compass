import { useContentBanks } from '@/lib/api/contentBanks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from 'react-router-dom';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

export default function ContentBanksPage() {
  const { data: banks = [], isLoading, error, refetch } = useContentBanks();

  if (isLoading) {
    return <LoadingState title="Loading content banks..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load content banks" error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Banks</h1>
      {banks.length === 0 ? (
        <EmptyState 
          title="No content banks" 
          description="No content banks have been created yet."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Assessment</TableHead>
              <TableHead>Equivalence Required</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((b) => (
              <TableRow key={b.content_bank_id}>
                <TableCell>
                  <Link to={`/banks/${b.content_bank_id}`} className="text-primary hover:underline font-mono">
                    {b.content_bank_id}
                  </Link>
                </TableCell>
                <TableCell>{b.name}</TableCell>
                <TableCell>
                  <Link to={`/assessment/${b.linked_assessment_id}`} className="text-primary hover:underline font-mono text-sm">
                    {b.linked_assessment_id}
                  </Link>
                </TableCell>
                <TableCell>{b.equivalence_set_required ? 'Yes' : 'No'}</TableCell>
                <TableCell>{b.current_size || 0}/{b.target_bank_size || 0}</TableCell>
                <TableCell><StatusBadge status={b.status || 'empty'} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
