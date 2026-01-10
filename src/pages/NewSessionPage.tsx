import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { useAssessments } from '@/lib/api/assessments';
import { useAssessmentBanks } from '@/lib/api/assessmentBanks';
import { useForms } from '@/lib/api/forms';
import { useCreateSession } from '@/lib/api/sessions';
import { toast } from 'sonner';
import { getGradeLabel } from '@/lib/gradeUtils';

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [selectedGradeBand, setSelectedGradeBand] = useState<string>('');
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [gradeTag, setGradeTag] = useState('');

  const { data: assessments, isLoading: assessmentsLoading, error: assessmentsError } = useAssessments();
  const { data: assessmentBanks } = useAssessmentBanks(selectedAssessmentId);
  const { data: allForms } = useForms();
  const createSession = useCreateSession();

  // Detect grade-banded assessments
  const GRADE_BANDED_ASSESSMENTS = ['PH-LWID', 'FL-WRF'];
  const isGradeBanded = GRADE_BANDED_ASSESSMENTS.includes(selectedAssessmentId);

  // Bank-aware form filtering
  const eligibleForms = useMemo(() => {
    if (!selectedAssessmentId || !assessmentBanks || !allForms) return [];
    
    const linkedBankIds = new Set(assessmentBanks.map(ab => ab.content_bank_id));
    return allForms.filter(form => linkedBankIds.has(form.content_bank_id));
  }, [selectedAssessmentId, assessmentBanks, allForms]);

  // Get available grade bands from eligible forms
  const availableGradeBands = useMemo(() => {
    if (!eligibleForms.length) return [];
    const bands = new Set(eligibleForms.map(f => f.grade_or_level_tag));
    // Remove 'unknown' and sort
    return Array.from(bands).filter(b => b !== 'unknown').sort();
  }, [eligibleForms]);

  // Filter forms by selected grade band for grade-banded assessments
  const filteredForms = useMemo(() => {
    if (!isGradeBanded || !selectedGradeBand) return eligibleForms;
    return eligibleForms.filter(f => f.grade_or_level_tag === selectedGradeBand);
  }, [eligibleForms, isGradeBanded, selectedGradeBand]);

  const handleAssessmentChange = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setSelectedGradeBand(''); // Reset grade band when assessment changes
    setSelectedFormId(''); // Reset form selection when assessment changes
  };

  const handleGradeBandChange = (gradeBand: string) => {
    setSelectedGradeBand(gradeBand);
    setSelectedFormId(''); // Reset form selection when grade band changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAssessmentId || !selectedFormId || !studentName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const session = await createSession.mutateAsync({
        assessment_id: selectedAssessmentId,
        form_id: selectedFormId,
        student_name: studentName.trim(),
        grade_tag: gradeTag.trim() || null,
      });
      
      toast.success('Session created');
      navigate(`/sessions/${session.session_id}/run`);
    } catch (error) {
      toast.error('Failed to create session');
    }
  };

  if (assessmentsLoading) {
    return <LoadingState title="Loading assessments..." />;
  }

  if (assessmentsError) {
    return <ErrorState title="Failed to load assessments" error={assessmentsError} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/sessions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Session</h1>
          <p className="text-muted-foreground mt-1">Set up an assessment session for a student</p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="assessment">Assessment *</Label>
              <Select value={selectedAssessmentId} onValueChange={handleAssessmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an assessment" />
                </SelectTrigger>
                <SelectContent>
                  {assessments?.map((assessment) => (
                    <SelectItem key={assessment.assessment_id} value={assessment.assessment_id}>
                      {assessment.assessment_id} - {assessment.subcomponent_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade Band Selector (for grade-banded assessments) */}
            {isGradeBanded && (
              <div className="space-y-2">
                <Label htmlFor="gradeBand">Grade Band *</Label>
                <Select value={selectedGradeBand} onValueChange={handleGradeBandChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      availableGradeBands.length === 0 
                        ? "No grade bands available"
                        : "Select a grade band"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGradeBands.map((band) => (
                      <SelectItem key={band} value={band}>
                        {getGradeLabel(band)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="form">Form *</Label>
              <Select 
                value={selectedFormId} 
                onValueChange={setSelectedFormId}
                disabled={!selectedAssessmentId || filteredForms.length === 0 || (isGradeBanded && !selectedGradeBand)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedAssessmentId 
                      ? "Select an assessment first" 
                      : isGradeBanded && !selectedGradeBand
                        ? "Select a grade band first"
                        : filteredForms.length === 0 
                          ? "No forms available for this assessment"
                          : "Select a form"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredForms.map((form) => (
                    <SelectItem key={form.form_id} value={form.form_id}>
                      {form.form_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAssessmentId && !isGradeBanded && eligibleForms.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No forms are linked to this assessment's content banks.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentName">Student Name *</Label>
              <Input
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradeTag">Grade (optional)</Label>
              <Input
                id="gradeTag"
                value={gradeTag}
                onChange={(e) => setGradeTag(e.target.value)}
                placeholder="e.g., K, 1, 2"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={createSession.isPending || !selectedAssessmentId || !selectedFormId || !studentName.trim()}
            >
              {createSession.isPending ? 'Creating...' : 'Create Session'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
