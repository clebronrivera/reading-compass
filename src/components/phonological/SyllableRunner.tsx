import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, MinusCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUpdateSession } from '@/lib/api/sessions';
import { useUpsertSessionResponse, useSessionResponses } from '@/lib/api/sessionResponses';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'>;
type Item = Tables<'items'>;

interface SyllableItemContent {
  prompt_word?: string;
  syllable_count?: number;
  syllable_targets?: string[];
  syllable_pattern?: string;
  position?: number;
}

interface SyllableRunnerProps {
  session: Session;
  items: Item[];
}

type ResponseState = 'correct' | 'incorrect' | 'no_response';
type ErrorType = 'incorrect_segmentation' | 'partial_segmentation' | 'no_response' | null;

export function SyllableRunner({ session, items }: SyllableRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(session.current_item_index ?? 0);
  const [responseState, setResponseState] = useState<ResponseState | null>(null);
  const [syllablesCorrect, setSyllablesCorrect] = useState<number>(0);
  const [studentResponseText, setStudentResponseText] = useState('');
  const [notes, setNotes] = useState('');
  const [discontinueDialogOpen, setDiscontinueDialogOpen] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [discontinueNotes, setDiscontinueNotes] = useState('');

  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();
  const { data: responses } = useSessionResponses(session.session_id);

  const currentItem = items[currentIndex];
  const content = currentItem?.content_payload as unknown as SyllableItemContent;
  const syllableCount = content?.syllable_count || 1;
  const syllableTargets = content?.syllable_targets || [];
  const totalItems = items.length;

  // Load existing response for current item
  useEffect(() => {
    if (responses && currentItem) {
      const existing = responses.find(r => r.item_id === currentItem.item_id);
      if (existing) {
        const computedScores = existing.computed_scores as { response_state?: string; syllables_correct?: number; student_response_text?: string } | null;
        if (computedScores?.response_state) {
          setResponseState(computedScores.response_state as ResponseState);
          setSyllablesCorrect(computedScores.syllables_correct ?? 0);
          setStudentResponseText(computedScores.student_response_text || '');
        } else {
          setResponseState(existing.is_correct === true ? 'correct' : existing.is_correct === false ? 'incorrect' : null);
          setSyllablesCorrect(0);
        }
        setNotes(existing.notes || '');
      } else {
        setResponseState(null);
        setSyllablesCorrect(0);
        setStudentResponseText('');
        setNotes('');
      }
    }
  }, [responses, currentItem]);

  // Sync currentIndex with session
  useEffect(() => {
    setCurrentIndex(session.current_item_index ?? 0);
  }, [session.current_item_index]);

  // Compute error type based on response state and syllables correct
  const computeErrorType = (state: ResponseState, syllCorrect: number): ErrorType => {
    if (state === 'no_response') return 'no_response';
    if (state === 'correct') return null;
    if (state === 'incorrect') {
      if (syllCorrect > 0 && syllCorrect < syllableCount) return 'partial_segmentation';
      return 'incorrect_segmentation';
    }
    return null;
  };

  const handleResponseState = (state: ResponseState) => {
    setResponseState(state);
    if (state === 'correct') {
      setSyllablesCorrect(syllableCount);
    } else if (state === 'no_response') {
      setSyllablesCorrect(0);
    }
    // For incorrect, keep current syllablesCorrect or reset to 0
    if (state === 'incorrect' && syllablesCorrect >= syllableCount) {
      setSyllablesCorrect(0);
    }
  };

  const handleSave = useCallback(async () => {
    if (!currentItem || responseState === null) {
      toast.error('Please mark the response');
      return;
    }

    const errorType = computeErrorType(responseState, syllablesCorrect);

    await upsertResponse.mutateAsync({
      session_id: session.session_id,
      item_id: currentItem.item_id,
      sequence_number: currentItem.sequence_number,
      is_correct: responseState === 'correct',
      error_tags: errorType ? [errorType] : [],
      notes: notes.trim() || null,
      computed_scores: {
        response_state: responseState,
        syllables_correct: responseState === 'correct' ? syllableCount : syllablesCorrect,
        student_response_text: studentResponseText,
        error_type: errorType,
      },
    });
  }, [currentItem, responseState, syllablesCorrect, studentResponseText, notes, session.session_id, syllableCount, upsertResponse]);

  const handleNext = async () => {
    await handleSave();
    
    if (currentIndex < totalItems - 1) {
      const newIndex = currentIndex + 1;
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: { current_item_index: newIndex }
      });
      setCurrentIndex(newIndex);
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
    await handleSave();
    
    await updateSession.mutateAsync({
      id: session.session_id,
      updates: { 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }
    });
    toast.success('Session completed!');
  };

  const handleDiscontinue = async () => {
    if (!discontinueReason.trim() || !discontinueNotes.trim()) {
      toast.error('Both reason and notes are required for discontinue');
      return;
    }

    // Save discontinue info to current response
    if (currentItem) {
      await upsertResponse.mutateAsync({
        session_id: session.session_id,
        item_id: currentItem.item_id,
        sequence_number: currentItem.sequence_number,
        is_correct: false,
        discontinue_flag: true,
        discontinue_reason: discontinueReason,
        notes: discontinueNotes,
        computed_scores: {
          response_state: 'no_response',
          syllables_correct: 0,
          error_type: 'no_response',
        },
      });
    }

    await updateSession.mutateAsync({
      id: session.session_id,
      updates: { 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }
    });

    setDiscontinueDialogOpen(false);
    toast.success('Session discontinued');
  };

  return (
    <div className="space-y-6">
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
              Syllable Segmentation: {session.student_name}
            </h1>
            <p className="text-sm text-muted-foreground">Form: {session.form_id}</p>
          </div>
        </div>
        <Dialog open={discontinueDialogOpen} onOpenChange={setDiscontinueDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-destructive border-destructive">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Discontinue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discontinue Session</DialogTitle>
              <DialogDescription>
                Both reason and notes are required to discontinue.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={discontinueReason} onValueChange={setDiscontinueReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student_distress">Student Distress</SelectItem>
                    <SelectItem value="external_interruption">External Interruption</SelectItem>
                    <SelectItem value="technical_issue">Technical Issue</SelectItem>
                    <SelectItem value="time_constraint">Time Constraint</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (required)</Label>
                <Textarea
                  value={discontinueNotes}
                  onChange={(e) => setDiscontinueNotes(e.target.value)}
                  placeholder="Provide details about the discontinuation..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDiscontinueDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDiscontinue}
                disabled={!discontinueReason || !discontinueNotes.trim()}
              >
                Confirm Discontinue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress */}
      <div className="text-center">
        <span className="text-2xl font-bold">Item {currentIndex + 1} of {totalItems}</span>
      </div>

      {/* Stimulus Display (Assessor only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Say to Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-5xl font-bold text-foreground mb-4">
              "{content?.prompt_word || 'No word'}"
            </p>
            <p className="text-lg text-muted-foreground">
              Expected: {syllableTargets.join(' – ')} ({syllableCount} syllable{syllableCount !== 1 ? 's' : ''})
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Response Capture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Response buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              variant={responseState === 'correct' ? 'default' : 'outline'}
              size="lg"
              onClick={() => handleResponseState('correct')}
              className={responseState === 'correct' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <Check className="h-5 w-5 mr-2" />
              Correct
            </Button>
            <Button
              variant={responseState === 'incorrect' ? 'default' : 'outline'}
              size="lg"
              onClick={() => handleResponseState('incorrect')}
              className={responseState === 'incorrect' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <X className="h-5 w-5 mr-2" />
              Incorrect
            </Button>
            <Button
              variant={responseState === 'no_response' ? 'default' : 'outline'}
              size="lg"
              onClick={() => handleResponseState('no_response')}
              className={responseState === 'no_response' ? 'bg-muted-foreground hover:bg-muted-foreground/80' : ''}
            >
              <MinusCircle className="h-5 w-5 mr-2" />
              No Response
            </Button>
          </div>

          {/* Syllables correct (show when incorrect) */}
          {responseState === 'incorrect' && (
            <div className="space-y-2">
              <Label>Syllables Correct (0-{syllableCount})</Label>
              <div className="flex gap-2 justify-center">
                {Array.from({ length: syllableCount + 1 }, (_, i) => (
                  <Button
                    key={i}
                    variant={syllablesCorrect === i ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSyllablesCorrect(i)}
                  >
                    {i}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Student response text (optional) */}
          <div className="space-y-2">
            <Label htmlFor="studentResponse">Student Response (optional)</Label>
            <Input
              id="studentResponse"
              value={studentResponseText}
              onChange={(e) => setStudentResponseText(e.target.value)}
              placeholder="What the student said..."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this response..."
              rows={2}
            />
          </div>

          {/* Hint */}
          <p className="text-sm text-muted-foreground text-center">
            If no response after ~3 seconds, mark "No Response"
          </p>
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
    </div>
  );
}
