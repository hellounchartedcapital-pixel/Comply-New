import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatRelativeDate } from '@/lib/utils';
import type {
  Certificate,
  UploadSource,
  ProcessingStatus,
  ComplianceResult,
} from '@/types';

const SOURCE_LABELS: Record<UploadSource, { label: string; className: string }> = {
  pm_upload: { label: 'PM Upload', className: 'bg-slate-100 text-slate-700' },
  portal_upload: { label: 'Portal Upload', className: 'bg-blue-100 text-blue-700' },
};

const PROCESSING_STATUS_CONFIG: Record<
  ProcessingStatus,
  { label: string; className: string }
> = {
  processing: { label: 'Processing', className: 'bg-amber-100 text-amber-800' },
  extracted: { label: 'Extracted', className: 'bg-blue-100 text-blue-800' },
  review_confirmed: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
};

interface CertificateWithResults extends Certificate {
  compliance_results?: ComplianceResult[];
}

interface COIHistoryProps {
  certificates: CertificateWithResults[];
}

export function COIHistory({ certificates }: COIHistoryProps) {
  if (certificates.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-foreground">COI History</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No certificates uploaded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-foreground">COI History</h3>
      <div className="mt-3 divide-y divide-slate-100">
        {certificates.map((cert) => {
          const source = SOURCE_LABELS[cert.upload_source];
          const processing = PROCESSING_STATUS_CONFIG[cert.processing_status];
          const results = cert.compliance_results ?? [];
          const metCount = results.filter((r) => r.status === 'met').length;
          const totalCount = results.length;

          return (
            <Link
              key={cert.id}
              href={`/dashboard/certificates/${cert.id}/review`}
              className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {formatRelativeDate(cert.uploaded_at)}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${source.className}`}>
                    {source.label}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${processing.className}`}>
                    {processing.label}
                  </Badge>
                </div>
                {totalCount > 0 && (
                  <p className={`mt-0.5 text-xs ${metCount === totalCount ? 'text-emerald-600' : 'text-red-600'}`}>
                    {metCount} of {totalCount} requirements met
                  </p>
                )}
              </div>
              <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
