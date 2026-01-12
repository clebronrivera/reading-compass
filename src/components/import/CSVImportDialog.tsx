import { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Upload, CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSV, csvToObjects } from '@/lib/import/csvParser';
import { validateAllRows, requiredColumns, type ImportType } from '@/lib/import/templateSchemas';
import { validateFormReferences, validateBankReferences, validateAssessmentContext, analyzeImport } from '@/lib/import/referenceValidator';
import { processImport, type ImportResult, type ProgressCallback } from '@/lib/import/importProcessor';
import { downloadTemplate, getTemplateDescription } from '@/lib/import/templateDownloader';
import { useRecordImport } from '@/lib/api/importHistory';
import { useQueryClient } from '@tanstack/react-query';
import type { AssessmentRow } from '@/types/database';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: AssessmentRow;
}

interface ValidationState {
  parsed: boolean;
  rowCount: number;
  schemaValid: boolean;
  schemaErrors: string[];
  referencesValid: boolean;
  referenceErrors: string[];
  referenceWarnings: string[];
  toCreate: number;
  toUpdate: number;
}

const IMPORT_TYPES: { value: ImportType; label: string; description: string }[] = [
  { value: 'items', label: 'Items', description: 'Passages, questions, stimuli' },
  { value: 'forms', label: 'Forms', description: 'Form definitions' },
  { value: 'banks', label: 'Content Banks', description: 'Bank metadata' },
  { value: 'asr', label: 'ASR Sections', description: 'Assessment spec fields' },
  { value: 'scoring', label: 'Scoring Model', description: 'Metrics and formulas' },
];

export function CSVImportDialog({ open, onOpenChange, assessment }: CSVImportDialogProps) {
  const [importType, setImportType] = useState<ImportType>('items');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [changeNote, setChangeNote] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [validation, setValidation] = useState<ValidationState | null>(null);

  const queryClient = useQueryClient();
  const recordImport = useRecordImport();

  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate(importType, assessment.assessment_id, assessment.subcomponent_name, assessment.component_code);
  }, [importType, assessment]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedRows([]);
    setValidation(null);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);
      const objects = csvToObjects<Record<string, string>>(rows);

      if (objects.length === 0) {
        toast.error('CSV file is empty or has no data rows');
        return;
      }

      // Check required columns
      const headers = Object.keys(objects[0]);
      const required = requiredColumns[importType];
      const missing = required.filter(col => !headers.includes(col));

      if (missing.length > 0) {
        toast.error(`Missing required columns: ${missing.join(', ')}`);
        setValidation({
          parsed: true,
          rowCount: objects.length,
          schemaValid: false,
          schemaErrors: [`Missing required columns: ${missing.join(', ')}`],
          referencesValid: false,
          referenceErrors: [],
          referenceWarnings: [],
          toCreate: 0,
          toUpdate: 0,
        });
        return;
      }

      setParsedRows(objects);

      // Validate schema
      const schemaResult = validateAllRows(importType, objects);

      // Validate references based on import type
      let refResult = { valid: true, errors: [] as { message: string }[], warnings: [] as { message: string }[] };
      
      if (importType === 'items') {
        refResult = await validateFormReferences(objects);
      } else if (importType === 'forms') {
        refResult = await validateBankReferences(objects);
      }

      // Validate assessment context
      const contextResult = await validateAssessmentContext(objects, assessment.assessment_id);

      // Analyze for creates vs updates
      const analysisResult = await analyzeImport(importType, objects);

      setValidation({
        parsed: true,
        rowCount: objects.length,
        schemaValid: schemaResult.valid,
        schemaErrors: schemaResult.errors,
        referencesValid: refResult.valid && contextResult.valid,
        referenceErrors: [...refResult.errors.map(e => e.message), ...contextResult.errors.map(e => e.message)],
        referenceWarnings: [...refResult.warnings.map(e => e.message), ...analysisResult.warnings.map(w => w.message)],
        toCreate: analysisResult.analysis.toCreate,
        toUpdate: analysisResult.analysis.toUpdate,
      });

    } catch (err) {
      toast.error('Failed to parse CSV file');
      console.error(err);
    }
  }, [importType, assessment.assessment_id]);

  const handleImport = useCallback(async () => {
    if (parsedRows.length === 0 || !changeNote.trim()) {
      toast.error('Please enter a change note');
      return;
    }

    setIsImporting(true);
    setProgress({ current: 0, total: parsedRows.length, phase: 'Starting...' });

    const onProgress: ProgressCallback = (current, total, phase) => {
      setProgress({ current, total, phase });
    };

    try {
      const result: ImportResult = await processImport(importType, parsedRows, changeNote, onProgress);

      // Record import history
      await recordImport.mutateAsync({
        assessment_id: assessment.assessment_id,
        import_type: importType,
        rows_processed: result.rowsProcessed,
        rows_created: result.rowsCreated,
        rows_updated: result.rowsUpdated,
        rows_failed: result.rowsFailed,
        change_note: changeNote,
        file_name: file?.name,
        imported_by: 'user',
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['contentBanks'] });
      queryClient.invalidateQueries({ queryKey: ['asrVersions'] });
      queryClient.invalidateQueries({ queryKey: ['scoringOutputs'] });

      if (result.success) {
        toast.success(`Imported ${result.rowsCreated + result.rowsUpdated} rows successfully`);
        onOpenChange(false);
        resetState();
      } else {
        toast.error(`Import completed with ${result.errors.length} errors`);
      }
    } catch (err) {
      toast.error('Import failed');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  }, [parsedRows, changeNote, importType, file, assessment.assessment_id, recordImport, queryClient, onOpenChange]);

  const resetState = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setChangeNote('');
    setValidation(null);
    setProgress({ current: 0, total: 0, phase: '' });
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  }, [onOpenChange, resetState]);

  // Preview columns for the table
  const previewColumns = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return Object.keys(parsedRows[0]).slice(0, 5);
  }, [parsedRows]);

  const canImport = validation?.schemaValid && validation?.referencesValid && changeNote.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import CSV Data
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to create or update records for {assessment.assessment_id}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Import Type Selection */}
            <div className="space-y-3">
              <Label>What are you importing?</Label>
              <RadioGroup
                value={importType}
                onValueChange={(v) => {
                  setImportType(v as ImportType);
                  resetState();
                }}
                className="grid gap-2"
              >
                {IMPORT_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <Label htmlFor={type.value} className="flex-1 cursor-pointer">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-muted-foreground text-sm ml-2">({type.description})</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Template Download */}
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm">{getTemplateDescription(importType)}</p>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-file">Upload File</Label>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
              />
            </div>

            {/* Validation Status */}
            {validation && (
              <div className="space-y-3">
                <Label>Validation Status</Label>
                
                <div className="space-y-2">
                  {/* Row count */}
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{validation.rowCount} rows parsed</span>
                  </div>

                  {/* Schema validation */}
                  {validation.schemaValid ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>All required fields present</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span>Schema validation failed</span>
                    </div>
                  )}

                  {/* Reference validation */}
                  {validation.referencesValid ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>All references valid</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span>Reference validation failed</span>
                    </div>
                  )}

                  {/* Create/Update counts */}
                  {(validation.toCreate > 0 || validation.toUpdate > 0) && (
                    <div className="space-y-1">
                      {validation.toCreate > 0 && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <span>+ {validation.toCreate} records will be CREATED</span>
                        </div>
                      )}
                      {validation.toUpdate > 0 && (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span>{validation.toUpdate} records will be UPDATED</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Errors */}
                {(validation.schemaErrors.length > 0 || validation.referenceErrors.length > 0) && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm mt-1">
                        {validation.schemaErrors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {validation.referenceErrors.slice(0, 5).map((err, i) => (
                          <li key={`ref-${i}`}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warnings */}
                {validation.referenceWarnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warnings</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm mt-1">
                        {validation.referenceWarnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Preview Table */}
            {parsedRows.length > 0 && previewColumns.length > 0 && (
              <div className="space-y-2">
                <Label>Preview (first 5 rows)</Label>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewColumns.map((col) => (
                          <TableHead key={col} className="text-xs">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {previewColumns.map((col) => (
                            <TableCell key={col} className="text-xs max-w-[150px] truncate">
                              {row[col]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Change Note */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="change-note">Change Note (required)</Label>
                <Textarea
                  id="change-note"
                  placeholder="Describe what you're importing..."
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {/* Progress */}
            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.phase}</span>
                  <span>{progress.current}/{progress.total}</span>
                </div>
                <Progress value={(progress.current / progress.total) * 100} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!canImport || isImporting}>
            {isImporting ? 'Importing...' : `Import ${parsedRows.length} Rows`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
