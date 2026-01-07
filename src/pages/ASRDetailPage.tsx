import { useParams, Link } from 'react-router-dom';
import { getASRByVersionId } from '@/data/asrLibrary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ASRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const asr = getASRByVersionId(id || '');

  if (!asr) return <p>ASR not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <Badge className="mb-2">ASR</Badge>
        <h1 className="text-2xl font-bold">{asr.section_a.assessment_name}</h1>
        <p className="font-mono text-muted-foreground">{asr.asr_version_id}</p>
        <Link to={`/assessment/${asr.assessment_id}`} className="text-sm text-primary hover:underline">← Back to Assessment</Link>
      </div>
      <div className="flex gap-4 text-sm">
        <Badge className="bg-status-active">{asr.section_a.status}</Badge>
        <span>Completeness: {asr.completeness_percent}%</span>
        <span>Validation: {asr.validation_status}</span>
      </div>
      <Tabs defaultValue="a">
        <TabsList className="flex-wrap h-auto">
          {['A','B','C','D','E','F','G','H','I','J'].map(s => <TabsTrigger key={s} value={s.toLowerCase()}>Section {s}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="a"><Card><CardHeader><CardTitle>Section A: Identification</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>ASR ID:</strong> {asr.section_a.asr_id}</p><p><strong>Version:</strong> {asr.section_a.version}</p><p><strong>Owner:</strong> {asr.section_a.owner}</p><p><strong>Last Updated:</strong> {asr.section_a.last_updated}</p></CardContent></Card></TabsContent>
        <TabsContent value="b"><Card><CardHeader><CardTitle>Section B: Classification</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Component:</strong> {asr.section_b.component}</p><p><strong>Subcomponent:</strong> {asr.section_b.subcomponent}</p><p><strong>Skill Focus:</strong> {asr.section_b.skill_focus}</p><p><strong>Grade Range:</strong> {asr.section_b.grade_range}</p><p><strong>Administration:</strong> {asr.section_b.administration_format}</p></CardContent></Card></TabsContent>
        <TabsContent value="c"><Card><CardHeader><CardTitle>Section C: Purpose</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Purpose:</strong> {asr.section_c.purpose}</p><p><strong>What it Measures:</strong> {asr.section_c.what_it_measures}</p><p><strong>Intended Use:</strong> {asr.section_c.intended_use}</p><p><strong>Not Designed For:</strong> {asr.section_c.not_designed_for}</p></CardContent></Card></TabsContent>
        <TabsContent value="d"><Card><CardHeader><CardTitle>Section D: Content</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Content Model:</strong> {asr.section_d.content_model}</p><p><strong>Item Types:</strong> {asr.section_d.item_types.join(', ')}</p><p><strong>Stimulus:</strong> {asr.section_d.stimulus_description}</p><p><strong>Response Format:</strong> {asr.section_d.response_format}</p></CardContent></Card></TabsContent>
        <TabsContent value="e"><Card><CardHeader><CardTitle>Section E: Structure</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Total Items:</strong> {asr.section_e.total_items}</p><p><strong>Timing:</strong> {asr.section_e.timing}</p><p><strong>Stopping Rule:</strong> {asr.section_e.stopping_rule}</p><p><strong>Materials:</strong> {asr.section_e.materials_required.join(', ')}</p></CardContent></Card></TabsContent>
        <TabsContent value="f"><Card><CardHeader><CardTitle>Section F: Administration</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Script:</strong> {asr.section_f.administration_script}</p><p><strong>Practice Items:</strong> {asr.section_f.practice_items}</p><p><strong>Prompts:</strong> {asr.section_f.prompts.join(' | ')}</p><p><strong>Supports:</strong> {asr.section_f.allowable_supports.join(', ')}</p></CardContent></Card></TabsContent>
        <TabsContent value="g"><Card><CardHeader><CardTitle>Section G: Scoring</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Method:</strong> {asr.section_g.scoring_method}</p><p><strong>Score Types:</strong> {asr.section_g.score_types.join(', ')}</p><p><strong>Error Coding:</strong> {asr.section_g.error_coding}</p><p><strong>Rubric:</strong> {asr.section_g.scoring_rubric}</p></CardContent></Card></TabsContent>
        <TabsContent value="h"><Card><CardHeader><CardTitle>Section H: Metrics</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Raw Metrics:</strong> {asr.section_h.raw_metrics.join(', ')}</p><p><strong>Derived:</strong> {asr.section_h.derived_metrics.join(', ')}</p><p><strong>Benchmarks:</strong> {asr.section_h.benchmark_status}</p><p><strong>Norm Ref:</strong> {asr.section_h.norm_reference}</p></CardContent></Card></TabsContent>
        <TabsContent value="i"><Card><CardHeader><CardTitle>Section I: Forms</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Available:</strong> {asr.section_i.forms_available.join(', ')}</p><p><strong>Equivalence:</strong> {asr.section_i.equivalence_sets}</p><p><strong>Differentiation:</strong> {asr.section_i.differentiation_keys.join(', ')}</p><p><strong>Notes:</strong> {asr.section_i.version_notes}</p></CardContent></Card></TabsContent>
        <TabsContent value="j"><Card><CardHeader><CardTitle>Section J: Integration</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Export Format:</strong> {asr.section_j.data_export_format}</p><p><strong>Integration:</strong> {asr.section_j.integration_notes}</p><p><strong>Dashboard:</strong> {asr.section_j.reporting_dashboard}</p><p><strong>Flags:</strong> {asr.section_j.flags_and_alerts}</p></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
