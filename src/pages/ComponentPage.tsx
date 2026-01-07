import { useParams, Link } from 'react-router-dom';
import { getAssessmentsByComponent } from '@/data/assessmentRegistry';
import { COMPONENT_INFO, ComponentCode } from '@/types/registry';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ComponentPage() {
  const { code } = useParams<{ code: string }>();
  const componentCode = code as ComponentCode;
  const info = COMPONENT_INFO[componentCode];
  const assessments = getAssessmentsByComponent(componentCode);

  if (!info) return <p>Component not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{info.name}</h1>
        <p className="text-muted-foreground">{assessments.length} assessments</p>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Subcomponent</TableHead><TableHead>Content Model</TableHead><TableHead>Grade Range</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {assessments.map((a) => (
            <TableRow key={a.assessment_id}>
              <TableCell><Link to={`/assessment/${a.assessment_id}`} className="text-primary hover:underline font-mono">{a.assessment_id}</Link></TableCell>
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
