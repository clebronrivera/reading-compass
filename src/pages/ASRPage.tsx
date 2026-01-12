import { Link } from 'react-router-dom';
import { useASRVersions } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { LayoutGrid } from 'lucide-react';
import type { ASRSectionA } from '@/types/database';

export default function ASRPage() {
  const { data: asrs, isLoading, error, refetch } = useASRVersions();

  if (isLoading) {
    return <LoadingState title="Loading ASR versions..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load ASR versions" error={error} onRetry={refetch} />;
  }

  if (!asrs || asrs.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ASR Library</h1>
        <EmptyState 
          title="No ASR versions found" 
          description="No ASR versions have been created yet."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ASR Library</h1>
        <Link to="/asr/viewer">
          <Button variant="outline">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Full Audit View
          </Button>
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version ID</TableHead>
            <TableHead>Assessment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Completeness</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {asrs.map((asr) => {
            const sectionA = asr.section_a as ASRSectionA | null;
            return (
              <TableRow key={asr.asr_version_id}>
                <TableCell>
                  <Link to={`/asr/${asr.asr_version_id}`} className="text-primary hover:underline font-mono">
                    {asr.asr_version_id}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link to={`/assessment/${asr.assessment_id}`} className="text-primary hover:underline">
                    {sectionA?.assessment_name || asr.assessment_id}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={asr.validation_status || 'incomplete'} />
                </TableCell>
                <TableCell>{asr.completeness_percent ?? 0}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
