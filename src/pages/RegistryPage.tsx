import { Link } from 'react-router-dom';
import { assessmentRegistry } from '@/data/assessmentRegistry';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { COMPONENT_INFO } from '@/types/registry';

export default function RegistryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Assessment Registry</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Component</TableHead>
            <TableHead>Subcomponent</TableHead>
            <TableHead>Content Model</TableHead>
            <TableHead>Grade Range</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assessmentRegistry.map((a) => (
            <TableRow key={a.assessment_id}>
              <TableCell><Link to={`/assessment/${a.assessment_id}`} className="text-primary hover:underline font-mono">{a.assessment_id}</Link></TableCell>
              <TableCell><Badge variant="outline">{COMPONENT_INFO[a.component_code].name}</Badge></TableCell>
              <TableCell>{a.subcomponent_name}</TableCell>
              <TableCell>{a.content_model}</TableCell>
              <TableCell>{a.grade_range}</TableCell>
              <TableCell><Badge className={a.status === 'active' ? 'bg-status-active' : 'bg-status-stub'}>{a.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
