import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Check, 
  X, 
  Volume2,
  Image as ImageIcon,
  Mic
} from 'lucide-react';
import { useUpdateSession } from '@/lib/api/sessions';
import { useUpsertSessionResponse } from '@/lib/api/sessionResponses';
import { scoreAndPersistSession } from '@/lib/scoring';
import type { SessionRow, ItemRow } from '@/types/database';

interface PictureVocabRunnerProps {
  session: SessionRow;
  items: ItemRow[];
}

// VO-RPVT: 4 images, student selects one based on spoken prompt
interface RPVTPayload {
  prompt_word?: string;
  stimulus?: string;
  images?: string[];
  image_urls?: string[];
  options?: Array<{ option_id: string; image_url: string; label?: string }>;
  correct_answer?: string;
  correct_option_id?: string;
  semantic_category?: string;
}

// VO-EPVT: Single image, student names it orally
interface EPVTPayload {
  image_url?: string;
  stimulus_image?: string;
  target_word?: string;
  acceptable_responses?: string[];
  semantic_category?: string;
}

type ItemPayload = RPVTPayload | EPVTPayload;

export function PictureVocabRunner({ session, items }: PictureVocabRunnerProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();

  const isExpressive = session.assessment_id === 'VO-EPVT';
  const isReceptive = session.assessment_id === 'VO-RPVT';

  const [currentIndex, setCurrentIndex] = useState(session.current_item_index || 0);
  const [responses, setResponses] = useState<Record<number, { 
    selectedOption: string | null; 
    isCorrect: boolean | null;
    notes: string 
  }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const payload = currentItem?.content_payload as unknown as ItemPayload | undefined;

  // Current response state
  const currentResponse = responses[currentIndex] || { selectedOption: null, isCorrect: null, notes: '' };

  // Computed scores
  const scores = useMemo(() => {
    const answered = Object.entries(responses).filter(([, r]) => r.isCorrect !== null);
    const correct = answered.filter(([, r]) => r.isCorrect === true).length;
    const accuracy = answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0;
    
    return { total: answered.length, correct, incorrect: answered.length - correct, accuracy };
  }, [responses]);

  // ---------------------------------------------------------------------------
  // RPVT: Image selection handlers
  // ---------------------------------------------------------------------------
  const handleImageSelect = useCallback((optionId: string) => {
    if (!isReceptive) return;
    
    const rpvtPayload = payload as RPVTPayload;
    const correctId = rpvtPayload?.correct_option_id || rpvtPayload?.correct_answer;
    const isCorrect = optionId === correctId;
    
    setResponses(prev => ({
      ...prev,
      [currentIndex]: { selectedOption: optionId, isCorrect, notes: currentResponse.notes }
    }));
  }, [currentIndex, currentResponse.notes, isReceptive, payload]);

  // ---------------------------------------------------------------------------
  // EPVT: Correct/Incorrect marking handlers
  // ---------------------------------------------------------------------------
  const handleMarkCorrect = useCallback((correct: boolean) => {
    if (!isExpressive) return;
    
    setResponses(prev => ({
      ...prev,
      [currentIndex]: { selectedOption: correct ? 'correct' : 'incorrect', isCorrect: correct, notes: currentResponse.notes }
    }));
  }, [currentIndex, currentResponse.notes, isExpressive]);

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
      error_tags: [],
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
    setIsSubmitting(true);
    try {
      await saveCurrentResponse();

      await updateSession.mutateAsync({
        id: session.session_id,
        updates: {
          status: 'completed',
          completed_at: new Date().toISOString(),
        }
      });

      await scoreAndPersistSession(session.session_id);
      navigate(`/sessions/${session.session_id}/report`);
    } finally {
      setIsSubmitting(false);
    }
  }, [saveCurrentResponse, session.session_id, updateSession, navigate]);

  const canProceed = currentResponse.isCorrect !== null;

  // ---------------------------------------------------------------------------
  // RPVT Rendering (4 image selection)
  // ---------------------------------------------------------------------------
  const renderReceptiveContent = () => {
    const rpvtPayload = payload as RPVTPayload;
    const promptWord = rpvtPayload?.prompt_word || rpvtPayload?.stimulus || '';
    const correctId = rpvtPayload?.correct_option_id || rpvtPayload?.correct_answer;
    
    // Get images from various possible payload structures
    const imageOptions = rpvtPayload?.options || 
      (rpvtPayload?.images || rpvtPayload?.image_urls || []).map((url, idx) => ({
        option_id: String.fromCharCode(65 + idx), // A, B, C, D
        image_url: url,
        label: String.fromCharCode(65 + idx)
      }));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            Prompt Word
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prompt word display for assessor */}
          <div className="text-center py-6 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Say to student:</p>
            <p className="text-3xl font-bold text-primary">"{promptWord}"</p>
            {rpvtPayload?.semantic_category && (
              <Badge variant="outline" className="mt-3">{rpvtPayload.semantic_category}</Badge>
            )}
          </div>

          {/* 4 Image options */}
          <div className="grid grid-cols-2 gap-4">
            {imageOptions.map((option) => {
              const isSelected = currentResponse.selectedOption === option.option_id;
              const isCorrect = option.option_id === correctId;
              const showResult = isSelected;
              
              return (
                <button
                  key={option.option_id}
                  onClick={() => handleImageSelect(option.option_id)}
                  className={`
                    relative aspect-square border-4 rounded-xl overflow-hidden transition-all
                    ${isSelected 
                      ? isCorrect 
                        ? 'border-green-500 ring-4 ring-green-200' 
                        : 'border-red-500 ring-4 ring-red-200'
                      : 'border-muted hover:border-primary/50'
                    }
                  `}
                >
                  {option.image_url ? (
                    <img 
                      src={option.image_url} 
                      alt={`Option ${option.option_id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Option label */}
                  <div className={`
                    absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center font-bold
                    ${isSelected 
                      ? isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      : 'bg-background/90 text-foreground'
                    }
                  `}>
                    {option.option_id}
                  </div>

                  {/* Result indicator */}
                  {showResult && (
                    <div className={`absolute bottom-2 right-2 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                      {isCorrect 
                        ? <Check className="h-8 w-8 bg-white rounded-full p-1" />
                        : <X className="h-8 w-8 bg-white rounded-full p-1" />
                      }
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Result message */}
          {currentResponse.selectedOption && (
            <div className={`p-3 rounded-lg text-center font-medium ${
              currentResponse.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {currentResponse.isCorrect ? 'Correct!' : `Incorrect. Correct answer: ${correctId}`}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ---------------------------------------------------------------------------
  // EPVT Rendering (single image + correct/incorrect)
  // ---------------------------------------------------------------------------
  const renderExpressiveContent = () => {
    const epvtPayload = payload as EPVTPayload;
    const imageUrl = epvtPayload?.image_url || epvtPayload?.stimulus_image;
    const targetWord = epvtPayload?.target_word;
    const acceptableResponses = epvtPayload?.acceptable_responses || [];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Picture Naming
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image display */}
          <div className="aspect-square max-w-md mx-auto border-4 border-muted rounded-xl overflow-hidden bg-muted">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Stimulus"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Target word (for assessor reference) */}
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Expected Response:</p>
            <p className="text-2xl font-bold">{targetWord || 'No target word'}</p>
            {acceptableResponses.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Also accept: {acceptableResponses.join(', ')}
              </p>
            )}
            {epvtPayload?.semantic_category && (
              <Badge variant="outline" className="mt-3">{epvtPayload.semantic_category}</Badge>
            )}
          </div>

          {/* Correct/Incorrect buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant={currentResponse.isCorrect === true ? 'default' : 'outline'}
              onClick={() => handleMarkCorrect(true)}
              className={`min-w-32 ${currentResponse.isCorrect === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              <Check className="h-5 w-5 mr-2" />
              Correct
            </Button>
            <Button
              size="lg"
              variant={currentResponse.isCorrect === false ? 'default' : 'outline'}
              onClick={() => handleMarkCorrect(false)}
              className={`min-w-32 ${currentResponse.isCorrect === false ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              <X className="h-5 w-5 mr-2" />
              Incorrect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
                <h1 className="text-xl font-semibold">
                  {isExpressive ? 'Expressive Picture Vocabulary' : 'Receptive Picture Vocabulary'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {session.student_name} • {session.grade_tag || session.form_id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge>{session.assessment_id}</Badge>
              <Badge variant="secondary">
                Item {currentIndex + 1} of {totalItems}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Content Area */}
          <div className="lg:col-span-2">
            {isReceptive && renderReceptiveContent()}
            {isExpressive && renderExpressiveContent()}

            {/* Notes */}
            <Card className="mt-4">
              <CardContent className="pt-4">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={currentResponse.notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Student response, articulation notes, etc..."
                  rows={2}
                  className="mt-2"
                />
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
                  disabled={!canProceed || isSubmitting}
                  className="flex-1 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {isSubmitting ? 'Saving...' : 'Finish'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PictureVocabRunner;
