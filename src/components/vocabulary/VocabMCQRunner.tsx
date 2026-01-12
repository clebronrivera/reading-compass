import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle, Check, X } from 'lucide-react';
import { useUpdateSession } from '@/lib/api/sessions';
import { useUpsertSessionResponse } from '@/lib/api/sessionResponses';
import type { SessionRow, ItemRow } from '@/types/database';

interface VocabMCQRunnerProps {
  session: SessionRow;
  items: ItemRow[];
}

interface ItemPayload {
  question?: string;
  stimulus?: string;
  context_sentence?: string;
  target_word?: string;
  options?: string[];
  choices?: string[];
  correct_answer?: string;
}

export function VocabMCQRunner({ session, items }: VocabMCQRunnerProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();

  const [currentIndex, setCurrentIndex] = useState(session.current_item_index || 0);
  const [responses, setResponses] = useState<Record<number, { selectedOption: string | null; notes: string }>>({});

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const payload = currentItem?.content_payload as ItemPayload | undefined;

  // Extract question content
  const question = payload?.question || payload?.context_sentence || payload?.stimulus || '';
  const targetWord = payload?.target_word || '';
  const options = payload?.options || payload?.choices || [];
  const correctAnswer = payload?.correct_answer || '';

  // Current response state
  const currentResponse = responses[currentIndex] || { selectedOption: null, notes: '' };
  const isCorrect = currentResponse.selectedOption === correctAnswer;

  // Computed scores
  const scores = useMemo(() => {
    const answered = Object.entries(responses).filter(([, r]) => r.selectedOption !== null);
    const correct = answered.filter(([idx, r]) => {
      const item = items[parseInt(idx)];
      const itemPayload = item?.content_payload as ItemPayload | undefined;
      return r.selectedOption === itemPayload?.correct_answer;
    }).length;
    const accuracy = answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0;
    
    return { total: answered.length, correct, incorrect: answered.length - correct, accuracy };
  }, [responses, items]);

  const handleOptionSelect = useCallback((option: string) => {
    setResponses(prev => ({
      ...prev,
      [currentIndex]: { ...currentResponse, selectedOption: option }
    }));
  }, [currentIndex, currentResponse]);

  const handleNotesChange = useCallback((notes: string) => {
    setResponses(prev => ({
      ...prev,
      [currentIndex]: { ...currentResponse, notes }
    }));
  }, [currentIndex, currentResponse]);

  const saveCurrentResponse = useCallback(async () => {
    if (currentResponse.selectedOption === null) return;

    await upsertResponse.mutateAsync({
      session_id: session.session_id,
      item_id: currentItem.item_id,
      sequence_number: currentItem.sequence_number,
      is_correct: isCorrect,
      notes: currentResponse.notes || null,
    });
  }, [currentItem, currentResponse, isCorrect, session.session_id, upsertResponse]);

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

  const canProceed = currentResponse.selectedOption !== null;

  const getOptionStyle = (option: string) => {
    const isSelected = currentResponse.selectedOption === option;
    const showResult = isSelected;
    
    if (showResult && option === correctAnswer) {
      return 'border-green-500 bg-green-50 text-green-700';
    }
    if (showResult && option !== correctAnswer) {
      return 'border-red-500 bg-red-50 text-red-700';
    }
    if (isSelected) {
      return 'border-primary bg-primary/10';
    }
    return 'border-border hover:border-primary/50 hover:bg-muted';
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
                <h1 className="text-xl font-semibold">Vocabulary Assessment</h1>
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
          {/* Question Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Question</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Context/Question */}
                <div className="text-center py-4">
                  <p className="text-xl">
                    {question.split(targetWord).map((part, idx, arr) => (
                      <span key={idx}>
                        {part}
                        {idx < arr.length - 1 && (
                          <span className="font-bold underline decoration-primary">{targetWord}</span>
                        )}
                      </span>
                    ))}
                  </p>
                  {targetWord && (
                    <p className="text-muted-foreground mt-2">
                      What does "<span className="font-semibold">{targetWord}</span>" mean?
                    </p>
                  )}
                </div>

                {/* Options */}
                <div className="grid gap-3">
                  {options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(option)}
                      className={`
                        w-full p-4 text-left border-2 rounded-lg transition-colors
                        flex items-center gap-3
                        ${getOptionStyle(option)}
                      `}
                    >
                      <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {currentResponse.selectedOption === option && (
                        option === correctAnswer ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )
                      )}
                    </button>
                  ))}
                </div>

                {/* Result indicator */}
                {currentResponse.selectedOption && (
                  <div className={`p-3 rounded-lg text-center ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isCorrect ? 'Correct!' : `Incorrect. Correct answer: ${correctAnswer}`}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={currentResponse.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Optional notes..."
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
