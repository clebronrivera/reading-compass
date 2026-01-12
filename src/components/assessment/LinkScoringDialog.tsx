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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateScoringOutput } from '@/lib/api/scoringOutputs';
import type { ScoringOutputRow } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LinkScoringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  existingScoringOutputs: ScoringOutputRow[];
}

export function LinkScoringDialog({ 
  open, 
  onOpenChange, 
  assessmentId, 
  existingScoringOutputs 
}: LinkScoringDialogProps) {
  const [activeTab, setActiveTab] = useState<'create'>('create');
  const [scoringModelId, setScoringModelId] = useState('');

  const createScoring = useCreateScoringOutput();

  // Generate default scoring model ID
  const defaultScoringId = `${assessmentId}.scoring${existingScoringOutputs.length + 1}`;

  const handleCreate = async () => {
    const modelId = scoringModelId.trim() || defaultScoringId;

    try {
      await createScoring.mutateAsync({
        scoring_model_id: modelId,
        assessment_id: assessmentId,
        raw_metrics_schema: [],
        derived_metrics_schema: [],
        formulas: [],
        flags: [],
        thresholds: [],
      });
      toast.success(`Scoring model "${modelId}" created`);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create scoring model');
    }
  };

  const resetForm = () => {
    setScoringModelId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Scoring Model</DialogTitle>
          <DialogDescription>
            Create a new scoring output for {assessmentId}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create')}>
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="scoringModelId">Scoring Model ID</Label>
              <Input
                id="scoringModelId"
                value={scoringModelId}
                onChange={(e) => setScoringModelId(e.target.value)}
                placeholder={defaultScoringId}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for default: <code className="bg-muted px-1 rounded">{defaultScoringId}</code>
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              The scoring model will be created with empty metric schemas. 
              Edit them from the Scoring Output detail page.
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createScoring.isPending}>
                {createScoring.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Scoring Model
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
