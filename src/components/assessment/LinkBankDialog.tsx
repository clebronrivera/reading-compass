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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLinkAssessmentBank } from '@/lib/api/assessmentBanks';
import { useCreateContentBank, useContentBanks } from '@/lib/api/contentBanks';
import type { ContentBankRow } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LinkBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  linkedBankIds: Set<string>;
}

export function LinkBankDialog({ open, onOpenChange, assessmentId, linkedBankIds }: LinkBankDialogProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'create'>('link');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [newBankName, setNewBankName] = useState('');
  const [targetBankSize, setTargetBankSize] = useState('10');

  const { data: allBanks = [] } = useContentBanks();
  const linkBank = useLinkAssessmentBank();
  const createBank = useCreateContentBank();

  // Available banks = banks for this assessment that aren't already linked
  const availableBanks = allBanks.filter(
    (b) => b.linked_assessment_id === assessmentId && !linkedBankIds.has(b.content_bank_id)
  );

  const handleLinkExisting = async () => {
    if (!selectedBankId) return;

    try {
      await linkBank.mutateAsync({
        assessment_id: assessmentId,
        content_bank_id: selectedBankId,
      });
      toast.success('Content bank linked successfully');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to link content bank');
    }
  };

  const handleCreateAndLink = async () => {
    if (!newBankName.trim()) return;

    // Generate bank ID: {assessment_id}.bank{N}
    const existingBankCount = allBanks.filter(b => b.linked_assessment_id === assessmentId).length;
    const newBankId = `${assessmentId}.bank${existingBankCount + 1}`;

    try {
      // Create the bank
      await createBank.mutateAsync({
        content_bank_id: newBankId,
        name: newBankName.trim(),
        linked_assessment_id: assessmentId,
        target_bank_size: parseInt(targetBankSize) || 10,
        status: 'empty',
      });

      // Link it to the assessment
      await linkBank.mutateAsync({
        assessment_id: assessmentId,
        content_bank_id: newBankId,
      });

      toast.success(`Content bank "${newBankId}" created and linked`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create content bank');
    }
  };

  const resetForm = () => {
    setSelectedBankId('');
    setNewBankName('');
    setTargetBankSize('10');
    setActiveTab('link');
  };

  const isPending = linkBank.isPending || createBank.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Content Bank</DialogTitle>
          <DialogDescription>
            Link an existing content bank or create a new one for {assessmentId}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'link' | 'create')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Link Existing</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            {availableBanks.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Select Content Bank</Label>
                  <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a bank..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBanks.map((bank) => (
                        <SelectItem key={bank.content_bank_id} value={bank.content_bank_id}>
                          {bank.content_bank_id} - {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleLinkExisting} disabled={!selectedBankId || isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Link Bank
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No unlinked banks available for this assessment. Create a new one instead.
              </p>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="e.g., Primary Content Bank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetSize">Target Bank Size</Label>
              <Input
                id="targetSize"
                type="number"
                value={targetBankSize}
                onChange={(e) => setTargetBankSize(e.target.value)}
                min={1}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Bank ID will be: <code className="bg-muted px-1 rounded">{assessmentId}.bank{allBanks.filter(b => b.linked_assessment_id === assessmentId).length + 1}</code>
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAndLink} disabled={!newBankName.trim() || isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create & Link
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
