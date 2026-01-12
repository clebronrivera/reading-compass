import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle, Wifi, WifiOff, Play, Square, RotateCcw, Check, X } from 'lucide-react';
import { useUpdateSession } from '@/lib/api/sessions';
import { useUpsertSessionResponse } from '@/lib/api/sessionResponses';
import type { SessionRow, ItemRow } from '@/types/database';

const TIMER_DURATION = 60;

interface WordReadingRunnerProps {
  session: SessionRow;
  items: ItemRow[];
}

export function WordReadingRunner({ session, items }: WordReadingRunnerProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, boolean>>({});
  
  // Timer state
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'completed' | 'discontinued'>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(TIMER_DURATION);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // UI state
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const currentItem = items[currentIndex];
  const currentWord = (currentItem?.content_payload as { stimulus?: string })?.stimulus || '';
  const totalItems = items.length;

  // Computed scores
  const scores = useMemo(() => {
    const answered = Object.keys(responses).length;
    const correct = Object.values(responses).filter(Boolean).length;
    const incorrect = answered - correct;
    const wpm = elapsedSeconds > 0 ? Math.round((correct / elapsedSeconds) * 60) : 0;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    
    return { answered, correct, incorrect, wpm, accuracy };
  }, [responses, elapsedSeconds]);

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timerState !== 'running') return;
    
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setTimerState('completed');
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState]);

  const handleResponse = useCallback((isCorrect: boolean) => {
    if (timerState !== 'running') return;
    
    setResponses(prev => ({ ...prev, [currentIndex]: isCorrect }));
    
    // Auto-advance to next word
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setTimerState('completed');
    }
  }, [timerState, currentIndex, totalItems]);

  const handleStart = useCallback(() => {
    setTimerState('running');
    if (session.status === 'created') {
      updateSession.mutate({
        id: session.session_id,
        updates: {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        }
      });
    }
  }, [session, updateSession]);

  const handleStop = useCallback(() => {
    setTimerState('discontinued');
  }, []);

  const handleReset = useCallback(() => {
    setResponses({});
    setCurrentIndex(0);
    setTimerState('idle');
    setRemainingSeconds(TIMER_DURATION);
    setElapsedSeconds(0);
    setDiscontinueReason('');
    setNotes('');
  }, []);

  const handleFinish = useCallback(async () => {
    const isDiscontinued = timerState === 'discontinued';
    
    if (isDiscontinued && !discontinueReason) return;

    // Save all responses
    for (const [idx, isCorrect] of Object.entries(responses)) {
      const item = items[parseInt(idx)];
      await upsertResponse.mutateAsync({
        session_id: session.session_id,
        item_id: item.item_id,
        sequence_number: item.sequence_number,
        is_correct: isCorrect,
        elapsed_seconds: elapsedSeconds,
        notes: parseInt(idx) === 0 ? notes : undefined,
        computed_scores: parseInt(idx) === 0 ? scores : undefined,
        discontinue_flag: parseInt(idx) === 0 ? isDiscontinued : undefined,
        discontinue_reason: parseInt(idx) === 0 && isDiscontinued ? discontinueReason : undefined,
      });
    }

    await updateSession.mutateAsync({
      id: session.session_id,
      updates: {
        status: 'completed',
        completed_at: new Date().toISOString(),
      }
    });

    navigate('/sessions');
  }, [timerState, discontinueReason, responses, elapsedSeconds, scores, notes, session, items, upsertResponse, updateSession, navigate]);

  const isComplete = timerState === 'completed' || timerState === 'discontinued';
  const canFinish = isComplete && (timerState !== 'discontinued' || !!discontinueReason);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/sessions')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Word Reading Fluency</h1>
                <p className="text-sm text-muted-foreground">
                  {session.student_name} • {session.grade_tag || session.form_id}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5">
              {isOnline ? <><Wifi className="h-3 w-3" /> Online</> : <><WifiOff className="h-3 w-3" /> Offline</>}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Word Display */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Word</span>
                  <Badge variant="secondary">
                    Word {currentIndex + 1} of {totalItems}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-12">
                  <p className="text-7xl font-bold">{currentWord}</p>
                </div>

                {timerState === 'running' && (
                  <div className="flex justify-center gap-4">
                    <Button
                      size="lg"
                      className="px-12 py-6 text-xl bg-green-600 hover:bg-green-700"
                      onClick={() => handleResponse(true)}
                    >
                      <Check className="h-6 w-6 mr-2" />
                      Correct
                    </Button>
                    <Button
                      size="lg"
                      variant="destructive"
                      className="px-12 py-6 text-xl"
                      onClick={() => handleResponse(false)}
                    >
                      <X className="h-6 w-6 mr-2" />
                      Incorrect
                    </Button>
                  </div>
                )}

                {/* Previous words */}
                {Object.keys(responses).length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Previous words:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(responses).slice(-10).map(([idx, correct]) => {
                        const item = items[parseInt(idx)];
                        const word = (item?.content_payload as { stimulus?: string })?.stimulus || '';
                        return (
                          <Badge 
                            key={idx} 
                            variant={correct ? 'default' : 'destructive'}
                            className={correct ? 'bg-green-600' : ''}
                          >
                            {word}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Timer */}
            <Card>
              <CardHeader>
                <CardTitle>Timer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <span className={`text-5xl font-mono ${remainingSeconds <= 10 ? 'text-destructive' : ''}`}>
                    {remainingSeconds}s
                  </span>
                </div>
                <div className="flex gap-2">
                  {timerState === 'idle' && (
                    <Button onClick={handleStart} className="flex-1 gap-2">
                      <Play className="h-4 w-4" /> Start
                    </Button>
                  )}
                  {timerState === 'running' && (
                    <Button onClick={handleStop} variant="destructive" className="flex-1 gap-2">
                      <Square className="h-4 w-4" /> Stop
                    </Button>
                  )}
                  {isComplete && (
                    <Button onClick={handleReset} variant="outline" className="flex-1 gap-2">
                      <RotateCcw className="h-4 w-4" /> Reset
                    </Button>
                  )}
                </div>

                {timerState === 'discontinued' && (
                  <div className="space-y-2">
                    <Label>Discontinue Reason (required)</Label>
                    <Select value={discontinueReason} onValueChange={setDiscontinueReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student_refused">Student Refused</SelectItem>
                        <SelectItem value="student_distressed">Student Distressed</SelectItem>
                        <SelectItem value="technical_issue">Technical Issue</SelectItem>
                        <SelectItem value="time_constraint">Time Constraint</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scores */}
            <Card>
              <CardHeader>
                <CardTitle>{isComplete ? 'Final Scores' : 'Live Scores'}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">WPM</dt>
                    <dd className="text-2xl font-bold">{scores.wpm}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Accuracy</dt>
                    <dd className="text-2xl font-bold">{scores.accuracy}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Correct</dt>
                    <dd className="text-lg font-semibold text-green-600">{scores.correct}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Incorrect</dt>
                    <dd className="text-lg font-semibold text-red-600">{scores.incorrect}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Finish */}
            {isComplete && (
              <Button 
                onClick={handleFinish} 
                disabled={!canFinish || upsertResponse.isPending}
                size="lg" 
                className="w-full gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {upsertResponse.isPending ? 'Saving...' : 'Finish Session'}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
