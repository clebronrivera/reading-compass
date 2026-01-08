import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, Circle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUpdateSession } from '@/lib/api/sessions';
import { useSessionResponses, useUpsertSessionResponse } from '@/lib/api/sessionResponses';
import { toast } from 'sonner';
import type { SessionRow, ItemRow } from '@/types/database';

interface LetterWordRunnerProps {
  session: SessionRow;
  items: ItemRow[];
}

interface LetterWordItemContent {
  item_id?: string;
  grade_band?: string;
  stimulus_type?: string;
  text?: string;
  stimulus?: string;
  difficulty_band?: string;
  orthographic_pattern?: string | null;
}

type ResponseState = 'correct' | 'incorrect' | 'no_response';
type ErrorType = 'misidentification' | 'substitution' | 'omission' | 'no_response' | null;

export function LetterWordRunner({ session, items }: LetterWordRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(session.current_item_index ?? 0);
  const [responseState, setResponseState] = useState<ResponseState | null>(null);
  const [studentResponseText, setStudentResponseText] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [notes, setNotes] = useState('');
  const [discontinueFlag, setDiscontinueFlag] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');

  const { data: responses, refetch: refetchResponses } = useSessionResponses(session.session_id);
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const isConnected = !!session && items.length > 0;

  // Extract content from item
  const getItemContent = (item: ItemRow): LetterWordItemContent => {
    return (item?.content_payload as LetterWordItemContent) || {};
  };

  const content = getItemContent(currentItem);
  const stimulus = content.text || content.stimulus || '';
  const stimulusType = content.stimulus_type || 'word';
  const gradeBand = content.grade_band || '';
  const difficultyBand = content.difficulty_band || 'medium';
  const orthographicPattern = content.orthographic_pattern;

  // Load existing response for current item
  useEffect(() => {
    if (responses && currentItem) {
      const existing = responses.find(r => r.item_id === currentItem.item_id);
      if (existing) {
        const computedScores = existing.computed_scores as Record<string, unknown> || {};
        const storedState = computedScores.response_state as ResponseState;
        const storedErrorType = computedScores.error_type as ErrorType;
        const storedText = computedScores.student_response_text as string;
        
        setResponseState(storedState || (existing.is_correct === true ? 'correct' : existing.is_correct === false ? 'incorrect' : null));
        setErrorType(storedErrorType || null);
        setStudentResponseText(storedText || '');
        setNotes(existing.notes || '');
        setDiscontinueFlag(existing.discontinue_flag || false);
        setDiscontinueReason(existing.discontinue_reason || '');
      } else {
        resetForm();
      }
    }
  }, [responses, currentItem]);

  const resetForm = () => {
    setResponseState(null);
    setStudentResponseText('');
    setErrorType(null);
    setNotes('');
    setDiscontinueFlag(false);
    setDiscontinueReason('');
  };

  const handleResponseState = (state: ResponseState) => {
    setResponseState(state);
    
    if (state === 'no_response') {
      setErrorType('no_response');
    } else if (state === 'correct') {
      setErrorType(null);
    } else {
      if (errorType === 'no_response' || errorType === null) {
        setErrorType('misidentification');
      }
    }
  };

  const saveResponse = useCallback(async () => {
    if (!currentItem || responseState === null) {
      toast.error('Please mark the response');
      return false;
    }

    const computedScores = {
      response_state: responseState,
      student_response_text: studentResponseText || null,
      error_type: errorType,
      stimulus_type: stimulusType,
    } as const;

    try {
      await upsertResponse.mutateAsync({
        session_id: session.session_id,
        item_id: currentItem.item_id,
        sequence_number: currentItem.sequence_number,
        is_correct: responseState === 'correct',
        error_tags: errorType ? [errorType] : [],
        notes: notes.trim() || null,
        computed_scores: computedScores as unknown as import('@/integrations/supabase/types').Json,
        discontinue_flag: discontinueFlag,
        discontinue_reason: discontinueFlag ? discontinueReason : null,
      });

      await refetchResponses();
      return true;
    } catch (error) {
      toast.error('Failed to save response');
      return false;
    }
  }, [currentItem, responseState, studentResponseText, errorType, stimulusType, notes, discontinueFlag, discontinueReason, session.session_id, upsertResponse, refetchResponses]);

  const handleNext = async () => {
    const saved = await saveResponse();
    if (!saved) return;

    if (currentIndex < totalItems - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: { current_item_index: nextIndex }
      });
      
      resetForm();
    }
  };

  const handleBack = async () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: { current_item_index: prevIndex }
      });
    }
  };

  const handleFinish = async () => {
    const saved = await saveResponse();
    if (!saved) return;

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
    if (!discontinueReason.trim()) {
      toast.error('Discontinue reason is required');
      return;
    }

    setDiscontinueFlag(true);
    await saveResponse();

    await updateSession.mutateAsync({
      id: session.session_id,
      updates: { 
        status: 'discontinued', 
        completed_at: new Date().toISOString() 
      }
    });
    toast.success('Session discontinued');
  };

  // Calculate letter/word correct counts from responses
  const letterCorrect = responses?.filter(r => {
    const c = r.computed_scores as Record<string, unknown> || {};
    return c.stimulus_type === 'letter' && c.response_state === 'correct';
  }).length || 0;

  const wordCorrect = responses?.filter(r => {
    const c = r.computed_scores as Record<string, unknown> || {};
    return c.stimulus_type === 'word' && c.response_state === 'correct';
  }).length || 0;

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
              Letter-Word ID: {session.student_name}
            </h1>
            <p className="text-sm text-muted-foreground">Form: {session.form_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Letters: <span className="font-medium text-foreground">{letterCorrect}</span> | 
            Words: <span className="font-medium text-foreground">{wordCorrect}</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className={`h-3 w-3 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-muted text-muted'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Loading...'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="text-center">
        <span className="text-2xl font-bold">Item {currentIndex + 1} of {totalItems}</span>
      </div>

      {/* Student Stimulus Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Stimulus</span>
            <Badge variant={stimulusType === 'letter' ? 'secondary' : 'default'}>
              {stimulusType === 'letter' ? 'Letter' : 'Word'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className={`font-bold text-foreground ${stimulusType === 'letter' ? 'text-9xl' : 'text-7xl'}`}>
              {stimulus}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Assessor Context Panel */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Item Details (Assessor Only)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Grade Band:</span>
              <p className="font-medium">{gradeBand}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <p className="font-medium capitalize">{stimulusType}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Difficulty:</span>
              <p className="font-medium capitalize">{difficultyBand}</p>
            </div>
            {orthographicPattern && (
              <div>
                <span className="text-muted-foreground">Pattern:</span>
                <p className="font-medium">{orthographicPattern.replace(/_/g, ' ')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scoring Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Response Scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Response State Buttons */}
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
              className={responseState === 'no_response' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              <Circle className="h-5 w-5 mr-2" />
              No Response
            </Button>
          </div>

          {/* Error Type (show when incorrect) */}
          {responseState === 'incorrect' && (
            <div className="space-y-2">
              <Label>Error Type</Label>
              <Select 
                value={errorType || ''} 
                onValueChange={(v) => setErrorType(v as ErrorType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select error type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="misidentification">Misidentification</SelectItem>
                  <SelectItem value="substitution">Substitution</SelectItem>
                  <SelectItem value="omission">Omission</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Student Response Text (optional) */}
          <div className="space-y-2">
            <Label htmlFor="response-text">Student Response (optional)</Label>
            <Textarea
              id="response-text"
              value={studentResponseText}
              onChange={(e) => setStudentResponseText(e.target.value)}
              placeholder="What the student said (for miscue tracking)..."
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Assessor Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this response..."
              rows={2}
            />
          </div>

          {/* Discontinue Section */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <Label>Discontinue Session</Label>
            </div>
            <Textarea
              value={discontinueReason}
              onChange={(e) => setDiscontinueReason(e.target.value)}
              placeholder="Required reason for discontinuation..."
              rows={2}
            />
            <Button 
              variant="destructive" 
              className="mt-2"
              onClick={handleDiscontinue}
              disabled={!discontinueReason.trim()}
            >
              Discontinue Session
            </Button>
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
