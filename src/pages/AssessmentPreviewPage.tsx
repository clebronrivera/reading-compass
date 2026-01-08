import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, User, BookOpen, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { useForms } from '@/lib/api/forms';
import { useItemsByForm } from '@/lib/api/items';
import { getDisplayText } from '@/lib/itemDisplay';
import type { ORFPassageContent } from '@/types/orf';

export default function AssessmentPreviewPage() {
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  
  const { data: forms, isLoading: formsLoading, error: formsError } = useForms();
  const { data: items, isLoading: itemsLoading } = useItemsByForm(selectedFormId);
  
  const selectedForm = forms?.find(f => f.form_id === selectedFormId);
  
  if (formsLoading) return <LoadingState title="Loading forms..." />;
  if (formsError) return <ErrorState title="Failed to load forms" />;

  // Determine assessment type from form ID
  const getAssessmentType = (formId: string) => {
    if (formId.startsWith('FL-ORF')) return 'orf';
    if (formId.startsWith('PH-LNUC')) return 'letter-naming';
    if (formId.startsWith('PA-')) return 'phonological-awareness';
    if (formId.startsWith('PH-')) return 'phonics';
    if (formId.startsWith('VO-')) return 'vocabulary';
    if (formId.startsWith('RC-')) return 'comprehension';
    return 'generic';
  };

  const assessmentType = selectedFormId ? getAssessmentType(selectedFormId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/forms" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Assessment Preview</h1>
          <p className="text-muted-foreground">
            Static preview of assessment content — no session required
          </p>
        </div>
      </div>

      {/* Form Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select a Form to Preview</CardTitle>
          <CardDescription>
            Choose any form to see what the student and assessor would see
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedFormId} onValueChange={setSelectedFormId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a form..." />
            </SelectTrigger>
            <SelectContent>
              {forms?.map(form => (
                <SelectItem key={form.form_id} value={form.form_id}>
                  <span className="font-mono text-sm">{form.form_id}</span>
                  <span className="text-muted-foreground ml-2">
                    ({form.grade_or_level_tag})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Preview Content */}
      {selectedFormId && selectedForm && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Student View */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-700 dark:text-blue-300">
                  Student View
                </CardTitle>
              </div>
              <CardDescription>
                What the student sees on their screen
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {itemsLoading ? (
                <LoadingState title="Loading items..." />
              ) : (
                <StudentViewPreview 
                  items={items || []} 
                  assessmentType={assessmentType!}
                  formId={selectedFormId}
                />
              )}
            </CardContent>
          </Card>

          {/* Assessor View */}
          <Card className="border-2 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg text-emerald-700 dark:text-emerald-300">
                  Assessor View
                </CardTitle>
              </div>
              <CardDescription>
                What the assessor sees (with controls & scoring info)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {itemsLoading ? (
                <LoadingState title="Loading items..." />
              ) : (
                <AssessorViewPreview 
                  items={items || []} 
                  assessmentType={assessmentType!}
                  formId={selectedFormId}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assessment Type Documentation */}
      {assessmentType && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Interaction Model</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <InteractionDocumentation type={assessmentType} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Student View Preview Component
function StudentViewPreview({ 
  items, 
  assessmentType,
  formId 
}: { 
  items: Array<{ item_id: string; content_payload: unknown; sequence_number: number; item_type: string }>;
  assessmentType: string;
  formId: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No items found for this form</p>
      </div>
    );
  }

  // ORF Passage View
  if (assessmentType === 'orf') {
    const passage = items[0]?.content_payload as ORFPassageContent;
    const text = passage?.stimulus || '';
    return (
      <div className="space-y-4">
        <Badge variant="outline">Passage Reading</Badge>
        <div className="p-6 bg-muted/30 rounded-lg border">
          <p className="text-xl leading-relaxed font-serif">
            {text}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Word count: {text.split(/\s+/).filter(Boolean).length}
        </p>
      </div>
    );
  }

  // Letter Naming / Grid View
  if (assessmentType === 'letter-naming' || assessmentType === 'phonics') {
    return (
      <div className="space-y-4">
        <Badge variant="outline">Item Grid</Badge>
        <div className="grid grid-cols-10 gap-2">
          {items.slice(0, 52).map((item) => {
            const displayText = getDisplayText(item.content_payload);
            return (
              <div 
                key={item.item_id}
                className="aspect-square flex items-center justify-center text-2xl font-bold border rounded bg-card hover:bg-muted/50 transition-colors"
              >
                {displayText || '?'}
              </div>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          Total items: {items.length}
        </p>
      </div>
    );
  }

  // Generic List View
  return (
    <div className="space-y-4">
      <Badge variant="outline">Item List</Badge>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {items.map((item) => {
          const displayText = getDisplayText(item.content_payload);
          return (
            <div 
              key={item.item_id}
              className="p-3 border rounded bg-card"
            >
              <span className="text-lg">
                {displayText || JSON.stringify(item.content_payload).slice(0, 50)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Assessor View Preview Component
function AssessorViewPreview({ 
  items, 
  assessmentType,
  formId 
}: { 
  items: Array<{ item_id: string; content_payload: unknown; sequence_number: number; item_type: string; scoring_tags?: string[] | null }>;
  assessmentType: string;
  formId: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No items found for this form</p>
      </div>
    );
  }

  // ORF Assessor View
  if (assessmentType === 'orf') {
    const passage = items[0]?.content_payload as ORFPassageContent;
    const tokens = passage?.word_tokens || (passage?.stimulus || '').split(/\s+/).filter(Boolean);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>Timer: 60s</Badge>
          <Badge variant="secondary">WCPM Scoring</Badge>
          <Badge variant="outline">Click to Mark</Badge>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg border">
          <div className="flex flex-wrap gap-1">
            {tokens.slice(0, 50).map((word, idx) => (
              <span 
                key={idx}
                className="px-1.5 py-0.5 rounded border bg-card hover:bg-yellow-100 dark:hover:bg-yellow-900/30 cursor-pointer text-sm"
              >
                {word}
              </span>
            ))}
            {tokens.length > 50 && (
              <span className="text-muted-foreground">... +{tokens.length - 50} more words</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 border rounded bg-muted/30">
            <p className="font-medium">Metrics Captured</p>
            <ul className="text-muted-foreground mt-1">
              <li>• Words Correct Per Minute (WCPM)</li>
              <li>• Accuracy %</li>
              <li>• Self-corrections</li>
            </ul>
          </div>
          <div className="p-3 border rounded bg-muted/30">
            <p className="font-medium">Controls</p>
            <ul className="text-muted-foreground mt-1">
              <li>• Start/Stop Timer</li>
              <li>• Discontinue with Reason</li>
              <li>• Font Size Adjustment</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Letter Naming Assessor View
  if (assessmentType === 'letter-naming' || assessmentType === 'phonics') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>Item-by-Item</Badge>
          <Badge variant="secondary">Binary Scoring</Badge>
        </div>
        <div className="grid grid-cols-10 gap-2">
          {items.slice(0, 26).map((item, idx) => {
            const displayText = getDisplayText(item.content_payload);
            const isMarkedExample = idx === 3 || idx === 7; // Mock some as incorrect
            return (
              <div 
                key={item.item_id}
                className={`aspect-square flex items-center justify-center text-2xl font-bold border rounded cursor-pointer transition-colors ${
                  isMarkedExample 
                    ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' 
                    : 'bg-card hover:bg-muted/50'
                }`}
              >
                {displayText || '?'}
              </div>
            );
          })}
        </div>
        <Separator />
        <div className="text-sm space-y-2">
          <p className="font-medium">Scoring Model</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Click item = toggle incorrect (shown in red)</li>
            <li>• Unmarked = correct by default</li>
            <li>• Expected answer shown to assessor</li>
            <li>• Error types: {items[0]?.scoring_tags?.join(', ') || 'substitution, no-response'}</li>
          </ul>
        </div>
      </div>
    );
  }

  // Generic Assessor View
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge>Sequential</Badge>
        <Badge variant="secondary">{items.length} Items</Badge>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {items.slice(0, 10).map((item) => {
          const displayText = getDisplayText(item.content_payload);
          const payload = item.content_payload as Record<string, unknown>;
          return (
            <div 
              key={item.item_id}
              className="p-3 border rounded flex justify-between items-center"
            >
              <div>
                <span className="text-sm text-muted-foreground mr-2">#{item.sequence_number}</span>
                <span>{displayText || '—'}</span>
              </div>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-xs">
                  {(payload.correct_answer as string) || 'See rubric'}
                </Badge>
              </div>
            </div>
          );
        })}
        {items.length > 10 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            ... and {items.length - 10} more items
          </p>
        )}
      </div>
    </div>
  );
}

// Interaction Documentation Component
function InteractionDocumentation({ type }: { type: string }) {
  const docs: Record<string, { title: string; student: string[]; assessor: string[] }> = {
    'orf': {
      title: 'Oral Reading Fluency (FL-ORF)',
      student: [
        'Student sees full passage text in large, readable font',
        'No interactive elements — student reads aloud',
        'Passage remains static during the 60-second reading window',
      ],
      assessor: [
        'Each word is a clickable token',
        'Click cycles: unmarked → incorrect (red) → self-correction (yellow) → back to unmarked',
        '60-second countdown timer with Start/Stop controls',
        'Real-time WCPM and accuracy calculation',
        'Can discontinue with reason (e.g., "Student frustrated")',
        'Font size controls for accessibility',
      ],
    },
    'letter-naming': {
      title: 'Letter Name Knowledge (PH-LNUC)',
      student: [
        'Grid of letters displayed (uppercase A-Z, lowercase a-z)',
        'Items shown one at a time or as full grid depending on mode',
        'Large, clear letter presentation',
      ],
      assessor: [
        'Each letter is clickable for marking',
        'Click = mark as incorrect; shows in red',
        'Correct answer displayed for reference',
        'Progress tracker shows items completed',
        'Total score: count of correct identifications',
      ],
    },
    'phonics': {
      title: 'Phonics Assessment',
      student: [
        'Stimulus displayed (letter, word, or pseudoword)',
        'May include audio prompt option',
        'Clean, distraction-free presentation',
      ],
      assessor: [
        'Binary scoring: correct or incorrect',
        'Expected response shown (e.g., /b/ for letter B)',
        'Error type tagging available',
        'Rubric notes for ambiguous responses',
      ],
    },
    'phonological-awareness': {
      title: 'Phonological Awareness',
      student: [
        'Audio or visual stimulus presented',
        'May involve rhyming, segmenting, or blending tasks',
        'Clear item separation',
      ],
      assessor: [
        'Mark correct/incorrect for each response',
        'Track specific error patterns',
        'Discontinue rules may apply',
      ],
    },
    'vocabulary': {
      title: 'Vocabulary Assessment',
      student: [
        'Word or image stimulus displayed',
        'May include multiple choice options',
        'Definition or context provided as needed',
      ],
      assessor: [
        'Score based on rubric criteria',
        'Partial credit may apply',
        'Note qualitative observations',
      ],
    },
    'comprehension': {
      title: 'Reading Comprehension',
      student: [
        'Passage displayed for reading',
        'Questions presented sequentially or together',
        'May include look-back option',
      ],
      assessor: [
        'Multi-point rubric scoring',
        'Track literal vs. inferential responses',
        'Note evidence of text use',
      ],
    },
    'generic': {
      title: 'Generic Assessment',
      student: [
        'Stimulus displayed according to item type',
        'One item at a time or batch presentation',
      ],
      assessor: [
        'Mark responses as correct/incorrect',
        'Apply scoring rules from ASR',
        'Track progress through items',
      ],
    },
  };

  const doc = docs[type] || docs['generic'];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Student Experience</h4>
        <ul className="space-y-2 text-sm">
          {doc.student.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Assessor Controls</h4>
        <ul className="space-y-2 text-sm">
          {doc.assessor.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
