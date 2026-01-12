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
import { useCreateForm } from '@/lib/api/forms';
import type { ContentBankRow, FormRow } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const GRADE_TAGS = ['PK', 'K', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'] as const;

interface LinkFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  linkedBanks: ContentBankRow[];
  existingForms: FormRow[];
}

export function LinkFormDialog({ 
  open, 
  onOpenChange, 
  assessmentId, 
  linkedBanks,
  existingForms 
}: LinkFormDialogProps) {
  const [activeTab, setActiveTab] = useState<'create'>('create');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [gradeTag, setGradeTag] = useState<string>('');
  const [formNumber, setFormNumber] = useState('1');

  const createForm = useCreateForm();

  // Calculate next form number for the selected grade in the selected bank
  const getNextFormNumber = (bankId: string, grade: string) => {
    const formsInGrade = existingForms.filter(
      f => f.content_bank_id === bankId && f.grade_or_level_tag === grade
    );
    return formsInGrade.length + 1;
  };

  // Generate form ID preview
  const formIdPreview = selectedBankId && gradeTag 
    ? `${assessmentId}.${gradeTag}.form${String(parseInt(formNumber) || 1).padStart(2, '0')}`
    : '...';

  const handleCreate = async () => {
    if (!selectedBankId || !gradeTag) return;

    const formId = `${assessmentId}.${gradeTag}.form${String(parseInt(formNumber) || 1).padStart(2, '0')}`;

    try {
      await createForm.mutateAsync({
        form_id: formId,
        assessment_id: assessmentId,
        content_bank_id: selectedBankId,
        grade_or_level_tag: gradeTag,
        form_number: parseInt(formNumber) || 1,
        status: 'draft',
        metadata: {},
      });
      toast.success(`Form "${formId}" created`);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create form');
    }
  };

  const resetForm = () => {
    setSelectedBankId('');
    setGradeTag('');
    setFormNumber('1');
  };

  // Update form number when grade or bank changes
  const handleGradeChange = (grade: string) => {
    setGradeTag(grade);
    if (selectedBankId) {
      setFormNumber(String(getNextFormNumber(selectedBankId, grade)));
    }
  };

  const handleBankChange = (bankId: string) => {
    setSelectedBankId(bankId);
    if (gradeTag) {
      setFormNumber(String(getNextFormNumber(bankId, gradeTag)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Form</DialogTitle>
          <DialogDescription>
            Create a new form for {assessmentId}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create')}>
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            {linkedBanks.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Content Bank</Label>
                  <Select value={selectedBankId} onValueChange={handleBankChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bank..." />
                    </SelectTrigger>
                    <SelectContent>
                      {linkedBanks.map((bank) => (
                        <SelectItem key={bank.content_bank_id} value={bank.content_bank_id}>
                          {bank.content_bank_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Grade/Level Tag</Label>
                  <Select value={gradeTag} onValueChange={handleGradeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_TAGS.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formNumber">Form Number</Label>
                  <Input
                    id="formNumber"
                    type="number"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    min={1}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Form ID: <code className="bg-muted px-1 rounded">{formIdPreview}</code>
                </p>

                <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={!selectedBankId || !gradeTag || createForm.isPending}
                  >
                    {createForm.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Form
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No content banks linked to this assessment. Link a bank first.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
