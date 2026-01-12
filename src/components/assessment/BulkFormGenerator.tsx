import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useBulkCreateForms } from '@/lib/api/forms';
import type { ContentBankRow, FormRow, FormInsert } from '@/types/database';
import { Loader2, CheckCircle2, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

const GRADE_ORDER = ['K', '1', '2', '3', '4', '5', '6', '7', '8'] as const;

interface BulkFormGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  linkedBanks: ContentBankRow[];
  existingForms: FormRow[];
}

function getGradeRange(start: string, end: string): string[] {
  const startIdx = GRADE_ORDER.indexOf(start as typeof GRADE_ORDER[number]);
  const endIdx = GRADE_ORDER.indexOf(end as typeof GRADE_ORDER[number]);
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return [];
  return GRADE_ORDER.slice(startIdx, endIdx + 1) as unknown as string[];
}

export function BulkFormGenerator({ 
  open, 
  onOpenChange, 
  assessmentId, 
  linkedBanks,
  existingForms 
}: BulkFormGeneratorProps) {
  const [startGrade, setStartGrade] = useState<string>('');
  const [endGrade, setEndGrade] = useState<string>('');
  const [formsPerGrade, setFormsPerGrade] = useState('1');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [createdForms, setCreatedForms] = useState<FormRow[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const bulkCreate = useBulkCreateForms();

  const grades = startGrade && endGrade ? getGradeRange(startGrade, endGrade) : [];
  const totalForms = grades.length * (parseInt(formsPerGrade) || 1);

  const handleGenerate = async () => {
    if (!selectedBankId || !startGrade || !endGrade) return;

    const numForms = parseInt(formsPerGrade) || 1;
    const formsToCreate: FormInsert[] = [];

    for (const grade of grades) {
      for (let formNum = 1; formNum <= numForms; formNum++) {
        const gradeTag = grade === 'K' ? 'K' : `G${grade}`;
        const formId = `${assessmentId}.${gradeTag}.form${String(formNum).padStart(2, '0')}`;
        
        // Check if form already exists
        const exists = existingForms.some(f => f.form_id === formId);
        if (exists) continue;

        formsToCreate.push({
          form_id: formId,
          assessment_id: assessmentId,
          content_bank_id: selectedBankId,
          grade_or_level_tag: gradeTag,
          form_number: formNum,
          status: 'draft',
          metadata: {},
        });
      }
    }

    if (formsToCreate.length === 0) {
      toast.error('All forms already exist for the selected range');
      return;
    }

    try {
      const result = await bulkCreate.mutateAsync(formsToCreate);
      setCreatedForms(result);
      setShowSuccess(true);
      toast.success(`Created ${result.length} forms`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create forms');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setShowSuccess(false);
      setCreatedForms([]);
      setStartGrade('');
      setEndGrade('');
      setFormsPerGrade('1');
      setSelectedBankId('');
    }, 200);
  };

  // Check if this is an RC assessment (for "Create Passage Content" button)
  const isRCAssessment = assessmentId.startsWith('RC-');

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Forms Created Successfully
            </DialogTitle>
            <DialogDescription>
              {createdForms.length} forms were created and linked to the content bank.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-auto space-y-2">
            {createdForms.map((form) => (
              <div 
                key={form.form_id} 
                className="flex items-center justify-between p-2 bg-muted rounded-md"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Link 
                    to={`/forms/${form.form_id}`}
                    className="font-mono text-sm text-primary hover:underline"
                  >
                    {form.form_id}
                  </Link>
                </div>
                {isRCAssessment && (
                  <Link to={`/forms/${form.form_id}/create-passage`}>
                    <Button size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Passage
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Grade Forms</DialogTitle>
          <DialogDescription>
            Bulk create forms for a range of grades for {assessmentId}
          </DialogDescription>
        </DialogHeader>

        {linkedBanks.length > 0 ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Content Bank</Label>
              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Grade</Label>
                <Select value={startGrade} onValueChange={setStartGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="From..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_ORDER.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>End Grade</Label>
                <Select value={endGrade} onValueChange={setEndGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="To..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_ORDER.map((grade) => (
                      <SelectItem 
                        key={grade} 
                        value={grade}
                        disabled={startGrade && GRADE_ORDER.indexOf(grade as typeof GRADE_ORDER[number]) < GRADE_ORDER.indexOf(startGrade as typeof GRADE_ORDER[number])}
                      >
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formsPerGrade">Forms per Grade</Label>
              <Input
                id="formsPerGrade"
                type="number"
                value={formsPerGrade}
                onChange={(e) => setFormsPerGrade(e.target.value)}
                min={1}
                max={3}
              />
            </div>

            {grades.length > 0 && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium">Preview:</p>
                <p className="text-muted-foreground">
                  Will create {totalForms} forms: {grades.map(g => g === 'K' ? 'K' : `G${g}`).join(', ')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Example: {assessmentId}.{grades[0] === 'K' ? 'K' : `G${grades[0]}`}.form01
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={!selectedBankId || !startGrade || !endGrade || bulkCreate.isPending}
              >
                {bulkCreate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate {totalForms} Forms
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            No content banks linked to this assessment. Link a bank first.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
