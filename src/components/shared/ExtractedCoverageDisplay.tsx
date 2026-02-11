import { Shield, Calendar, Building2, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ExtractedCoverage } from '@/types';

interface ExtractedCoverageDisplayProps {
  coverages: ExtractedCoverage[];
  carrier?: string;
  policyNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
  overallConfidence?: number;
  title?: string;
  description?: string;
  className?: string;
}

export function ExtractedCoverageDisplay({
  coverages,
  carrier,
  policyNumber,
  effectiveDate,
  expirationDate,
  overallConfidence,
  title = 'Extracted Coverage',
  description = 'These are the coverages found on the uploaded certificate.',
  className,
}: ExtractedCoverageDisplayProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Policy summary row */}
        {(carrier || policyNumber || effectiveDate || expirationDate) && (
          <div className="grid gap-3 rounded-lg bg-secondary/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {carrier && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Carrier</p>
                  <p className="text-sm font-medium">{carrier}</p>
                </div>
              </div>
            )}
            {policyNumber && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Policy Number</p>
                  <p className="text-sm font-medium">{policyNumber}</p>
                </div>
              </div>
            )}
            {effectiveDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Effective Date</p>
                  <p className="text-sm font-medium">{formatDate(effectiveDate)}</p>
                </div>
              </div>
            )}
            {expirationDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Expiration Date</p>
                  <p className="text-sm font-medium">{formatDate(expirationDate)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {overallConfidence !== undefined && (
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-2">
            <span className="text-sm text-muted-foreground">Overall Confidence</span>
            <ConfidenceIndicator score={overallConfidence} />
          </div>
        )}

        {/* Coverage list */}
        {coverages.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No coverages detected on this certificate.
          </p>
        ) : (
          <div className="space-y-2">
            {coverages.map((coverage, i) => (
              <CoverageCard key={i} coverage={coverage} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CoverageCard({ coverage }: { coverage: ExtractedCoverage }) {
  const limits: { label: string; value: string }[] = [];

  if (coverage.occurrence_limit) {
    limits.push({ label: 'Per Occurrence', value: formatCurrency(coverage.occurrence_limit) });
  }
  if (coverage.aggregate_limit) {
    limits.push({ label: 'Aggregate', value: formatCurrency(coverage.aggregate_limit) });
  }
  if (coverage.combined_single_limit) {
    limits.push({ label: 'Combined Single Limit', value: formatCurrency(coverage.combined_single_limit) });
  }
  if (coverage.is_statutory) {
    limits.push({ label: 'Limit', value: 'Statutory' });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{coverage.type}</p>
          {limits.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {limits.map((limit, i) => (
                <span key={i} className="text-xs text-muted-foreground">
                  {limit.label}: <span className="font-medium text-foreground">{limit.value}</span>
                </span>
              ))}
            </div>
          )}
          {coverage.expiration_date && (
            <p className="text-xs text-muted-foreground">
              Expires: {formatDate(coverage.expiration_date)}
            </p>
          )}
        </div>
        <ConfidenceIndicator score={coverage.confidence_score} />
      </div>
    </div>
  );
}
