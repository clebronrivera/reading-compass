import { useParams, Link } from 'react-router-dom';
import { useAssessments } from '@/lib/api';
import { COMPONENT_INFO, type ComponentCode } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

export default function ComponentPage() {
  const { code } = useParams<{ code: string }>();
  const componentCode = code as ComponentCode;
  const info = COMPONENT_INFO[componentCode];

  const { data: allAssessments, isLoading, error, refetch } = useAssessments();

  if (!info) {
    return (
      <div className="space-y-6">
        <ErrorState title="Component not found" error={`Unknown component code: ${code}`} />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState title={`Loading ${info.name} assessments...`} />;
  }

  if (error) {
    return <ErrorState title="Failed to load assessments" error={error} onRetry={refetch} />;
  }

  const assessments = (allAssessments || []).filter(a => a.component_code === componentCode);

  if (assessments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{info.name}</h1>
          <p className="text-muted-foreground">0 assessments</p>
        </div>
        <EmptyState 
          title={`No ${info.name} assessments`} 
          description="No assessments exist for this component."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{info.name}</h1>
        <p className="text-muted-foreground">{assessments.length} assessments</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Subcomponent</TableHead>
            <TableHead>Content Model</TableHead>
            <TableHead>Grade Range</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assessments.map((a) => (
            <TableRow key={a.assessment_id}>
              <TableCell>
                <Link to={`/assessment/${a.assessment_id}`} className="text-primary hover:underline font-mono">
                  {a.assessment_id}
                </Link>
              </TableCell>
              <TableCell>{a.subcomponent_name}</TableCell>
              <TableCell>{a.content_model}</TableCell>
              <TableCell>{a.grade_range}</TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
