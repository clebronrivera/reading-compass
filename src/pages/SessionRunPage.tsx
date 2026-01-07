import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, Clock, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { useSession, useUpdateSession } from '@/lib/api/sessions';
import { useSessionResponses, useUpsertSessionResponse } from '@/lib/api/sessionResponses';
import { useItemsByForm } from '@/lib/api/items';
import { isValidRouteId } from '@/lib/routeValidation';
import { toast } from 'sonner';
import type { ItemContent } from '@/types/database';
import { ORFRunner } from '@/components/fluency/ORFRunner';
import { OnsetRimeRunner } from '@/components/phonological/OnsetRimeRunner';
import { RhymeRunner } from '@/components/phonological/RhymeRunner';
import { SyllableRunner } from '@/components/phonological/SyllableRunner';
import type { ORFPassageContent } from '@/types/orf';

export default function SessionRunPage() {
  const { id } = useParams<{ id: string }>();
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [selectedErrorTags, setSelectedErrorTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const { data: session, isLoading: sessionLoading, error: sessionError, refetch: refetchSession } = useSession(id || '');
  const { data: items, isLoading: itemsLoading, error: itemsError } = useItemsByForm(session?.form_id || '');
  const { data: responses } = useSessionResponses(id || '');
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();

  const currentIndex = session?.current_item_index ?? 0;
  const currentItem = items?.[currentIndex];
  const totalItems = items?.length ?? 0;
  const isConnected = !!session && !!items;

  // Detect ORF session and extract word tokens (must be before any early returns)
  const isORFSession = session?.assessment_id === 'FL-ORF';
  const passageContent = currentItem?.content_payload as unknown as ORFPassageContent | undefined;
  const wordTokens = useMemo(() => {
    if (!passageContent) return [];
    // Use existing word_tokens if available, otherwise tokenize from stimulus/text
    if (passageContent.word_tokens?.length) {
      return passageContent.word_tokens;
    }
    const text = passageContent.stimulus || (passageContent as unknown as ItemContent)?.text || '';
    return text.split(/\s+/).filter(Boolean);
  }, [passageContent]);

  // Get error types from item content
  const errorTypes = currentItem 
    ? (currentItem.content_payload as ItemContent)?.error_types || currentItem.scoring_tags || []
    : [];

  // Load existing response for current item
  useEffect(() => {
    if (responses && currentItem) {
      const existing = responses.find(r => r.item_id === currentItem.item_id);
      if (existing) {
        setIsCorrect(existing.is_correct);
        setSelectedErrorTags(existing.error_tags || []);
        setNotes(existing.notes || '');
      } else {
        setIsCorrect(null);
        setSelectedErrorTags([]);
        setNotes('');
      }
    }
  }, [responses, currentItem]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedMs(prev => prev + 100);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Start session on first load if not started
  useEffect(() => {
    if (session && session.status === 'created' && !session.started_at) {
      updateSession.mutate({
        id: session.session_id,
        updates: { status: 'in_progress', started_at: new Date().toISOString() }
      });
    }
  }, [session]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSave = useCallback(async () => {
    if (!session || !currentItem || isCorrect === null) {
      toast.error('Please mark the response as correct or incorrect');
      return;
    }

    await upsertResponse.mutateAsync({
      session_id: session.session_id,
      item_id: currentItem.item_id,
      sequence_number: currentItem.sequence_number,
      is_correct: isCorrect,
      error_tags: selectedErrorTags,
      response_time_ms: elapsedMs,
      notes: notes.trim() || null,
    });

    // Reset timer for next item
    setTimerRunning(false);
    setElapsedMs(0);
  }, [session, currentItem, isCorrect, selectedErrorTags, elapsedMs, notes, upsertResponse]);

  const handleNext = async () => {
    await handleSave();
    
    if (currentIndex < totalItems - 1 && session) {
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: { current_item_index: currentIndex + 1 }
      });
    }
  };

  const handleBack = async () => {
    if (currentIndex > 0 && session) {
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: { current_item_index: currentIndex - 1 }
      });
    }
  };

  const handleFinish = async () => {
    await handleSave();
    
    if (session) {
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: { 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        }
      });
      toast.success('Session completed!');
    }
  };

  const toggleErrorTag = (tag: string) => {
    setSelectedErrorTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (!id || !isValidRouteId(id)) {
    return <ErrorState title="Invalid session ID" />;
  }

  if (sessionLoading || itemsLoading) {
    return <LoadingState title="Loading session..." />;
  }

  if (sessionError || itemsError) {
    return <ErrorState title="Failed to load session" error={sessionError || itemsError} onRetry={refetchSession} />;
  }

  if (!session) {
    return <ErrorState title="Session not found" />;
  }

  if (!items || items.length === 0) {
    return <ErrorState title="No items found for this form" />;
  }

  // Route to ORF Runner for FL-ORF sessions with word tokens
  if (isORFSession && wordTokens.length > 0 && currentItem && session) {
    return (
      <ORFRunner 
        session={session} 
        item={currentItem} 
        wordTokens={wordTokens} 
      />
    );
  }

  // Route to Onset-Rime Runner for PA-OONS sessions
  if (session?.assessment_id === 'PA-OONS' && items) {
    return (
      <OnsetRimeRunner 
        session={session} 
        items={items} 
      />
    );
  }

  // Route to Rhyme Runner for PA-RHYM sessions
  if (session?.assessment_id === 'PA-RHYM' && items) {
    return (
      <RhymeRunner 
        session={session} 
        items={items} 
      />
    );
  }

  // Route to Syllable Runner for PA-SYLS sessions
  if (session?.assessment_id === 'PA-SYLS' && items) {
    return (
      <SyllableRunner 
        session={session} 
        items={items} 
      />
    );
  }

  const content = currentItem?.content_payload as ItemContent;

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
              Session: {session.student_name}
            </h1>
            <p className="text-sm text-muted-foreground">Form: {session.form_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Circle className={`h-3 w-3 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-muted text-muted'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="text-center">
        <span className="text-2xl font-bold">Item {currentIndex + 1} of {totalItems}</span>
      </div>

      {/* Item Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stimulus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-4xl font-bold">{content?.stimulus || content?.text || 'No stimulus'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Correct/Incorrect buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              variant={isCorrect === true ? 'default' : 'outline'}
              size="lg"
              onClick={() => setIsCorrect(true)}
              className={isCorrect === true ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <Check className="h-5 w-5 mr-2" />
              Correct
            </Button>
            <Button
              variant={isCorrect === false ? 'default' : 'outline'}
              size="lg"
              onClick={() => setIsCorrect(false)}
              className={isCorrect === false ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <X className="h-5 w-5 mr-2" />
              Incorrect
            </Button>
          </div>

          {/* Error tags (show when incorrect) */}
          {isCorrect === false && errorTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Error Tags</Label>
              <div className="flex flex-wrap gap-3">
                {errorTypes.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={tag}
                      checked={selectedErrorTags.includes(tag)}
                      onCheckedChange={() => toggleErrorTag(tag)}
                    />
                    <Label htmlFor={tag} className="text-sm">{tag}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this response..."
              rows={3}
            />
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-mono">{formatTime(elapsedMs)}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimerRunning(!timerRunning)}
              >
                {timerRunning ? 'Stop' : 'Start'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setElapsedMs(0); setTimerRunning(false); }}
              >
                Reset
              </Button>
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

        <div className="flex gap-2">
          {currentIndex < totalItems - 1 ? (
            <Button onClick={handleNext} disabled={isCorrect === null}>
              Save & Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={isCorrect === null}>
              Finish Session
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
