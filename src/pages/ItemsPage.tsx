import { Link } from 'react-router-dom';
import { getAllItems } from '@/data/items';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ItemsPage() {
  const items = getAllItems();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Items Library</h1>
      {items.length === 0 ? <p className="text-muted-foreground">No items created yet.</p> : (
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
            {items.map((item) => (
              <TableRow key={item.item_id}>
                <TableCell>
                  <Link to={`/items/${item.item_id}`} className="text-primary hover:underline font-mono text-xs">
                    {item.item_id}
                  </Link>
                </TableCell>
                <TableCell><Badge variant="outline">{item.item_type}</Badge></TableCell>
                <TableCell>{item.content_payload.stimulus}</TableCell>
                <TableCell>
                  <Link to={`/forms/${item.form_id}`} className="text-primary hover:underline font-mono text-xs">
                    {item.form_id}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">{item.scoring_tags.join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
