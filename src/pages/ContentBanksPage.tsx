import { getAllContentBanks } from '@/data/contentBanks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ContentBanksPage() {
  const banks = getAllContentBanks();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Banks</h1>
      {banks.length === 0 ? <p className="text-muted-foreground">No content banks created yet.</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>Bank ID</TableHead><TableHead>Name</TableHead><TableHead>Size</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {banks.map((b) => (
              <TableRow key={b.content_bank_id}>
                <TableCell className="font-mono">{b.content_bank_id}</TableCell>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.current_size}/{b.target_bank_size}</TableCell>
                <TableCell><Badge className="bg-status-active">{b.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
