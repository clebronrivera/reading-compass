import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle, Check, X, MinusCircle } from 'lucide-react';
import { useUpdateSession } from '@/lib/api/sessions';
import { useUpsertSessionResponse } from '@/lib/api/sessionResponses';
import type { SessionRow, ItemRow } from '@/types/database';

interface PhonemeSegmentRunnerProps {
  session: SessionRow;
  items: ItemRow[];
}

interface ItemPayload {
  word?: string;
  stimulus?: string;
  phonemes?: string[];
  phoneme_count?: number;
  count?: number;
}

export function PhonemeSegmentRunner({ session, items }: PhonemeSegmentRunnerProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();

  const [currentIndex, setCurrentIndex] = useState(session.current_item_index || 0);
  const [responses, setResponses] = useState<Record<number, { isCorrect: boolean | null; notes: string }>>({});

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const payload = currentItem?.content_payload as ItemPayload | undefined;

  // Get word and expected phoneme count
  const word = payload?.word || payload?.stimulus || '';
  const expectedCount = payload?.phoneme_count || payload?.count || payload?.phonemes?.length || 0;

  // Current response state
  const currentResponse = responses[currentIndex] || { isCorrect: null, notes: '' };

  // Computed scores
  const scores = useMemo(() => {
    const answered = Object.values(responses).filter(r => r.isCorrect !== null);
    const correct = answered.filter(r => r.isCorrect === true).length;
    const incorrect = answered.filter(r => r.isCorrect === false).length;
    const accuracy = answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0;
    
    return { total: answered.length, correct, incorrect, accuracy };
  }, [responses]);

  const handleResponse = useCallback((isCorrect: boolean | null) => {
    setResponses(prev => ({
      ...prev,
      [currentIndex]: { ...currentResponse, isCorrect }
    }));
  }, [currentIndex, currentResponse]);

  const handleNotesChange = useCallback((notes: string) => {
    setResponses(prev => ({
      ...prev,
      [currentIndex]: { ...currentResponse, notes }
    }));
  }, [currentIndex, currentResponse]);

  const saveCurrentResponse = useCallback(async () => {
    if (currentResponse.isCorrect === null) return;

    await upsertResponse.mutateAsync({
      session_id: session.session_id,
      item_id: currentItem.item_id,
      sequence_number: currentItem.sequence_number,
      is_correct: currentResponse.isCorrect,
      notes: currentResponse.notes || null,
    });
  }, [currentItem, currentResponse, session.session_id, upsertResponse]);

  const handleNext = useCallback(async () => {
    await saveCurrentResponse();
    
    if (currentIndex < totalItems - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: { current_item_index: nextIndex }
      });
    }
  }, [currentIndex, totalItems, saveCurrentResponse, session.session_id, updateSession]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleFinish = useCallback(async () => {
    await saveCurrentResponse();

    await updateSession.mutateAsync({
      id: session.session_id,
      updates: {
        status: 'completed',
        completed_at: new Date().toISOString(),
      }
    });

    navigate('/sessions');
  }, [saveCurrentResponse, session.session_id, updateSession, navigate]);

  const canProceed = currentResponse.isCorrect !== null;

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
                <h1 className="text-xl font-semibold">Phoneme Segmentation</h1>
                <p className="text-sm text-muted-foreground">
                  {session.student_name} • {session.grade_tag || session.form_id}
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              Item {currentIndex + 1} of {totalItems}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Assessor View */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Assessor Prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">Say to student:</p>
                  <p className="text-4xl font-bold">"{word}"</p>
                  <p className="text-muted-foreground mt-4">
                    Expected phonemes: <span className="font-semibold">{expectedCount}</span>
                  </p>
                  {payload?.phonemes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ({payload.phonemes.join(' - ')})
                    </p>
                  )}
                </div>

                <div className="border-t pt-6">
                  <p className="text-center text-muted-foreground mb-4">
                    Did the student correctly segment the word?
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button
                      size="lg"
                      variant={currentResponse.isCorrect === true ? 'default' : 'outline'}
                      className={currentResponse.isCorrect === true ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => handleResponse(true)}
                    >
                      <Check className="h-5 w-5 mr-2" />
                      Correct
                    </Button>
                    <Button
                      size="lg"
                      variant={currentResponse.isCorrect === false ? 'default' : 'outline'}
                      className={currentResponse.isCorrect === false ? 'bg-red-600 hover:bg-red-700' : ''}
                      onClick={() => handleResponse(false)}
                    >
                      <X className="h-5 w-5 mr-2" />
                      Incorrect
                    </Button>
                    <Button
                      size="lg"
                      variant={currentResponse.isCorrect === null && responses[currentIndex] ? 'default' : 'outline'}
                      className="bg-muted"
                      onClick={() => handleResponse(null)}
                    >
                      <MinusCircle className="h-5 w-5 mr-2" />
                      No Response
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={currentResponse.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Optional notes about this response..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scores Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Completed</dt>
                    <dd className="text-2xl font-bold">{scores.total}/{totalItems}</dd>
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

            {/* Navigation */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentIndex === 0}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {currentIndex < totalItems - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="flex-1"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={!canProceed || upsertResponse.isPending}
                  className="flex-1 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Finish
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
