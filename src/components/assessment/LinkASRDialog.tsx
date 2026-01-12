import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateAssessment } from '@/lib/api/assessments';
import type { ASRVersionRow } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LinkASRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  currentASRVersionId: string | null;
  asrVersions: ASRVersionRow[];
}

export function LinkASRDialog({ 
  open, 
  onOpenChange, 
  assessmentId, 
  currentASRVersionId,
  asrVersions 
}: LinkASRDialogProps) {
  const [selectedASR, setSelectedASR] = useState<string>(currentASRVersionId || '');
  const updateAssessment = useUpdateAssessment();

  const handleSetCurrent = async () => {
    if (!selectedASR) return;

    try {
      await updateAssessment.mutateAsync({
        id: assessmentId,
        updates: { current_asr_version_id: selectedASR },
      });
      toast.success('Current ASR version updated');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update ASR version');
    }
  };

  const handleClear = async () => {
    try {
      await updateAssessment.mutateAsync({
        id: assessmentId,
        updates: { current_asr_version_id: null },
      });
      toast.success('Current ASR version cleared');
      setSelectedASR('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to clear ASR version');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Current ASR Version</DialogTitle>
          <DialogDescription>
            Select the current ASR version for {assessmentId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {asrVersions.length > 0 ? (
            <div className="space-y-2">
              <Label>ASR Version</Label>
              <Select value={selectedASR} onValueChange={setSelectedASR}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an ASR version..." />
                </SelectTrigger>
                <SelectContent>
                  {asrVersions.map((asr) => (
                    <SelectItem key={asr.asr_version_id} value={asr.asr_version_id}>
                      {asr.asr_version_id} ({asr.completeness_percent}% complete)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentASRVersionId && (
                <p className="text-xs text-muted-foreground">
                  Current: <code className="bg-muted px-1 rounded">{currentASRVersionId}</code>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No ASR versions exist for this assessment. Create one first from the ASR Library.
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {currentASRVersionId && (
            <Button 
              variant="outline" 
              onClick={handleClear}
              disabled={updateAssessment.isPending}
            >
              Clear Current
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSetCurrent} 
            disabled={!selectedASR || selectedASR === currentASRVersionId || updateAssessment.isPending}
          >
            {updateAssessment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Set Current
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
