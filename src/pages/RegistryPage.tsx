import { Link } from 'react-router-dom';
import { useAssessments } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { COMPONENT_INFO, type ComponentCode } from '@/types/database';

export default function RegistryPage() {
  const { data: assessments, isLoading, error, refetch } = useAssessments();

  if (isLoading) {
    return <LoadingState title="Loading assessments..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load assessments" error={error} onRetry={refetch} />;
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Assessment Registry</h1>
        <EmptyState 
          title="No assessments found" 
          description="The assessment registry is empty."
        />
      </div>
    );
  }

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
          {assessments.map((a) => (
            <TableRow key={a.assessment_id}>
              <TableCell>
                <Link to={`/assessment/${a.assessment_id}`} className="text-primary hover:underline font-mono">
                  {a.assessment_id}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {COMPONENT_INFO[a.component_code as ComponentCode]?.name || a.component_code}
                </Badge>
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
