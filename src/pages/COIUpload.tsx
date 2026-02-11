import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfidenceIndicator } from '@/components/shared/ConfidenceIndicator';
import { extractCOI } from '@/services/ai-extraction';
import { FILE_UPLOAD_CONFIG } from '@/constants';
import type { COIExtractionResult, ExtractedCoverage } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

function UploadZone({
  onFileSelect,
  isExtracting,
}: {
  onFileSelect: (file: File) => void;
  isExtracting: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  if (isExtracting) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-accent/30 p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h3 className="mt-4 text-lg font-semibold">Analyzing Document</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          AI is extracting coverage information from your document...
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer',
        isDragging
          ? 'border-primary bg-accent/50'
          : 'border-border hover:border-primary/50 hover:bg-accent/20'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload COI document"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent transition-transform hover:scale-105">
        <Upload className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Drop your COI here</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        PDF, JPG, or PNG up to {FILE_UPLOAD_CONFIG.maxSizeMB}MB
      </p>
      <Button variant="outline" className="mt-4" type="button">
        Browse Files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_UPLOAD_CONFIG.acceptedExtensions}
        onChange={handleFileInput}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

function ExtractionResults({
  result,
  onApprove,
  onFlag,
  onReset,
}: {
  result: COIExtractionResult;
  onApprove: () => void;
  onFlag: () => void;
  onReset: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Document Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center rounded-lg bg-secondary">
            <div className="text-center">
              <FileText className="mx-auto h-16 w-16 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Document preview</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Policy Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Carrier" value={result.carrier ?? 'Not detected'} />
            <InfoRow label="Policy Number" value={result.policy_number ?? 'Not detected'} />
            <InfoRow label="Named Insured" value={result.named_insured ?? 'Not detected'} />
            <InfoRow
              label="Effective Date"
              value={result.effective_date ? formatDate(result.effective_date) : 'Not detected'}
            />
            <InfoRow
              label="Expiration Date"
              value={result.expiration_date ? formatDate(result.expiration_date) : 'Not detected'}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Confidence</span>
              <ConfidenceIndicator score={result.confidence_score} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.coverages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No coverages detected</p>
            ) : (
              result.coverages.map((coverage, i) => (
                <CoverageRow key={i} coverage={coverage} />
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={onApprove} className="flex-1">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve & Save
          </Button>
          <Button variant="outline" onClick={onFlag} className="flex-1">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Flag for Review
          </Button>
        </div>
        <Button variant="ghost" onClick={onReset} className="w-full">
          Upload a different document
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function CoverageRow({ coverage }: { coverage: ExtractedCoverage }) {
  const limit = coverage.occurrence_limit ?? coverage.aggregate_limit ?? coverage.combined_single_limit;

  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
      <div>
        <p className="text-sm font-medium">{coverage.type}</p>
        <p className="text-xs text-muted-foreground">
          {limit ? formatCurrency(limit) : coverage.is_statutory ? 'Statutory' : 'N/A'}
        </p>
      </div>
      <ConfidenceIndicator score={coverage.confidence_score} />
    </div>
  );
}

export default function COIUpload() {
  const [searchParams] = useSearchParams();
  const entityType = (searchParams.get('type') as 'vendor' | 'tenant') ?? 'vendor';

  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<COIExtractionResult | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!(FILE_UPLOAD_CONFIG.acceptedTypes as readonly string[]).includes(file.type)) {
        toast.error('Invalid file type. Please upload a PDF, JPG, or PNG.');
        return;
      }
      if (file.size > FILE_UPLOAD_CONFIG.maxSizeBytes) {
        toast.error(`File is too large. Maximum size is ${FILE_UPLOAD_CONFIG.maxSizeMB}MB.`);
        return;
      }

      setIsExtracting(true);
      try {
        const extractionResult = await extractCOI(file);
        setResult(extractionResult);
        if (extractionResult.success) {
          toast.success('Document analyzed successfully');
        } else {
          toast.error(extractionResult.error ?? 'Extraction failed');
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'AI extraction is temporarily unavailable. You can enter requirements manually.'
        );
      } finally {
        setIsExtracting(false);
      }
    },
    []
  );

  const handleApprove = useCallback(() => {
    toast.success('COI approved and saved');
    setResult(null);
  }, []);

  const handleFlag = useCallback(() => {
    toast.info('COI flagged for manual review');
    setResult(null);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="COI Upload"
        subtitle="Upload and analyze certificates of insurance"
        actions={
          <Tabs value={entityType} className="w-auto">
            <TabsList>
              <TabsTrigger value="vendor">Vendor COI</TabsTrigger>
              <TabsTrigger value="tenant">Tenant COI</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {result?.success ? (
        <ExtractionResults
          result={result}
          onApprove={handleApprove}
          onFlag={handleFlag}
          onReset={() => setResult(null)}
        />
      ) : (
        <UploadZone onFileSelect={handleFileSelect} isExtracting={isExtracting} />
      )}
    </div>
  );
}
