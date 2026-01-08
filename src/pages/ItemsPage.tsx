import { Link } from 'react-router-dom';
import { useItems } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { getDisplayText } from '@/lib/itemDisplay';

export default function ItemsPage() {
  const { data: items, isLoading, error, refetch } = useItems();

  if (isLoading) {
    return <LoadingState title="Loading items..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load items" error={error} onRetry={refetch} />;
  }

  if (!items || items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Items Library</h1>
        <EmptyState 
          title="No items found" 
          description="No items have been created yet."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Items Library</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Stimulus</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const displayText = getDisplayText(item.content_payload);
            return (
              <TableRow key={item.item_id}>
                <TableCell>
                  <Link to={`/items/${item.item_id}`} className="text-primary hover:underline font-mono text-xs">
                    {item.item_id}
                  </Link>
                </TableCell>
                <TableCell><Badge variant="outline">{item.item_type}</Badge></TableCell>
                <TableCell>{displayText || '-'}</TableCell>
                <TableCell>
                  <Link to={`/forms/${item.form_id}`} className="text-primary hover:underline font-mono text-xs">
                    {item.form_id}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">{(item.scoring_tags || []).join(', ')}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
