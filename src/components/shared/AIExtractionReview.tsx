import { CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { CONFIDENCE_THRESHOLDS } from '@/constants';
import type { EntityType } from '@/types';
import { cn } from '@/lib/utils';

interface ExtractionField {
  label: string;
  value: string | number | boolean | null;
  confidence: number;
  sourceReference?: string;
}

interface AIExtractionReviewProps {
  entityType: EntityType;
  fields: ExtractionField[];
  documentType?: string;
  notes?: string;
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
}

function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

function FieldRow({ field }: { field: ExtractionField }) {
  const level = getConfidenceLevel(field.confidence);

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2.5',
        level === 'high' && 'bg-secondary/50',
        level === 'medium' && 'bg-warning/10 border border-warning/20',
        level === 'low' && 'bg-destructive/10 border border-destructive/20'
      )}
    >
      <div className="flex-1">
        <p className="text-sm font-medium">{field.label}</p>
        <p className="text-sm text-muted-foreground">
          {field.value !== null && field.value !== undefined
            ? typeof field.value === 'boolean'
              ? field.value
                ? 'Yes'
                : 'No'
              : String(field.value)
            : 'Not found'}
        </p>
        {field.sourceReference && (
          <p className="mt-0.5 text-xs text-muted-foreground italic">
            Found in: {field.sourceReference}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ConfidenceIndicator score={field.confidence} />
        {level === 'high' && <CheckCircle2 className="h-4 w-4 text-success" aria-label="High confidence" />}
        {level === 'medium' && <AlertTriangle className="h-4 w-4 text-warning" aria-label="Medium confidence - verify" />}
        {level === 'low' && <XCircle className="h-4 w-4 text-destructive" aria-label="Low confidence" />}
      </div>
    </div>
  );
}

export function AIExtractionReview({
  entityType: _entityType,
  fields,
  documentType,
  notes,
  onAccept,
  onEdit,
  onReject,
}: AIExtractionReviewProps) {
  const highCount = fields.filter((f) => getConfidenceLevel(f.confidence) === 'high').length;
  const mediumCount = fields.filter((f) => getConfidenceLevel(f.confidence) === 'medium').length;
  const lowCount = fields.filter((f) => getConfidenceLevel(f.confidence) === 'low').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              AI Extraction Results
            </CardTitle>
            {documentType && (
              <Badge variant="secondary">{documentType}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4 text-sm">
            <span className="text-success font-medium">{highCount} high confidence</span>
            <span className="text-warning font-medium">{mediumCount} needs verification</span>
            <span className="text-destructive font-medium">{lowCount} low/missing</span>
          </div>

          <div className="space-y-2">
            {fields.map((f, i) => (
              <FieldRow key={i} field={f} />
            ))}
          </div>

          {notes && (
            <div className="mt-4 rounded-lg bg-accent p-3">
              <p className="text-xs font-medium text-accent-foreground">Extraction Notes</p>
              <p className="mt-1 text-sm text-muted-foreground">{notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={onAccept} className="flex-1">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Accept & Save
        </Button>
        <Button variant="outline" onClick={onEdit} className="flex-1">
          Edit Requirements
        </Button>
        <Button variant="ghost" onClick={onReject}>
          Discard
        </Button>
      </div>
    </div>
  );
}
