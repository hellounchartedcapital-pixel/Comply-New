import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { PropertySelector } from '@/components/shared/PropertySelector';
import { extractCOI } from '@/services/ai-extraction';
import { createVendor } from '@/services/vendors';
import type { COIExtractionResult } from '@/types';

interface FileEntry {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'extracted' | 'error';
  extraction?: COIExtractionResult;
  vendorName?: string;
  checked: boolean;
  error?: string;
}

let nextId = 0;

export default function BulkImport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [propertyId, setPropertyId] = useState('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [creating, setCreating] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: FileEntry[] = Array.from(newFiles)
      .filter((f) => f.type === 'application/pdf')
      .map((f) => ({
        id: String(++nextId),
        file: f,
        status: 'pending' as const,
        checked: true,
      }));
    if (entries.length < newFiles.length) {
      toast.error('Only PDF files are accepted');
    }
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
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

  const processAll = async () => {
    setProcessing(true);
    const pending = files.filter((f) => f.status === 'pending');

    for (const entry of pending) {
      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: 'processing' } : f))
      );

      try {
        const result = await extractCOI(entry.file);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  status: 'extracted',
                  extraction: result,
                  vendorName: result.named_insured ?? entry.file.name.replace(/\.pdf$/i, ''),
                  checked: result.success,
                }
              : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  status: 'error',
                  checked: false,
                  error: err instanceof Error ? err.message : 'Extraction failed',
                }
              : f
          )
        );
      }
    }

    setProcessing(false);
  };

  const createVendors = async () => {
    const toCreate = files.filter((f) => f.checked && f.status === 'extracted');
    if (toCreate.length === 0) return;

    setCreating(true);
    let created = 0;

    for (const entry of toCreate) {
      try {
        await createVendor({
          name: entry.vendorName ?? 'Unknown Vendor',
          property_id: propertyId || undefined,
        });
        created++;
      } catch {
        // Continue on individual failure
      }
    }

    queryClient.invalidateQueries({ queryKey: ['vendors'] });
    toast.success(`${created} vendor${created === 1 ? '' : 's'} created — compliance checks complete`);
    setCreating(false);
    navigate('/vendors');
  };

  const checkedCount = files.filter((f) => f.checked && f.status === 'extracted').length;
  const allProcessed = files.length > 0 && files.every((f) => f.status !== 'pending' && f.status !== 'processing');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Bulk Import"
        subtitle="Upload multiple vendor COIs at once to create vendor records in batch"
      />

      {/* Property Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Property</CardTitle>
          <CardDescription>All vendors in this batch will be assigned to this property.</CardDescription>
        </CardHeader>
        <CardContent>
          <PropertySelector value={propertyId} onChange={setPropertyId} label="Property" />
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
            <p className="text-xs text-muted-foreground mt-1">or click to browse — PDF files only</p>
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

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg border p-3">
                  {entry.status === 'extracted' && (
                    <Checkbox
                      checked={entry.checked}
                      onCheckedChange={(v) =>
                        setFiles((prev) =>
                          prev.map((f) => (f.id === entry.id ? { ...f, checked: v === true } : f))
                        )
                      }
                    />
                  )}
                  {entry.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {entry.status === 'pending' && <FileText className="h-4 w-4 text-muted-foreground" />}
                  {entry.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                  {entry.status === 'extracted' && !entry.checked && <AlertCircle className="h-4 w-4 text-muted-foreground" />}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.vendorName ?? entry.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.status === 'pending' && 'Waiting to process'}
                      {entry.status === 'processing' && 'Extracting...'}
                      {entry.status === 'extracted' &&
                        `${entry.extraction?.coverages?.length ?? 0} coverages found`}
                      {entry.status === 'error' && (entry.error ?? 'Extraction failed')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.status === 'extracted' && (
                      <Badge variant="success" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Extracted
                      </Badge>
                    )}
                    {entry.status === 'error' && (
                      <Badge variant="danger" className="text-[10px]">Error</Badge>
                    )}
                    <button onClick={() => removeFile(entry.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex gap-3">
          {!allProcessed && (
            <Button onClick={processAll} disabled={processing || files.every((f) => f.status !== 'pending')} className="flex-1">
              {processing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              ) : (
                'Process All'
              )}
            </Button>
          )}
          {allProcessed && checkedCount > 0 && (
            <Button onClick={createVendors} disabled={creating} className="flex-1">
              {creating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : (
                `Create ${checkedCount} Vendor${checkedCount === 1 ? '' : 's'}`
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => setFiles([])}>
            <X className="mr-2 h-4 w-4" />Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
