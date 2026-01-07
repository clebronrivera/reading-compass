import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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

type ResponseState = 'correct' | 'incorrect' | 'no_response';
type ErrorType = 'incorrect_blend' | 'partial_blend' | 'no_response' | null;

interface OnsetRimeContent {
  onset: string;
  rime: string;
  target_word: string;
  phoneme_pattern?: string;
  item_id?: string;
}

interface OnsetRimeRunnerProps {
  session: Tables<'sessions'>;
  items: Tables<'items'>[];
}

export function OnsetRimeRunner({ session, items }: OnsetRimeRunnerProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();
  const { data: responses } = useSessionResponses(session.session_id);

  const [currentIndex, setCurrentIndex] = useState(session.current_item_index);
  const [responseState, setResponseState] = useState<ResponseState | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [studentResponse, setStudentResponse] = useState('');
  const [notes, setNotes] = useState('');
  const [showTargetWord, setShowTargetWord] = useState(false);
  const [discontinueDialogOpen, setDiscontinueDialogOpen] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [assessorNotes, setAssessorNotes] = useState('');

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const content = currentItem?.content_payload as unknown as OnsetRimeContent;

  // Compute scores
  const computeScores = useCallback(() => {
    if (!responses) return { total_correct: 0, total_presented: 0, no_response_count: 0, accuracy_pct: 0 };
    
    const total_correct = responses.filter(r => r.is_correct === true).length;
    const total_presented = responses.length;
    const no_response_count = responses.filter(r => 
      (r.error_tags?.includes('no_response'))
    ).length;
    const accuracy_pct = total_presented > 0 ? total_correct / total_presented : 0;
    
    return { total_correct, total_presented, no_response_count, accuracy_pct };
  }, [responses]);

  // Load existing response for current item
  useEffect(() => {
    if (responses && currentItem) {
      const existing = responses.find(r => r.item_id === currentItem.item_id);
      if (existing) {
        if (existing.is_correct === true) setResponseState('correct');
        else if (existing.is_correct === false) {
          if (existing.error_tags?.includes('no_response')) setResponseState('no_response');
          else setResponseState('incorrect');
        }
        setNotes(existing.notes || '');
        // Extract error type from error_tags
        const et = existing.error_tags?.find(t => ['incorrect_blend', 'partial_blend', 'no_response'].includes(t));
        setErrorType((et as ErrorType) || null);
      } else {
        setResponseState(null);
        setErrorType(null);
        setStudentResponse('');
        setNotes('');
      }
    }
  }, [responses, currentItem]);

  // Sync current index with session
  useEffect(() => {
    setCurrentIndex(session.current_item_index);
  }, [session.current_item_index]);

  const handleSave = useCallback(async () => {
    if (!currentItem || responseState === null) {
      toast.error('Please select a response');
      return false;
    }

    const isCorrect = responseState === 'correct';
    const errorTags: string[] = [];
    if (responseState === 'no_response') {
      errorTags.push('no_response');
    } else if (responseState === 'incorrect' && errorType) {
      errorTags.push(errorType);
    }

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
  }, [currentItem, responseState, errorType, notes, session.session_id, upsertResponse, computeScores]);

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
      setResponseState(null);
      setErrorType(null);
      setStudentResponse('');
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

    // Save current response if any
    if (responseState !== null && currentItem) {
      await handleSave();
    }

    // Mark session as discontinued
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
              Onset-Rime Blending: {session.student_name}
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
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Assessor Prompt</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-target" className="text-sm text-muted-foreground">
                Show target (admin)
              </Label>
              <Switch 
                id="show-target"
                checked={showTargetWord}
                onCheckedChange={setShowTargetWord}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-6xl font-bold tracking-wider">
              <span className="text-primary">{content?.onset}</span>
              <span className="text-muted-foreground mx-4">...</span>
              <span className="text-primary">{content?.rime}</span>
            </p>
            {showTargetWord && (
              <p className="mt-4 text-2xl text-muted-foreground">
                Target: <span className="font-semibold">{content?.target_word}</span>
              </p>
            )}
            {content?.phoneme_pattern && (
              <Badge variant="secondary" className="mt-4">
                {content.phoneme_pattern}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Response Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Student Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              variant={responseState === 'correct' ? 'default' : 'outline'}
              size="lg"
              onClick={() => { setResponseState('correct'); setErrorType(null); }}
              className={responseState === 'correct' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <Check className="h-5 w-5 mr-2" />
              Correct
            </Button>
            <Button
              variant={responseState === 'incorrect' ? 'default' : 'outline'}
              size="lg"
              onClick={() => setResponseState('incorrect')}
              className={responseState === 'incorrect' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <X className="h-5 w-5 mr-2" />
              Incorrect
            </Button>
            <Button
              variant={responseState === 'no_response' ? 'default' : 'outline'}
              size="lg"
              onClick={() => { setResponseState('no_response'); setErrorType('no_response'); }}
              className={responseState === 'no_response' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              <AlertCircle className="h-5 w-5 mr-2" />
              No Response
            </Button>
          </div>

          {/* Error Type Dropdown */}
          {responseState === 'incorrect' && (
            <div className="flex justify-center">
              <div className="w-64 space-y-2">
                <Label>Error Type</Label>
                <Select value={errorType || ''} onValueChange={(v) => setErrorType(v as ErrorType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select error type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incorrect_blend">Incorrect Blend</SelectItem>
                    <SelectItem value="partial_blend">Partial Blend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Student Response (optional) */}
          <div className="space-y-2">
            <Label htmlFor="student-response">Student Response (optional)</Label>
            <Textarea
              id="student-response"
              value={studentResponse}
              onChange={(e) => setStudentResponse(e.target.value)}
              placeholder="What did the student say?"
              rows={2}
            />
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

          {/* Hint */}
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
              <p className="text-2xl font-bold text-amber-600">{scores.no_response_count}</p>
              <p className="text-sm text-muted-foreground">No Response</p>
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
            <Button onClick={handleNext} disabled={responseState === null}>
              Save & Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={responseState === null}>
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
