import { getAllForms } from '@/data/forms';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function FormsPage() {
  const forms = getAllForms();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Forms Library</h1>
      {forms.length === 0 ? <p className="text-muted-foreground">No forms created yet.</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>Form ID</TableHead><TableHead>Grade/Level</TableHead><TableHead>Form #</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {forms.map((f) => (
              <TableRow key={f.form_id}>
                <TableCell className="font-mono">{f.form_id}</TableCell>
                <TableCell>{f.grade_or_level_tag}</TableCell>
                <TableCell>{f.form_number}</TableCell>
                <TableCell><Badge className="bg-status-active">{f.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
