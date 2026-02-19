'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { getCOISignedUrl } from '@/lib/actions/certificates';
import { toast } from 'sonner';
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
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleViewPdf(certId: string) {
    setLoadingId(certId);
    try {
      const { url } = await getCOISignedUrl(certId);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get document URL');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDownload(certId: string) {
    setLoadingId(certId);
    try {
      const { url } = await getCOISignedUrl(certId);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coi-${certId}.pdf`;
      a.click();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download document');
    } finally {
      setLoadingId(null);
    }
  }

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
          const isLoading = loadingId === cert.id;

          return (
            <div
              key={cert.id}
              className="flex items-center justify-between gap-3 py-3 -mx-2 px-2 rounded"
            >
              <Link
                href={`/dashboard/certificates/${cert.id}/review`}
                className="min-w-0 flex-1 rounded p-1 -m-1 transition-colors hover:bg-slate-50"
              >
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
              </Link>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title={cert.file_path ? 'View PDF' : 'No file available'}
                  disabled={isLoading || !cert.file_path}
                  onClick={() => handleViewPdf(cert.id)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title={cert.file_path ? 'Download' : 'No file available'}
                  disabled={isLoading || !cert.file_path}
                  onClick={() => handleDownload(cert.id)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
