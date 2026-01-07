import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUpdateSession } from '@/lib/api/sessions';
import { useUpsertSessionResponse, useSessionResponses } from '@/lib/api/sessionResponses';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type StudentResponse = 'yes' | 'no' | 'no_response';
type ResponseState = 'correct' | 'incorrect' | 'no_response';
type ErrorType = 'false_positive' | 'false_negative' | 'no_response' | null;

interface RhymeContent {
  word_a: string;
  word_b: string;
  is_rhyme: boolean;
  rime_pattern?: string | null;
  item_id?: string;
}

interface RhymeRunnerProps {
  session: Tables<'sessions'>;
  items: Tables<'items'>[];
}

export function RhymeRunner({ session, items }: RhymeRunnerProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();
  const { data: responses } = useSessionResponses(session.session_id);

  const [currentIndex, setCurrentIndex] = useState(session.current_item_index);
  const [studentResponse, setStudentResponse] = useState<StudentResponse | null>(null);
  const [notes, setNotes] = useState('');
  const [discontinueDialogOpen, setDiscontinueDialogOpen] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [assessorNotes, setAssessorNotes] = useState('');

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const content = currentItem?.content_payload as unknown as RhymeContent;

  // Compute response state and error type from student response
  const computeResponseData = useCallback((response: StudentResponse, isRhyme: boolean): { responseState: ResponseState; errorType: ErrorType } => {
    if (response === 'no_response') {
      return { responseState: 'no_response', errorType: 'no_response' };
    }
    
    if (isRhyme) {
      if (response === 'yes') {
        return { responseState: 'correct', errorType: null };
      } else {
        return { responseState: 'incorrect', errorType: 'false_negative' };
      }
    } else {
      if (response === 'no') {
        return { responseState: 'correct', errorType: null };
      } else {
        return { responseState: 'incorrect', errorType: 'false_positive' };
      }
    }
  }, []);

  // Compute scores
  const computeScores = useCallback(() => {
    if (!responses) return { total_correct: 0, total_presented: 0, false_positive_count: 0, false_negative_count: 0, accuracy_pct: 0 };
    
    const total_correct = responses.filter(r => r.is_correct === true).length;
    const total_presented = responses.length;
    const false_positive_count = responses.filter(r => r.error_tags?.includes('false_positive')).length;
    const false_negative_count = responses.filter(r => r.error_tags?.includes('false_negative')).length;
    const accuracy_pct = total_presented > 0 ? total_correct / total_presented : 0;
    
    return { total_correct, total_presented, false_positive_count, false_negative_count, accuracy_pct };
  }, [responses]);

  // Load existing response for current item
  useEffect(() => {
    if (responses && currentItem) {
      const existing = responses.find(r => r.item_id === currentItem.item_id);
      if (existing) {
        // Reconstruct student response from stored data
        if (existing.is_correct === true) {
          const isRhyme = (currentItem.content_payload as unknown as RhymeContent)?.is_rhyme;
          setStudentResponse(isRhyme ? 'yes' : 'no');
        } else if (existing.error_tags?.includes('no_response')) {
          setStudentResponse('no_response');
        } else if (existing.error_tags?.includes('false_positive')) {
          setStudentResponse('yes');
        } else if (existing.error_tags?.includes('false_negative')) {
          setStudentResponse('no');
        }
        setNotes(existing.notes || '');
      } else {
        setStudentResponse(null);
        setNotes('');
      }
    }
  }, [responses, currentItem]);

  // Sync current index with session
  useEffect(() => {
    setCurrentIndex(session.current_item_index);
  }, [session.current_item_index]);

  const handleSave = useCallback(async () => {
    if (!currentItem || studentResponse === null) {
      toast.error('Please select a response');
      return false;
    }

    const isRhyme = content?.is_rhyme ?? false;
    const { responseState, errorType } = computeResponseData(studentResponse, isRhyme);
    const isCorrect = responseState === 'correct';
    const errorTags: string[] = errorType ? [errorType] : [];

    await upsertResponse.mutateAsync({
      session_id: session.session_id,
      item_id: currentItem.item_id,
      sequence_number: currentItem.sequence_number,
      is_correct: isCorrect,
      error_tags: errorTags,
      notes: notes.trim() || null,
      computed_scores: computeScores(),
    });

    return true;
  }, [currentItem, studentResponse, content, computeResponseData, notes, session.session_id, upsertResponse, computeScores]);

  const handleNext = async () => {
    const saved = await handleSave();
    if (!saved) return;
    
    if (currentIndex < totalItems - 1) {
      const newIndex = currentIndex + 1;
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: { current_item_index: newIndex }
      });
      setCurrentIndex(newIndex);
      setStudentResponse(null);
      setNotes('');
    }
  };

  const handleBack = async () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: { current_item_index: newIndex }
      });
      setCurrentIndex(newIndex);
    }
  };

  const handleFinish = async () => {
    const saved = await handleSave();
    if (!saved) return;

    await updateSession.mutateAsync({
      id: session.session_id,
      updates: { 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }
    });
    toast.success('Session completed!');
    navigate('/sessions');
  };

  const handleDiscontinue = async () => {
    if (!discontinueReason.trim() || !assessorNotes.trim()) {
      toast.error('Both discontinue reason and assessor notes are required');
      return;
    }

    if (studentResponse !== null && currentItem) {
      await handleSave();
    }

    await upsertResponse.mutateAsync({
      session_id: session.session_id,
      item_id: currentItem?.item_id || items[0].item_id,
      sequence_number: currentItem?.sequence_number || 1,
      is_correct: false,
      discontinue_flag: true,
      discontinue_reason: discontinueReason,
      notes: assessorNotes,
      computed_scores: computeScores(),
    });

    await updateSession.mutateAsync({
      id: session.session_id,
      updates: { 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }
    });

    toast.success('Session discontinued');
    navigate('/sessions');
  };

  const scores = computeScores();

  // Get response state display for current selection
  const getResponseFeedback = () => {
    if (studentResponse === null) return null;
    const isRhyme = content?.is_rhyme ?? false;
    const { responseState, errorType } = computeResponseData(studentResponse, isRhyme);
    
    if (responseState === 'correct') {
      return <Badge className="bg-green-600">Correct</Badge>;
    } else if (responseState === 'incorrect') {
      return <Badge variant="destructive">{errorType === 'false_positive' ? 'False Positive' : 'False Negative'}</Badge>;
    }
    return <Badge variant="secondary">No Response</Badge>;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/sessions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Rhyme Recognition: {session.student_name}
            </h1>
            <p className="text-sm text-muted-foreground">Form: {session.form_id}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {currentIndex + 1} / {totalItems}
        </Badge>
      </div>

      {/* Assessor Prompt Card */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Word Pair</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-6xl font-bold tracking-wider">
              <span className="text-primary">{content?.word_a}</span>
              <span className="text-muted-foreground mx-6">–</span>
              <span className="text-primary">{content?.word_b}</span>
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {content?.is_rhyme ? (
                <Badge variant="secondary">Rhyme ({content.rime_pattern})</Badge>
              ) : (
                <Badge variant="outline">Non-Rhyme</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Buttons */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Student Response</CardTitle>
            {getResponseFeedback()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              variant={studentResponse === 'yes' ? 'default' : 'outline'}
              size="lg"
              onClick={() => setStudentResponse('yes')}
              className={studentResponse === 'yes' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <Check className="h-5 w-5 mr-2" />
              Yes (Rhymes)
            </Button>
            <Button
              variant={studentResponse === 'no' ? 'default' : 'outline'}
              size="lg"
              onClick={() => setStudentResponse('no')}
              className={studentResponse === 'no' ? 'bg-slate-600 hover:bg-slate-700' : ''}
            >
              <X className="h-5 w-5 mr-2" />
              No (Doesn't Rhyme)
            </Button>
            <Button
              variant={studentResponse === 'no_response' ? 'default' : 'outline'}
              size="lg"
              onClick={() => setStudentResponse('no_response')}
              className={studentResponse === 'no_response' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              <AlertCircle className="h-5 w-5 mr-2" />
              No Response
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <p className="text-sm text-muted-foreground text-center italic">
            If no response after ~3 seconds, mark "No Response" and move on
          </p>
        </CardContent>
      </Card>

      {/* Live Scores */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{scores.total_correct}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{scores.total_presented}</p>
              <p className="text-sm text-muted-foreground">Presented</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{scores.false_positive_count}</p>
              <p className="text-sm text-muted-foreground">False +</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{scores.false_negative_count}</p>
              <p className="text-sm text-muted-foreground">False -</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {(scores.accuracy_pct * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button
          variant="destructive"
          onClick={() => setDiscontinueDialogOpen(true)}
        >
          Discontinue
        </Button>

        <div className="flex gap-2">
          {currentIndex < totalItems - 1 ? (
            <Button onClick={handleNext} disabled={studentResponse === null}>
              Save & Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={studentResponse === null}>
              Finish Session
            </Button>
          )}
        </div>
      </div>

      {/* Discontinue Dialog */}
      <AlertDialog open={discontinueDialogOpen} onOpenChange={setDiscontinueDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discontinue Session</AlertDialogTitle>
            <AlertDialogDescription>
              You must provide a reason and notes when discontinuing a session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="discontinue-reason">Reason *</Label>
              <Select value={discontinueReason} onValueChange={setDiscontinueReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student requested to stop">Student requested to stop</SelectItem>
                  <SelectItem value="Student struggling significantly">Student struggling significantly</SelectItem>
                  <SelectItem value="Environmental interruption">Environmental interruption</SelectItem>
                  <SelectItem value="Stimulus delivery failure">Stimulus delivery failure</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessor-notes">Assessor Notes *</Label>
              <Textarea
                id="assessor-notes"
                value={assessorNotes}
                onChange={(e) => setAssessorNotes(e.target.value)}
                placeholder="Required notes explaining the discontinuation..."
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscontinue}
              disabled={!discontinueReason || !assessorNotes.trim()}
            >
              Confirm Discontinue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
