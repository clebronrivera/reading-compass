import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  MessageSquare, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { useUpdateSession } from '@/lib/api/sessions';
import { useUpsertSessionResponse } from '@/lib/api/sessionResponses';
import { scoreAndPersistSession } from '@/lib/scoring';
import type { SessionRow, ItemRow } from '@/types/database';
import type { Json } from '@/integrations/supabase/types';

// ============================================================================
// Types
// ============================================================================

type ComprehensionPhase = 'read' | 'recall' | 'questions';

interface ComprehensionRunnerProps {
  session: SessionRow;
  items: ItemRow[];
}

interface PassagePayload {
  passage_id?: string;
  title?: string;
  text: string;
  sentences?: Array<{ sentence_id: string; text: string }>;
  sentence_count?: number;
  word_count?: number;
  grade_band?: string;
  genre?: string;
}

interface RecallUnitPayload {
  sentence_id: string;
  text: string;
}

interface MCQOption {
  option_id: string;
  text: string;
}

interface MCQPayload {
  item_id?: string;
  question_text?: string;
  question?: string;
  options: MCQOption[];
  correct_option_id?: string;
  correct_answer?: string;
  skill_tag?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ComprehensionRunner({ session, items }: ComprehensionRunnerProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const upsertResponse = useUpsertSessionResponse();

  // ---------------------------------------------------------------------------
  // Extract items by type
  // ---------------------------------------------------------------------------
  const passageItem = useMemo(() => 
    items.find(i => i.item_type === 'passage' || i.item_type === 'listening_passage'),
    [items]
  );

  const recallUnits = useMemo(() => 
    items.filter(i => i.item_type === 'recall_sentence_unit').sort((a, b) => a.sequence_number - b.sequence_number),
    [items]
  );

  const mcqItems = useMemo(() => 
    items.filter(i => i.item_type === 'mcq_item' || i.item_type === 'question' || i.item_type === 'multiple-choice').sort((a, b) => a.sequence_number - b.sequence_number),
    [items]
  );

  const passagePayload = passageItem?.content_payload as unknown as PassagePayload | undefined;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [phase, setPhase] = useState<ComprehensionPhase>('read');
  const [recallHits, setRecallHits] = useState<Record<string, boolean>>({});
  const [mcqResponses, setMcqResponses] = useState<Record<string, string>>({});
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [isDiscontinued, setIsDiscontinued] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscontinueModal, setShowDiscontinueModal] = useState(false);

  // ---------------------------------------------------------------------------
  // Scoring computation
  // ---------------------------------------------------------------------------
  const scores = useMemo(() => {
    const recallHitCount = Object.values(recallHits).filter(Boolean).length;
    const recallTotal = recallUnits.length;
    const recallAccuracy = recallTotal > 0 ? (recallHitCount / recallTotal) * 100 : 0;

    const mcqCorrect = mcqItems.filter(item => {
      const payload = item.content_payload as unknown as MCQPayload;
      const selected = mcqResponses[item.item_id];
      return selected === (payload.correct_option_id || payload.correct_answer);
    }).length;
    const mcqTotal = mcqItems.length;
    const mcqAccuracy = mcqTotal > 0 ? (mcqCorrect / mcqTotal) * 100 : 0;

    return {
      recall_hit_count: recallHitCount,
      recall_total: recallTotal,
      recall_accuracy: Math.round(recallAccuracy),
      mcq_correct: mcqCorrect,
      mcq_total: mcqTotal,
      mcq_accuracy: Math.round(mcqAccuracy),
      overall_accuracy: Math.round((recallAccuracy + mcqAccuracy) / 2),
    };
  }, [recallHits, mcqResponses, recallUnits, mcqItems]);

  // ---------------------------------------------------------------------------
  // Phase transitions
  // ---------------------------------------------------------------------------
  const handleBeginRecall = async () => {
    setPhase('recall');
    await updateSession.mutateAsync({
      id: session.session_id,
      updates: { status: 'in_progress' }
    });
  };

  const handleBackToRead = () => {
    setPhase('read');
  };

  const handleGoToQuestions = async () => {
    // Save recall responses
    for (const unit of recallUnits) {
      const unitPayload = unit.content_payload as unknown as RecallUnitPayload;
      await upsertResponse.mutateAsync({
        session_id: session.session_id,
        item_id: unit.item_id,
        sequence_number: unit.sequence_number,
        is_correct: recallHits[unitPayload.sentence_id] || false,
        error_tags: [],
        discontinue_flag: false,
      });
    }
    setPhase('questions');
  };

  // ---------------------------------------------------------------------------
  // Recall handlers
  // ---------------------------------------------------------------------------
  const toggleRecallHit = (sentenceId: string) => {
    setRecallHits(prev => ({
      ...prev,
      [sentenceId]: !prev[sentenceId]
    }));
  };

  // ---------------------------------------------------------------------------
  // MCQ handlers
  // ---------------------------------------------------------------------------
  const handleSelectOption = (itemId: string, optionId: string) => {
    setMcqResponses(prev => ({
      ...prev,
      [itemId]: optionId
    }));
  };

  const handleNextMcq = () => {
    if (currentMcqIndex < mcqItems.length - 1) {
      setCurrentMcqIndex(prev => prev + 1);
    }
  };

  const handlePrevMcq = () => {
    if (currentMcqIndex > 0) {
      setCurrentMcqIndex(prev => prev - 1);
    }
  };

  // ---------------------------------------------------------------------------
  // Finish session
  // ---------------------------------------------------------------------------
  const handleFinishSession = async () => {
    setIsSubmitting(true);
    try {
      // Save MCQ responses
      for (const item of mcqItems) {
        const payload = item.content_payload as unknown as MCQPayload;
        const selected = mcqResponses[item.item_id];
        const isCorrect = selected === (payload.correct_option_id || payload.correct_answer);
        
        await upsertResponse.mutateAsync({
          session_id: session.session_id,
          item_id: item.item_id,
          sequence_number: item.sequence_number,
          is_correct: isCorrect,
          error_tags: [],
          notes: null,
          discontinue_flag: false,
        });
      }

      // Save passage response with computed scores
      if (passageItem) {
        await upsertResponse.mutateAsync({
          session_id: session.session_id,
          item_id: passageItem.item_id,
          sequence_number: passageItem.sequence_number,
          is_correct: null,
          computed_scores: scores as unknown as Json,
          notes: notes || null,
          discontinue_flag: isDiscontinued,
          discontinue_reason: isDiscontinued ? discontinueReason : null,
          error_tags: [],
        });
      }

      // Update session status
      await updateSession.mutateAsync({
        id: session.session_id,
        updates: {
          status: 'completed',
          completed_at: new Date().toISOString(),
        }
      });

      // Score and persist
      await scoreAndPersistSession(session.session_id);

      // Navigate to report
      navigate(`/sessions/${session.session_id}/report`);
    } catch (error) {
      console.error('Error finishing session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Discontinue handler
  // ---------------------------------------------------------------------------
  const handleDiscontinue = async () => {
    if (!discontinueReason.trim()) return;
    
    setIsDiscontinued(true);
    setShowDiscontinueModal(false);
    
    // Save current state and finish
    await handleFinishSession();
  };

  // ---------------------------------------------------------------------------
  // Current MCQ item
  // ---------------------------------------------------------------------------
  const currentMcqItem = mcqItems[currentMcqIndex];
  const currentMcqPayload = currentMcqItem?.content_payload as unknown as MCQPayload | undefined;
  const currentSelectedOption = currentMcqItem ? mcqResponses[currentMcqItem.item_id] : undefined;

  // ---------------------------------------------------------------------------
  // Phase indicator
  // ---------------------------------------------------------------------------
  const PhaseIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        phase === 'read' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {phase !== 'read' ? <Check className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
        Read
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground" />

      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        phase === 'recall' ? 'bg-primary text-primary-foreground' : phase === 'questions' ? 'bg-muted text-muted-foreground' : 'bg-muted/50 text-muted-foreground/50'
      }`}>
        {phase === 'questions' ? <Check className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        Recall
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground" />

      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        phase === 'questions' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground/50'
      }`}>
        <HelpCircle className="h-4 w-4" />
        Questions
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Read Phase
  // ---------------------------------------------------------------------------
  const renderReadPhase = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {passagePayload?.title || 'Reading Passage'}
            </CardTitle>
            {passagePayload?.genre && (
              <Badge variant="secondary">{passagePayload.genre}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg leading-relaxed whitespace-pre-wrap">
                {passagePayload?.text || 'No passage content available.'}
              </p>
            </div>
          </ScrollArea>
          {passagePayload?.word_count && (
            <p className="text-sm text-muted-foreground mt-2">
              Word count: {passagePayload.word_count}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button size="lg" onClick={handleBeginRecall}>
          Begin Recall
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Recall Phase
  // ---------------------------------------------------------------------------
  const renderRecallPhase = () => {
    // Use sentences from payload or create from recall units
    const sentences = passagePayload?.sentences || recallUnits.map(unit => {
      const payload = unit.content_payload as unknown as RecallUnitPayload;
      return { sentence_id: payload.sentence_id, text: payload.text };
    });

    return (
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recall Checklist
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Mark each sentence the student recalls correctly.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {sentences.map((sentence, index) => (
                    <div
                      key={sentence.sentence_id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        recallHits[sentence.sentence_id] ? 'bg-green-50 border-green-200' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={sentence.sentence_id}
                        checked={recallHits[sentence.sentence_id] || false}
                        onCheckedChange={() => toggleRecallHit(sentence.sentence_id)}
                        className="mt-1"
                      />
                      <label htmlFor={sentence.sentence_id} className="text-sm leading-relaxed cursor-pointer flex-1">
                        <span className="font-medium text-muted-foreground mr-2">{index + 1}.</span>
                        {sentence.text}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Recalled</span>
                  <span className="font-medium">{scores.recall_hit_count} / {scores.recall_total}</span>
                </div>
                <Progress value={scores.recall_total > 0 ? (scores.recall_hit_count / scores.recall_total) * 100 : 0} />
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold text-primary">{scores.recall_accuracy}%</span>
                <p className="text-sm text-muted-foreground">Recall Accuracy</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={handleBackToRead}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Passage
            </Button>
            <Button onClick={handleGoToQuestions}>
              Go to Questions
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Questions Phase
  // ---------------------------------------------------------------------------
  const renderQuestionsPhase = () => {
    const questionText = currentMcqPayload?.question_text || currentMcqPayload?.question || 'Question';
    const options = currentMcqPayload?.options || [];
    const correctOptionId = currentMcqPayload?.correct_option_id || currentMcqPayload?.correct_answer;

    return (
      <div className="grid md:grid-cols-2 gap-6">
        {/* Passage sidebar */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Passage Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {passagePayload?.text || 'No passage content available.'}
              </p>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* MCQ panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Question {currentMcqIndex + 1} of {mcqItems.length}
                </CardTitle>
                {currentMcqPayload?.skill_tag && (
                  <Badge variant="outline">{currentMcqPayload.skill_tag}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium text-lg">{questionText}</p>
              
              <div className="space-y-2">
                {options.map((option) => {
                  const isSelected = currentSelectedOption === option.option_id;
                  const isCorrect = option.option_id === correctOptionId;
                  const showResult = isSelected;
                  
                  return (
                    <button
                      key={option.option_id}
                      onClick={() => handleSelectOption(currentMcqItem.item_id, option.option_id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? isCorrect
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                          : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{option.option_id}.</span>
                          {option.text}
                        </span>
                        {showResult && (
                          isCorrect 
                            ? <Check className="h-5 w-5 text-green-600" />
                            : <X className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevMcq}
              disabled={currentMcqIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {currentMcqIndex < mcqItems.length - 1 ? (
              <Button onClick={handleNextMcq}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinishSession} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Finish Session'}
              </Button>
            )}
          </div>

          {/* Scores summary */}
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold">{scores.recall_hit_count}/{scores.recall_total}</p>
                  <p className="text-xs text-muted-foreground">Recall ({scores.recall_accuracy}%)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{scores.mcq_correct}/{scores.mcq_total}</p>
                  <p className="text-xs text-muted-foreground">MCQ ({scores.mcq_accuracy}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assessor Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any notes about the student's performance..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Discontinue */}
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => setShowDiscontinueModal(true)}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Discontinue Session
          </Button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Discontinue Modal
  // ---------------------------------------------------------------------------
  const renderDiscontinueModal = () => {
    if (!showDiscontinueModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Discontinue Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for discontinuing this session.
            </p>
            <Textarea
              placeholder="Reason for discontinuing..."
              value={discontinueReason}
              onChange={(e) => setDiscontinueReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDiscontinueModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDiscontinue}
                disabled={!discontinueReason.trim() || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Discontinue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------
  return (
    <div className="container max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reading Comprehension</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span>Student: {session.student_name}</span>
          {session.grade_tag && <span>Grade: {session.grade_tag}</span>}
          <Badge>{session.assessment_id}</Badge>
        </div>
      </div>

      {/* Phase indicator */}
      <PhaseIndicator />

      {/* Phase content */}
      {phase === 'read' && renderReadPhase()}
      {phase === 'recall' && renderRecallPhase()}
      {phase === 'questions' && renderQuestionsPhase()}

      {/* Discontinue modal */}
      {renderDiscontinueModal()}
    </div>
  );
}

export default ComprehensionRunner;
