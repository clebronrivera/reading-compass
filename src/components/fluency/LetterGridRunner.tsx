import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle, Wifi, WifiOff, Play, Square, RotateCcw } from 'lucide-react';
import { useUpdateSession } from '@/lib/api/sessions';
import { useUpsertSessionResponse } from '@/lib/api/sessionResponses';
import type { SessionRow, ItemRow } from '@/types/database';

const TIMER_DURATION = 60;

type LetterState = 'unmarked' | 'correct' | 'incorrect';

interface LetterGridRunnerProps {
  session: SessionRow;
  items: ItemRow[];
}

export function LetterGridRunner({ session, items }: LetterGridRunnerProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();

  // Extract letters from items
  const letters = useMemo(() => 
    items.map(item => (item.content_payload as { stimulus?: string })?.stimulus || '?'),
    [items]
  );

  // Letter states
  const [letterStates, setLetterStates] = useState<Record<number, LetterState>>({});
  
  // Timer state
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'completed' | 'discontinued'>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(TIMER_DURATION);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // UI state
  const [gridSize, setGridSize] = useState<'10' | '5'>('10');
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Computed scores
  const scores = useMemo(() => {
    const total = Object.keys(letterStates).length;
    const correct = Object.values(letterStates).filter(s => s === 'correct').length;
    const incorrect = Object.values(letterStates).filter(s => s === 'incorrect').length;
    const lpm = elapsedSeconds > 0 ? Math.round((correct / elapsedSeconds) * 60) : 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    return { total, correct, incorrect, lpm, accuracy };
  }, [letterStates, elapsedSeconds]);

  // Online status tracking
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

  // Handle letter click - cycle through states
  const handleLetterClick = useCallback((index: number) => {
    if (timerState !== 'running') return;
    
    setLetterStates((prev) => {
      const current = prev[index] || 'unmarked';
      const next: LetterState = 
        current === 'unmarked' ? 'correct' :
        current === 'correct' ? 'incorrect' : 'unmarked';
      
      return { ...prev, [index]: next };
    });
  }, [timerState]);

  // Timer controls
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
    setLetterStates({});
    setTimerState('idle');
    setRemainingSeconds(TIMER_DURATION);
    setElapsedSeconds(0);
    setDiscontinueReason('');
    setNotes('');
  }, []);

  // Save and finish
  const handleFinish = useCallback(async () => {
    const isDiscontinued = timerState === 'discontinued';
    
    if (isDiscontinued && !discontinueReason) {
      return;
    }

    // Save response for each marked letter
    for (let i = 0; i < items.length; i++) {
      const state = letterStates[i];
      if (state) {
        await upsertResponse.mutateAsync({
          session_id: session.session_id,
          item_id: items[i].item_id,
          sequence_number: items[i].sequence_number,
          is_correct: state === 'correct',
          elapsed_seconds: elapsedSeconds,
          notes: i === 0 ? notes : undefined,
          computed_scores: i === 0 ? scores : undefined,
          discontinue_flag: i === 0 ? isDiscontinued : undefined,
          discontinue_reason: i === 0 && isDiscontinued ? discontinueReason : undefined,
        });
      }
    }

    await updateSession.mutateAsync({
      id: session.session_id,
      updates: {
        status: 'completed',
        completed_at: new Date().toISOString(),
      }
    });

    navigate('/sessions');
  }, [
    timerState, 
    discontinueReason, 
    letterStates, 
    elapsedSeconds, 
    scores, 
    notes, 
    session, 
    items, 
    upsertResponse, 
    updateSession, 
    navigate
  ]);

  const isComplete = timerState === 'completed' || timerState === 'discontinued';
  const canFinish = isComplete && (timerState !== 'discontinued' || !!discontinueReason);

  const getLetterStyle = (state: LetterState | undefined) => {
    switch (state) {
      case 'correct': return 'bg-green-100 border-green-500 text-green-700';
      case 'incorrect': return 'bg-red-100 border-red-500 text-red-700';
      default: return 'bg-background border-border hover:bg-muted';
    }
  };

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
                <h1 className="text-xl font-semibold">Letter Naming Fluency</h1>
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
          {/* Letter Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Letter Grid</span>
                  <div className="flex items-center gap-2">
                    <Select value={gridSize} onValueChange={(v: '10' | '5') => setGridSize(v)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 x 10</SelectItem>
                        <SelectItem value="5">5 x 20</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">{letters.length} letters</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                >
                  {letters.map((letter, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleLetterClick(idx)}
                      disabled={timerState !== 'running'}
                      className={`
                        aspect-square flex items-center justify-center
                        text-2xl font-bold border-2 rounded-lg transition-colors
                        ${getLetterStyle(letterStates[idx])}
                        ${timerState !== 'running' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                      `}
                    >
                      {letter}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-4 justify-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-border bg-background" />
                    <span>Unmarked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-100" />
                    <span>Correct</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-100" />
                    <span>Incorrect</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Panel */}
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
                    <dt className="text-muted-foreground">LPM</dt>
                    <dd className="text-2xl font-bold">{scores.lpm}</dd>
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

            {/* Finish Button */}
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
