import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import type { ASRVersionRow } from '@/types/database';

interface ASRSummaryStatsProps {
  asrs: ASRVersionRow[];
}

export function ASRSummaryStats({ asrs }: ASRSummaryStatsProps) {
  const total = asrs.length;
  const validCount = asrs.filter(a => a.validation_status === 'valid').length;
  const incompleteCount = asrs.filter(a => a.validation_status === 'incomplete').length;
  const needsReviewCount = asrs.filter(a => a.validation_status === 'needs-review').length;

  // Count by component prefix
  const componentCounts = asrs.reduce((acc, asr) => {
    const prefix = asr.asr_version_id.split('-')[0];
    acc[prefix] = (acc[prefix] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    { label: 'Total ASRs', value: total, icon: FileText, color: 'text-foreground' },
    { label: 'Valid', value: validCount, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Incomplete', value: incompleteCount, icon: Clock, color: 'text-yellow-600' },
    { label: 'Needs Review', value: needsReviewCount, icon: AlertCircle, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Component breakdown */}
      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span className="font-medium">By Component:</span>
        {Object.entries(componentCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([prefix, count]) => (
            <span key={prefix} className="bg-muted px-2 py-0.5 rounded">
              {prefix}: {count}
            </span>
          ))}
      </div>
    </div>
  );
}
