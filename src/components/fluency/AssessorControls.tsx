import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, RotateCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DISCONTINUE_REASONS, type DiscontinueReason } from '@/types/orf';

interface AssessorControlsProps {
  timerState: 'idle' | 'running' | 'completed' | 'discontinued';
  remainingSeconds: number;
  totalSeconds: number;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  discontinueReason: DiscontinueReason | '';
  onDiscontinueReasonChange: (reason: DiscontinueReason) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function AssessorControls({
  timerState,
  remainingSeconds,
  totalSeconds,
  onStart,
  onStop,
  onReset,
  discontinueReason,
  onDiscontinueReasonChange,
  notes,
  onNotesChange,
}: AssessorControlsProps) {
  const progressPercent = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
  const isRunning = timerState === 'running';
  const isCompleted = timerState === 'completed' || timerState === 'discontinued';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-card">
      {/* Timer Display */}
      <div className="text-center">
        <div className="text-4xl font-mono font-bold tabular-nums">
          {formatTime(remainingSeconds)}
        </div>
        <Progress value={progressPercent} className="mt-2 h-2" />
        <p className="text-sm text-muted-foreground mt-1">
          {timerState === 'idle' && 'Ready to start'}
          {timerState === 'running' && 'Timer running...'}
          {timerState === 'completed' && 'Time complete'}
          {timerState === 'discontinued' && 'Discontinued'}
        </p>
      </div>

      {/* Timer Controls */}
      <div className="flex gap-2 justify-center">
        {timerState === 'idle' && (
          <Button onClick={onStart} size="lg" className="gap-2">
            <Play className="h-4 w-4" />
            Start Timer
          </Button>
        )}
        {timerState === 'running' && (
          <Button onClick={onStop} variant="destructive" size="lg" className="gap-2">
            <Square className="h-4 w-4" />
            Stop / Discontinue
          </Button>
        )}
        {isCompleted && (
          <Button onClick={onReset} variant="outline" size="lg" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {/* Discontinue Reason (only if discontinued) */}
      {timerState === 'discontinued' && (
        <div className="space-y-2">
          <Label htmlFor="discontinue-reason" className="text-sm font-medium">
            Discontinue Reason <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={discontinueReason} 
            onValueChange={(v) => onDiscontinueReasonChange(v as DiscontinueReason)}
          >
            <SelectTrigger id="discontinue-reason">
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent>
              {DISCONTINUE_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Assessor Notes */}
      <div className="space-y-2">
        <Label htmlFor="assessor-notes" className="text-sm font-medium">
          Assessor Notes
        </Label>
        <Textarea
          id="assessor-notes"
          placeholder="Add any observations about the student's reading..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
