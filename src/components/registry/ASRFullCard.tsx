import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionContent } from './SectionContent';
import type { ASRVersionRow, ASRSectionA } from '@/types/database';

interface ASRFullCardProps {
  asr: ASRVersionRow;
}

const SECTION_TITLES: Record<string, string> = {
  a: 'Identity & Metadata',
  b: 'Construct & Purpose',
  c: 'Content Structure',
  d: 'Student Interaction',
  e: 'Assessor Interaction',
  f: 'Scoring Rules',
  g: 'Raw Metrics Schema',
  h: 'Derived Metrics & Thresholds',
  i: 'Content Bank Specification',
  j: 'Engineering Hooks',
};

export function ASRFullCard({ asr }: ASRFullCardProps) {
  const sectionA = asr.section_a as ASRSectionA | null;

  const sections: { key: string; data: Record<string, unknown> }[] = [
    { key: 'a', data: (asr.section_a as Record<string, unknown>) || {} },
    { key: 'b', data: (asr.section_b as Record<string, unknown>) || {} },
    { key: 'c', data: (asr.section_c as Record<string, unknown>) || {} },
    { key: 'd', data: (asr.section_d as Record<string, unknown>) || {} },
    { key: 'e', data: (asr.section_e as Record<string, unknown>) || {} },
    { key: 'f', data: (asr.section_f as Record<string, unknown>) || {} },
    { key: 'g', data: (asr.section_g as Record<string, unknown>) || {} },
    { key: 'h', data: (asr.section_h as Record<string, unknown>) || {} },
    { key: 'i', data: (asr.section_i as Record<string, unknown>) || {} },
    { key: 'j', data: (asr.section_j as Record<string, unknown>) || {} },
  ];

  return (
    <Card id={asr.asr_version_id} className="scroll-mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-mono">
              <Link 
                to={`/asr/${asr.asr_version_id}`} 
                className="text-primary hover:underline"
              >
                {asr.asr_version_id}
              </Link>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {sectionA?.assessment_name || asr.assessment_id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={asr.validation_status || 'incomplete'} />
            <Badge variant="outline">{asr.completeness_percent || 0}%</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map(({ key, data }) => (
          <div key={key} className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
              Section {key.toUpperCase()}: {SECTION_TITLES[key]}
            </h3>
            <SectionContent section={data} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
