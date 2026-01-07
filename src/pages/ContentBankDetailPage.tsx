import { useParams, Link } from 'react-router-dom';
import { getContentBankById } from '@/data/contentBanks';
import { getFormsByContentBank } from '@/data/forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ArrowLeft, Check, X } from 'lucide-react';

export default function ContentBankDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bank = getContentBankById(id || '');
  const forms = getFormsByContentBank(id || '');

  if (!bank) {
    return (
      <div className="space-y-4">
        <Link to="/banks" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Content Banks
        </Link>
        <p className="text-muted-foreground">Content bank not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/banks" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Content Banks
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{bank.name}</h1>
            <p className="font-mono text-muted-foreground">{bank.content_bank_id}</p>
          </div>
          <StatusBadge status={bank.status} size="lg" />
        </div>
      </div>

      {/* Bank Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Bank ID</p>
              <p className="font-mono">{bank.content_bank_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Linked Assessment</p>
              <Link to={`/assessment/${bank.linked_assessment_id}`} className="text-primary hover:underline font-mono">
                {bank.linked_assessment_id}
              </Link>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Differentiation Keys</p>
              <p>{bank.differentiation_keys.length > 0 ? bank.differentiation_keys.join(', ') : 'None'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Equivalence Set Required</p>
              <p className="flex items-center gap-1">
                {bank.equivalence_set_required ? (
                  <><Check className="h-4 w-4 text-status-active" /> Yes</>
                ) : (
                  <><X className="h-4 w-4 text-muted-foreground" /> No</>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bank Size</p>
              <p>{bank.current_size} / {bank.target_bank_size} items</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={bank.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Forms */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Forms ({forms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {forms.length === 0 ? (
            <p className="text-muted-foreground">No forms in this bank yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form ID</TableHead>
                  <TableHead>Grade/Level</TableHead>
                  <TableHead>Form #</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.form_id}>
                    <TableCell>
                      <Link to={`/forms/${form.form_id}`} className="text-primary hover:underline font-mono">
                        {form.form_id}
                      </Link>
                    </TableCell>
                    <TableCell>{form.grade_or_level_tag}</TableCell>
                    <TableCell>{form.form_number}</TableCell>
                    <TableCell><StatusBadge status={form.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
