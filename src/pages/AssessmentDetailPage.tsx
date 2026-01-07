import { useParams, Link } from 'react-router-dom';
import { getAssessmentById } from '@/data/assessmentRegistry';
import { getASRsByAssessmentId } from '@/data/asrLibrary';
import { getContentBanksByAssessment } from '@/data/contentBanks';
import { getFormsByAssessment } from '@/data/forms';
import { getScoringOutputsByAssessment } from '@/data/scoringOutputs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { COMPONENT_INFO } from '@/types/registry';
import { ArrowLeft } from 'lucide-react';

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const assessment = getAssessmentById(id || '');
  const asrs = getASRsByAssessmentId(id || '');
  const banks = getContentBanksByAssessment(id || '');
  const forms = getFormsByAssessment(id || '');
  const scoring = getScoringOutputsByAssessment(id || '');

  if (!assessment) {
    return (
      <div className="space-y-4">
        <Link to="/registry" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Registry
        </Link>
        <p className="text-muted-foreground">Assessment not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/registry" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Registry
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{COMPONENT_INFO[assessment.component_code].name}</Badge>
          <StatusBadge status={assessment.status} />
        </div>
        <h1 className="text-2xl font-bold">{assessment.subcomponent_name}</h1>
        <p className="font-mono text-muted-foreground">{assessment.assessment_id}</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Content Model</p>
              <p>{assessment.content_model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Grade Range</p>
              <p>{assessment.grade_range}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={assessment.status} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Linked Records</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">ASR Versions ({asrs.length})</p>
              {asrs.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {asrs.map(a => (
                    <Link key={a.asr_version_id} to={`/asr/${a.asr_version_id}`} className="text-primary hover:underline font-mono text-sm">
                      {a.asr_version_id}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Content Banks ({banks.length})</p>
              {banks.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {banks.map(b => (
                    <Link key={b.content_bank_id} to={`/banks/${b.content_bank_id}`} className="text-primary hover:underline font-mono text-sm">
                      {b.content_bank_id}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Forms ({forms.length})</p>
              {forms.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {forms.map(f => (
                    <Link key={f.form_id} to={`/forms/${f.form_id}`} className="text-primary hover:underline font-mono text-sm">
                      {f.form_id}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scoring Models ({scoring.length})</p>
              {scoring.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {scoring.map(s => (
                    <Link key={s.scoring_model_id} to={`/scoring/${s.scoring_model_id}`} className="text-primary hover:underline font-mono text-sm">
                      {s.scoring_model_id}
                    </Link>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">None</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
