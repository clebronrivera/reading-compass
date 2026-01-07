import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ORFComputedScores } from '@/types/orf';

interface ScoringPanelProps {
  scores: ORFComputedScores;
  isComplete: boolean;
}

export function ScoringPanel({ scores, isComplete }: ScoringPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {isComplete ? 'Final Scores' : 'Live Scores'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold text-primary">
              {scores.words_correct_per_minute}
            </div>
            <div className="text-xs text-muted-foreground">WCPM</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold text-primary">
              {scores.accuracy_percentage}%
            </div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold">
              {scores.total_words_read}
            </div>
            <div className="text-xs text-muted-foreground">Words Read</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold">
              {scores.correct_word_count}
            </div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold text-destructive">
              {scores.total_errors}
            </div>
            <div className="text-xs text-muted-foreground">Errors</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold text-amber-600">
              {scores.self_correction_count}
            </div>
            <div className="text-xs text-muted-foreground">Self-Corrections</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
