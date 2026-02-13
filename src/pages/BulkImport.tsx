import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { PropertySelector } from '@/components/shared/PropertySelector';
import {
  RequirementTemplateSelector,
  findTemplateById,
} from '@/components/shared/RequirementTemplateSelector';
import { extractCOI, uploadCOIFile } from '@/services/ai-extraction';
import { createVendor, updateVendor } from '@/services/vendors';
import { fetchRequirementTemplates } from '@/services/requirements';
import { fetchProperty } from '@/services/properties';
import { compareCoverageToRequirements } from '@/services/compliance';
import { formatCurrency } from '@/lib/utils';
import type { COIExtractionResult } from '@/types';

interface FileEntry {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'extracted' | 'error';
  extraction?: COIExtractionResult;
  vendorName: string;
  vendorEmail: string;
  templateId: string; // '' means use default
  checked: boolean;
  error?: string;
  expanded: boolean;
}

let nextId = 0;

export default function BulkImport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [propertyId, setPropertyId] = useState('');
  const [defaultTemplateId, setDefaultTemplateId] = useState('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState({ current: 0, total: 0 });

  const { data: dbTemplates } = useQuery({
    queryKey: ['requirement-templates'],
    queryFn: fetchRequirementTemplates,
  });

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: FileEntry[] = Array.from(newFiles)
      .filter((f) => f.type === 'application/pdf')
      .map((f) => ({
        id: String(++nextId),
        file: f,
        status: 'pending' as const,
        vendorName: f.name.replace(/\.pdf$/i, ''),
        vendorEmail: '',
        templateId: '',
        checked: true,
        expanded: false,
      }));
    if (entries.length < newFiles.length) {
      toast.error('Only PDF files are accepted');
    }
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateEntry = (id: string, updates: Partial<FileEntry>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  // Process all pending files through AI extraction
  const processAll = async () => {
    setProcessing(true);
    const pending = files.filter((f) => f.status === 'pending');

    for (const entry of pending) {
      updateEntry(entry.id, { status: 'processing' });

      try {
        const result = await extractCOI(entry.file);
        updateEntry(entry.id, {
          status: 'extracted',
          extraction: result,
          vendorName: result.named_insured ?? entry.file.name.replace(/\.pdf$/i, ''),
          checked: result.success,
          expanded: true,
        });
      } catch (err) {
        updateEntry(entry.id, {
          status: 'error',
          checked: false,
          error: err instanceof Error ? err.message : 'Extraction failed',
        });
      }
    }

    setProcessing(false);
  };

  // Create vendors with full data: COI file, coverages, compliance
  const createVendors = async () => {
    const toCreate = files.filter((f) => f.checked && f.status === 'extracted' && f.extraction?.success);
    if (toCreate.length === 0) return;

    setCreating(true);
    setCreateProgress({ current: 0, total: toCreate.length });
    let created = 0;

    // Fetch property data once for endorsement/entity name checks
    let propertyData = null;
    if (propertyId) {
      try {
        propertyData = await fetchProperty(propertyId);
      } catch {
        // Non-critical
      }
    }

    for (const entry of toCreate) {
      setCreateProgress({ current: created + 1, total: toCreate.length });

      try {
        // 1. Create vendor record
        const vendor = await createVendor({
          name: entry.vendorName || 'Unknown Vendor',
          contact_email: entry.vendorEmail || undefined,
          property_id: propertyId || undefined,
        });

        // 2. Upload COI file to storage
        try {
          await uploadCOIFile(entry.file, 'vendor', vendor.id);
        } catch {
          // Storage might not be configured — continue
        }

        // 3. Update vendor with extracted coverage data
        const extraction = entry.extraction!;
        const now = new Date();
        let status: 'compliant' | 'non-compliant' | 'expired' = 'non-compliant';
        if (extraction.expiration_date) {
          status = new Date(extraction.expiration_date) > now ? 'compliant' : 'expired';
        }

        await updateVendor(vendor.id, {
          expiration_date: extraction.expiration_date,
          coverage: extraction.coverages,
          endorsements: extraction.endorsements ?? [],
          certificate_holder_on_coi: extraction.certificate_holder ?? '',
          status,
        } as any);

        // 4. Run compliance check against assigned template
        const templateId = entry.templateId || defaultTemplateId;
        if (templateId) {
          const template = findTemplateById(templateId, dbTemplates ?? []);
          if (template) {
            const compliance = compareCoverageToRequirements(
              extraction.coverages,
              template,
              { endorsements: extraction.endorsements, property: propertyData, certificateHolder: extraction.certificate_holder }
            );
            if (compliance.overall_status !== status) {
              await updateVendor(vendor.id, { status: compliance.overall_status } as any);
            }
          }
        }

        created++;
      } catch (err) {
        console.error(`Failed to create vendor "${entry.vendorName}":`, err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['vendors'] });
    toast.success(
      `${created} vendor${created === 1 ? '' : 's'} created with COI data and compliance checks`
    );
    setCreating(false);
    navigate('/vendors');
  };

  const checkedCount = files.filter((f) => f.checked && f.status === 'extracted').length;
  const allProcessed =
    files.length > 0 && files.every((f) => f.status !== 'pending' && f.status !== 'processing');
  const hasExtracted = files.some((f) => f.status === 'extracted');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Bulk Import"
        subtitle="Upload multiple vendor COIs at once to create vendor records in batch"
      />

      {/* Global settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Batch Settings</CardTitle>
          <CardDescription>
            These apply to all vendors in this batch unless overridden individually below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PropertySelector value={propertyId} onChange={setPropertyId} label="Property" />
          <RequirementTemplateSelector
            value={defaultTemplateId}
            onChange={setDefaultTemplateId}
            entityType="vendor"
            label="Default Requirement Template"
          />
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upload COIs</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drop all your vendor COIs here</p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse — PDF files only
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </CardContent>
      </Card>

      {/* File list with expanded detail rows */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {allProcessed ? 'Review & Configure' : 'Uploaded Files'}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </span>
            </div>
            {hasExtracted && (
              <CardDescription>
                Enter an email and select a requirement template for each vendor. Click a row to
                expand.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map((entry) => (
              <div key={entry.id} className="rounded-lg border overflow-hidden">
                {/* Row header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() =>
                    entry.status === 'extracted' &&
                    updateEntry(entry.id, { expanded: !entry.expanded })
                  }
                >
                  {entry.status === 'extracted' && (
                    <Checkbox
                      checked={entry.checked}
                      onCheckedChange={(v) => updateEntry(entry.id, { checked: v === true })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {entry.status === 'processing' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  )}
                  {entry.status === 'pending' && (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  {entry.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.vendorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.status === 'pending' && 'Waiting to process'}
                      {entry.status === 'processing' && 'Extracting...'}
                      {entry.status === 'extracted' &&
                        `${entry.extraction?.coverages?.length ?? 0} coverages · ${
                          entry.extraction?.expiration_date ?? 'No expiration'
                        }`}
                      {entry.status === 'error' && (entry.error ?? 'Extraction failed')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {entry.vendorEmail && entry.status === 'extracted' && (
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {entry.status === 'extracted' && (
                      <Badge variant="success" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Extracted
                      </Badge>
                    )}
                    {entry.status === 'error' && (
                      <Badge variant="danger" className="text-[10px]">
                        Error
                      </Badge>
                    )}
                    {entry.status === 'extracted' &&
                      (entry.expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(entry.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {entry.expanded && entry.status === 'extracted' && (
                  <div className="border-t bg-secondary/20 px-4 py-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Vendor Name</Label>
                        <Input
                          value={entry.vendorName}
                          onChange={(e) => updateEntry(entry.id, { vendorName: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Vendor name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Email Address
                        </Label>
                        <Input
                          type="email"
                          value={entry.vendorEmail}
                          onChange={(e) => updateEntry(entry.id, { vendorEmail: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="vendor@example.com"
                        />
                      </div>
                    </div>

                    <RequirementTemplateSelector
                      value={entry.templateId || defaultTemplateId}
                      onChange={(v) => updateEntry(entry.id, { templateId: v })}
                      entityType="vendor"
                      label="Requirement Template"
                      id={`template-${entry.id}`}
                    />

                    {/* Coverage summary */}
                    {entry.extraction?.coverages && entry.extraction.coverages.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Extracted Coverages
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.extraction.coverages.map((c, i) => {
                            const limit =
                              c.occurrence_limit ?? c.aggregate_limit ?? c.combined_single_limit;
                            return (
                              <Badge key={i} variant="outline" className="text-[10px]">
                                {c.type}
                                {limit ? ` ${formatCurrency(limit)}` : c.is_statutory ? ' Statutory' : ''}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {entry.extraction?.carrier && (
                      <p className="text-xs text-muted-foreground">
                        Carrier: {entry.extraction.carrier}
                        {entry.extraction.policy_number && ` · Policy: ${entry.extraction.policy_number}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex gap-3">
          {!allProcessed && (
            <Button
              onClick={processAll}
              disabled={processing || files.every((f) => f.status !== 'pending')}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing ({files.filter((f) => f.status === 'extracted').length}/
                  {files.length})...
                </>
              ) : (
                `Process ${files.filter((f) => f.status === 'pending').length} File${
                  files.filter((f) => f.status === 'pending').length === 1 ? '' : 's'
                }`
              )}
            </Button>
          )}
          {allProcessed && checkedCount > 0 && (
            <Button onClick={createVendors} disabled={creating} className="flex-1">
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating {createProgress.current}/{createProgress.total}...
                </>
              ) : (
                `Create ${checkedCount} Vendor${checkedCount === 1 ? '' : 's'}`
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => setFiles([])}>
            <X className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
