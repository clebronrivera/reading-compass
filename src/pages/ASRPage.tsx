import { Link } from 'react-router-dom';
import { getAllASRs } from '@/data/asrLibrary';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ASRPage() {
  const asrs = getAllASRs();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ASR Library</h1>
      {asrs.length === 0 ? <p className="text-muted-foreground">No ASRs created yet.</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>Version ID</TableHead><TableHead>Assessment</TableHead><TableHead>Status</TableHead><TableHead>Completeness</TableHead></TableRow></TableHeader>
          <TableBody>
            {asrs.map((asr) => (
              <TableRow key={asr.asr_version_id}>
                <TableCell><Link to={`/asr/${asr.asr_version_id}`} className="text-primary hover:underline font-mono">{asr.asr_version_id}</Link></TableCell>
                <TableCell>{asr.section_a.assessment_name}</TableCell>
                <TableCell><Badge className="bg-status-active">{asr.section_a.status}</Badge></TableCell>
                <TableCell>{asr.completeness_percent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
