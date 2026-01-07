import { useParams, Link } from 'react-router-dom';
import { getAssessmentById } from '@/data/assessmentRegistry';
import { getASRsByAssessmentId } from '@/data/asrLibrary';
import { getContentBanksByAssessment } from '@/data/contentBanks';
import { getFormsByAssessment } from '@/data/forms';
import { getScoringOutputsByAssessment } from '@/data/scoringOutputs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COMPONENT_INFO } from '@/types/registry';

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const assessment = getAssessmentById(id || '');
  const asrs = getASRsByAssessmentId(id || '');
  const banks = getContentBanksByAssessment(id || '');
  const forms = getFormsByAssessment(id || '');
  const scoring = getScoringOutputsByAssessment(id || '');

  if (!assessment) return <p>Assessment not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <Badge className="mb-2">{COMPONENT_INFO[assessment.component_code].name}</Badge>
        <h1 className="text-2xl font-bold">{assessment.subcomponent_name}</h1>
        <p className="font-mono text-muted-foreground">{assessment.assessment_id}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="space-y-2">
          <p><strong>Content Model:</strong> {assessment.content_model}</p>
          <p><strong>Grade Range:</strong> {assessment.grade_range}</p>
          <p><strong>Status:</strong> <Badge className={assessment.status === 'active' ? 'bg-status-active' : 'bg-status-stub'}>{assessment.status}</Badge></p>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Linked Records</CardTitle></CardHeader><CardContent className="space-y-2">
          <p><strong>ASR Versions:</strong> {asrs.length > 0 ? asrs.map(a => <Link key={a.asr_version_id} to={`/asr/${a.asr_version_id}`} className="text-primary hover:underline ml-1">{a.asr_version_id}</Link>) : 'None'}</p>
          <p><strong>Content Banks:</strong> {banks.length}</p>
          <p><strong>Forms:</strong> {forms.length}</p>
          <p><strong>Scoring Models:</strong> {scoring.length}</p>
        </CardContent></Card>
      </div>
    </div>
  );
}
