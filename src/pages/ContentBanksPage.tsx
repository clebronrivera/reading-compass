import { getAllContentBanks } from '@/data/contentBanks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from 'react-router-dom';

export default function ContentBanksPage() {
  const banks = getAllContentBanks();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Banks</h1>
      {banks.length === 0 ? <p className="text-muted-foreground">No content banks created yet.</p> : (
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
                <TableCell>{b.current_size}/{b.target_bank_size}</TableCell>
                <TableCell><StatusBadge status={b.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
