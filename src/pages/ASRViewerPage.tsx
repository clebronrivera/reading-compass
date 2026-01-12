import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useASRVersions } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ASRSummaryStats } from '@/components/registry/ASRSummaryStats';
import { ASRFullCard } from '@/components/registry/ASRFullCard';
import { ArrowLeft, Search, X } from 'lucide-react';
import type { ASRSectionA } from '@/types/database';

const COMPONENT_FILTERS = ['FL', 'PA', 'PH', 'RC', 'VO'];

export default function ASRViewerPage() {
  const { data: asrs, isLoading, error, refetch } = useASRVersions();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredASRs = useMemo(() => {
    if (!asrs) return [];
    
    let result = asrs;
    
    // Filter by component prefix
    if (activeFilter) {
      result = result.filter(asr => asr.asr_version_id.startsWith(activeFilter));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(asr => {
        const sectionA = asr.section_a as ASRSectionA | null;
        return (
          asr.asr_version_id.toLowerCase().includes(query) ||
          asr.assessment_id.toLowerCase().includes(query) ||
          (sectionA?.assessment_name?.toLowerCase().includes(query) ?? false)
        );
      });
    }
    
    return result;
  }, [asrs, searchQuery, activeFilter]);

  if (isLoading) {
    return <LoadingState title="Loading all ASR versions..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load ASR versions" error={error} onRetry={refetch} />;
  }

  if (!asrs || asrs.length === 0) {
    return (
      <div className="space-y-6">
        <Link to="/asr" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to ASR Library
        </Link>
        <EmptyState 
          title="No ASR versions found" 
          description="No ASR versions have been created yet."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/asr" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to ASR Library
          </Link>
          <h1 className="text-2xl font-bold">Master ASR Audit</h1>
          <p className="text-sm text-muted-foreground">
            Complete read-only view of all {asrs.length} ASR specifications
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <ASRSummaryStats asrs={asrs} />

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ASR ID, assessment name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(null)}
          >
            All
          </Button>
          {COMPONENT_FILTERS.map((prefix) => (
            <Button
              key={prefix}
              variant={activeFilter === prefix ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(activeFilter === prefix ? null : prefix)}
            >
              {prefix}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredASRs.length} of {asrs.length} ASRs
      </p>

      {/* Jump-to Navigation */}
      {filteredASRs.length > 5 && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {filteredASRs.map((asr) => (
              <Button
                key={asr.asr_version_id}
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap"
                asChild
              >
                <a href={`#${asr.asr_version_id}`}>{asr.asr_version_id}</a>
              </Button>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* ASR Cards */}
      <div className="space-y-8">
        {filteredASRs.map((asr) => (
          <ASRFullCard key={asr.asr_version_id} asr={asr} />
        ))}
      </div>

      {filteredASRs.length === 0 && (
        <EmptyState 
          title="No matching ASRs" 
          description="Try adjusting your search or filter criteria."
        />
      )}
    </div>
  );
}
