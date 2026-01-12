import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseCSV, csvToObjects } from '@/lib/import/csvParser';
import { validateImportBatch, type ValidationError } from '@/lib/import/contentValidator';
import { toast } from 'sonner';

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  raw: string[][];
}

export default function ImportPage() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const raw = parseCSV(text);
        
        if (raw.length < 2) {
          toast.error('CSV must have at least a header row and one data row');
          return;
        }

        const rows = csvToObjects(raw);
        const headers = raw[0];

        setParsedData({ headers, rows, raw });

        // Validate
        const validation = validateImportBatch(rows);
        setValidationErrors(validation.errors);
        setValidationWarnings(validation.warnings);
        setIsValid(validation.valid);

        toast.success(`Parsed ${rows.length} rows`);
      } catch (err) {
        toast.error('Failed to parse CSV file');
        console.error(err);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = useCallback(() => {
    if (!parsedData || !isValid) return;
    
    // TODO: Implement actual import to database
    toast.info('Import functionality coming soon');
  }, [parsedData, isValid]);

  const handleClear = useCallback(() => {
    setParsedData(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    setIsValid(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Content</h1>
          <p className="text-muted-foreground">Upload CSV files to import items</p>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV
          </CardTitle>
          <CardDescription>
            Upload a CSV file with item data. Required columns: stimulus or text. 
            Optional: grade, item_type, form_id, sequence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                cursor-pointer"
            />
            {parsedData && (
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {parsedData && (
        <>
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation Errors ({validationErrors.length})</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {validationErrors.slice(0, 10).map((err, i) => (
                    <li key={i} className="text-sm">
                      Row {err.row}: {err.field} - {err.message}
                    </li>
                  ))}
                  {validationErrors.length > 10 && (
                    <li className="text-sm">...and {validationErrors.length - 10} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validationWarnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warnings ({validationWarnings.length})</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {validationWarnings.slice(0, 5).map((warn, i) => (
                    <li key={i} className="text-sm">
                      {warn.row > 0 ? `Row ${warn.row}: ` : ''}{warn.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {isValid && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">Validation Passed</AlertTitle>
              <AlertDescription className="text-green-700">
                All {parsedData.rows.length} rows are valid and ready to import.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Preview Table */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Preview ({parsedData.rows.length} rows)
              </span>
              <Button onClick={handleImport} disabled={!isValid}>
                Import Items
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {parsedData.headers.slice(0, 6).map((h, i) => (
                      <TableHead key={i}>{h}</TableHead>
                    ))}
                    {parsedData.headers.length > 6 && (
                      <TableHead>+{parsedData.headers.length - 6} more</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.slice(0, 20).map((row, i) => {
                    const rowErrors = validationErrors.filter(e => e.row === i + 2);
                    return (
                      <TableRow key={i} className={rowErrors.length > 0 ? 'bg-destructive/10' : ''}>
                        <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                        {parsedData.headers.slice(0, 6).map((h, j) => (
                          <TableCell key={j} className="max-w-[200px] truncate">
                            {row[h.toLowerCase().replace(/\s+/g, '_')] || '—'}
                          </TableCell>
                        ))}
                        {parsedData.headers.length > 6 && (
                          <TableCell>
                            <Badge variant="secondary">...</Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {parsedData.rows.length > 20 && (
                <p className="text-center text-muted-foreground text-sm mt-4">
                  Showing first 20 of {parsedData.rows.length} rows
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>CSV Format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your CSV should include a header row with column names. Supported columns:
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono">stimulus</TableCell>
                  <TableCell><Badge>Required*</Badge></TableCell>
                  <TableCell>The item stimulus text</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono">text</TableCell>
                  <TableCell><Badge>Required*</Badge></TableCell>
                  <TableCell>Alternative to stimulus</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono">grade</TableCell>
                  <TableCell><Badge variant="outline">Optional</Badge></TableCell>
                  <TableCell>Grade level (K, 1, 2, etc.)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono">item_type</TableCell>
                  <TableCell><Badge variant="outline">Optional</Badge></TableCell>
                  <TableCell>Type (letter, word, passage, etc.)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono">form_id</TableCell>
                  <TableCell><Badge variant="outline">Optional</Badge></TableCell>
                  <TableCell>Target form ID</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono">sequence</TableCell>
                  <TableCell><Badge variant="outline">Optional</Badge></TableCell>
                  <TableCell>Item sequence number</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="text-sm text-muted-foreground">
              * Either stimulus or text is required for each row.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
