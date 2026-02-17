'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StepUploadProps {
  hasProperty: boolean;
  onGoBack: () => void;
  onFinish: () => void;
  saving: boolean;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'done';

export function StepUpload({ hasProperty, onGoBack, onFinish, saving }: StepUploadProps) {
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFileSelect(file: File) {
    if (!file.type.includes('pdf')) return;
    setFileName(file.name);
    setUploadState('uploading');

    // Simulate upload progress
    setTimeout(() => {
      setUploadState('processing');
      // Simulate processing
      setTimeout(() => {
        setUploadState('done');
      }, 2000);
    }, 1000);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  // No property — can't upload yet
  if (!hasProperty) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            See SmartCOI in action
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a certificate of insurance to see how fast compliance
            checking can be.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">
            Add a property first to start uploading COIs
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Go back and add a property, or head to the dashboard to set things
            up later.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={onGoBack}>
              Go back
            </Button>
            <Button onClick={onFinish} disabled={saving}>
              {saving ? 'Finishing...' : 'Go to Dashboard'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          See SmartCOI in action
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a certificate of insurance to see how fast compliance checking
          can be.
        </p>
      </div>

      {/* Quick-add vendor */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Quick-add a vendor (optional)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Vendor name</Label>
            <Input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="ABC Contractors"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contact email</Label>
            <Input
              type="email"
              value={vendorEmail}
              onChange={(e) => setVendorEmail(e.target.value)}
              placeholder="vendor@example.com"
            />
          </div>
        </div>
      </div>

      {/* Upload area */}
      {uploadState === 'idle' && (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
            dragOver
              ? 'border-brand bg-brand-lightest'
              : 'border-slate-300 bg-white hover:border-brand hover:bg-slate-50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileInput}
          />
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-lightest">
            <svg className="h-6 w-6 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">
            Drag &amp; drop a PDF certificate here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse
          </p>
        </div>
      )}

      {/* Upload / Processing state */}
      {uploadState === 'uploading' && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-sm font-medium text-foreground">
            Uploading {fileName}...
          </p>
        </div>
      )}

      {uploadState === 'processing' && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-sm font-medium text-foreground">
            Analyzing certificate...
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            AI is extracting coverage information
          </p>
        </div>
      )}

      {uploadState === 'done' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-brand bg-brand-lightest p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Certificate processed!
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fileName}
                </p>
              </div>
            </div>
          </div>

          {/* Placeholder extraction results */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h4 className="text-sm font-semibold text-foreground">
              Extracted Coverages (Preview)
            </h4>
            <div className="mt-3 space-y-2">
              {[
                { type: 'General Liability', limit: '$1,000,000 / $2,000,000' },
                { type: 'Automobile Liability', limit: '$1,000,000 CSL' },
                { type: "Workers' Compensation", limit: 'Statutory' },
                { type: 'Umbrella Liability', limit: '$5,000,000' },
              ].map((c) => (
                <div
                  key={c.type}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                >
                  <span className="text-xs font-medium text-slate-700">
                    {c.type}
                  </span>
                  <span className="text-xs text-slate-500">{c.limit}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-800">
                Compliance check: All requirements met
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              This is a preview. Full extraction and compliance review will be
              available from the dashboard.
            </p>
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="w-full font-semibold"
        onClick={onFinish}
        disabled={saving}
      >
        {saving ? 'Finishing...' : 'Go to Dashboard'}
      </Button>
    </div>
  );
}
