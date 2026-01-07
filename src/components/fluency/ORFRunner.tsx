import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { PassageDisplay } from './PassageDisplay';
import { AssessorControls } from './AssessorControls';
import { ScoringPanel } from './ScoringPanel';
import { useUpdateSession } from '@/lib/api/sessions';
import { useUpsertORFResponse } from '@/lib/api/orfResponses';
import { 
  type TokenState, 
  type FontSize, 
  type DiscontinueReason,
  type ORFComputedScores,
  getNextTokenState,
  computeORFScores,
} from '@/types/orf';
import type { SessionRow, ItemRow } from '@/types/database';

const TIMER_DURATION = 60; // 60 seconds

interface ORFRunnerProps {
  session: SessionRow;
  item: ItemRow;
  wordTokens: string[];
}

export function ORFRunner({ session, item, wordTokens }: ORFRunnerProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const upsertORFResponse = useUpsertORFResponse();

  // Token states
  const [tokenStates, setTokenStates] = useState<Record<number, TokenState>>({});
  
  // Timer state
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'completed' | 'discontinued'>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(TIMER_DURATION);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // UI state
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [discontinueReason, setDiscontinueReason] = useState<DiscontinueReason | ''>('');
  const [notes, setNotes] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Computed scores
  const scores = computeORFScores(tokenStates, elapsedSeconds, wordTokens.length);

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

  // Handle token click
  const handleTokenClick = useCallback((index: number) => {
    if (timerState !== 'running') return;
    
    setTokenStates((prev) => ({
      ...prev,
      [index]: getNextTokenState(prev[index] || 'unmarked'),
    }));
  }, [timerState]);

  // Timer controls
  const handleStart = useCallback(() => {
    setTimerState('running');
    // Mark session as in_progress if it was created
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
    setTokenStates({});
    setTimerState('idle');
    setRemainingSeconds(TIMER_DURATION);
    setElapsedSeconds(0);
    setDiscontinueReason('');
    setNotes('');
  }, []);

  // Save and finish
  const handleFinish = useCallback(async () => {
    const isDiscontinued = timerState === 'discontinued';
    
    // Require discontinue reason if stopped early
    if (isDiscontinued && !discontinueReason) {
      return;
    }

    // Save ORF response
    await upsertORFResponse.mutateAsync({
      session_id: session.session_id,
      item_id: item.item_id,
      sequence_number: item.sequence_number,
      is_correct: scores.accuracy_percentage >= 90, // Consider 90%+ as "correct"
      token_state_map: tokenStates,
      elapsed_seconds: elapsedSeconds,
      discontinue_flag: isDiscontinued,
      discontinue_reason: isDiscontinued ? discontinueReason : undefined,
      computed_scores: scores,
      notes: notes || undefined,
    });

    // Mark session as completed
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
    tokenStates, 
    elapsedSeconds, 
    scores, 
    notes, 
    session, 
    item, 
    upsertORFResponse, 
    updateSession, 
    navigate
  ]);

  const isComplete = timerState === 'completed' || timerState === 'discontinued';
  const canFinish = isComplete && (timerState !== 'discontinued' || !!discontinueReason);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/sessions')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Oral Reading Fluency</h1>
                <p className="text-sm text-muted-foreground">
                  {session.student_name} • {session.grade_tag || session.form_id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1.5">
                {isOnline ? (
                  <><Wifi className="h-3 w-3" /> Online</>
                ) : (
                  <><WifiOff className="h-3 w-3" /> Offline</>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Passage Display - Takes 2/3 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Reading Passage</span>
                  <Badge variant="secondary">{wordTokens.length} words</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PassageDisplay
                  tokens={wordTokens}
                  tokenStates={tokenStates}
                  onTokenClick={handleTokenClick}
                  disabled={timerState !== 'running'}
                  fontSize={fontSize}
                  onFontSizeChange={setFontSize}
                />
              </CardContent>
            </Card>
          </div>

          {/* Controls Panel - Takes 1/3 */}
          <div className="space-y-6">
            <AssessorControls
              timerState={timerState}
              remainingSeconds={remainingSeconds}
              totalSeconds={TIMER_DURATION}
              onStart={handleStart}
              onStop={handleStop}
              onReset={handleReset}
              discontinueReason={discontinueReason}
              onDiscontinueReasonChange={setDiscontinueReason}
              notes={notes}
              onNotesChange={setNotes}
            />

            <ScoringPanel scores={scores} isComplete={isComplete} />

            {/* Finish Button */}
            {isComplete && (
              <Button 
                onClick={handleFinish} 
                disabled={!canFinish || upsertORFResponse.isPending}
                size="lg" 
                className="w-full gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {upsertORFResponse.isPending ? 'Saving...' : 'Finish Session'}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
