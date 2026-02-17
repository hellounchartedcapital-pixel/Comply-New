import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type {
  TemplateCoverageRequirement,
  ExtractedCoverage,
  ComplianceResult,
  CoverageType,
  LimitType,
} from '@/types';

const COVERAGE_LABELS: Record<CoverageType, string> = {
  general_liability: 'General Liability',
  automobile_liability: 'Automobile Liability',
  workers_compensation: "Workers' Compensation",
  employers_liability: "Employers' Liability",
  umbrella_excess_liability: 'Umbrella / Excess Liability',
  professional_liability_eo: 'Professional Liability (E&O)',
  property_inland_marine: 'Property / Inland Marine',
  pollution_liability: 'Pollution Liability',
  liquor_liability: 'Liquor Liability',
  cyber_liability: 'Cyber Liability',
};

const LIMIT_TYPE_LABELS: Record<LimitType, string> = {
  per_occurrence: 'Per Occurrence',
  aggregate: 'Aggregate',
  combined_single_limit: 'Combined Single Limit',
  statutory: 'Statutory',
  per_person: 'Per Person',
  per_accident: 'Per Accident',
};

function formatLimit(amount: number | null, limitType: LimitType | null): string {
  if (limitType === 'statutory') return 'Statutory';
  if (amount == null) return '—';
  return formatCurrency(amount);
}

function StatusIcon({ status }: { status: 'met' | 'not_met' | 'missing' | 'not_required' }) {
  if (status === 'met') {
    return (
      <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (status === 'not_met') {
    return (
      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  if (status === 'missing') {
    return (
      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      </svg>
    );
  }
  // not_required
  return (
    <span className="text-xs text-slate-400">N/A</span>
  );
}

function SubCheck({
  label,
  met,
}: {
  label: string;
  met: boolean | null;
}) {
  if (met === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px]">
      {met ? (
        <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={met ? 'text-slate-600' : 'text-red-600'}>{label}</span>
    </span>
  );
}

interface ComplianceBreakdownProps {
  requirements: TemplateCoverageRequirement[];
  extractedCoverages: ExtractedCoverage[];
  complianceResults: ComplianceResult[];
  hasCertificate: boolean;
}

export function ComplianceBreakdown({
  requirements,
  extractedCoverages,
  complianceResults,
  hasCertificate,
}: ComplianceBreakdownProps) {
  const met = complianceResults.filter((r) => r.status === 'met').length;
  const total = requirements.filter((r) => r.is_required).length;

  if (requirements.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-foreground">Compliance Status</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No requirement template assigned. Assign a template to track compliance.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Compliance Status</h3>
        {hasCertificate && (
          <Badge
            variant="outline"
            className={`text-xs ${
              met === total
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {met} of {total} requirements met
          </Badge>
        )}
      </div>

      {!hasCertificate ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No certificate on file. Upload a COI to check compliance.
        </p>
      ) : (
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Coverage</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead className="hidden sm:table-cell">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((req) => {
                // Find matching compliance result
                const result = complianceResults.find(
                  (r) => r.coverage_requirement_id === req.id
                );
                const status = result?.status ?? 'missing';

                // Find matching extracted coverage
                const extracted = extractedCoverages.find(
                  (e) =>
                    e.coverage_type === req.coverage_type &&
                    e.limit_type === req.limit_type
                );

                return (
                  <TableRow key={req.id}>
                    <TableCell>
                      <StatusIcon status={status} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {COVERAGE_LABELS[req.coverage_type]}
                      </div>
                      {req.limit_type && (
                        <div className="text-xs text-muted-foreground">
                          {LIMIT_TYPE_LABELS[req.limit_type]}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatLimit(req.minimum_limit, req.limit_type)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {extracted ? (
                        formatLimit(extracted.limit_amount, extracted.limit_type)
                      ) : (
                        <span className="text-slate-400">Not Found</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        {req.requires_additional_insured && (
                          <SubCheck
                            label="Additional Insured"
                            met={extracted?.additional_insured_listed ?? null}
                          />
                        )}
                        {req.requires_waiver_of_subrogation && (
                          <SubCheck
                            label="Waiver of Subrogation"
                            met={extracted?.waiver_of_subrogation ?? null}
                          />
                        )}
                        {result?.status === 'not_met' && result.gap_description && (
                          <span className="text-[11px] text-red-600">
                            {result.gap_description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
