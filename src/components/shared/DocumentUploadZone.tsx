import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, X, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FILE_UPLOAD_CONFIG } from '@/constants';
import { cn } from '@/lib/utils';

interface DocumentUploadZoneProps {
  label: string;
  helperText: string;
  acceptedTypes?: readonly string[];
  acceptedExtensions?: string;
  maxSizeBytes?: number;
  maxSizeMB?: number;
  onUpload: (file: File) => void;
  isProcessing?: boolean;
  processingText?: string;
  uploadedFileName?: string;
  uploadedFileSize?: number;
  onRemove?: () => void;
  error?: string;
  className?: string;
}

export function DocumentUploadZone({
  label,
  helperText,
  acceptedTypes = FILE_UPLOAD_CONFIG.acceptedTypes,
  acceptedExtensions = FILE_UPLOAD_CONFIG.acceptedExtensions,
  maxSizeBytes = FILE_UPLOAD_CONFIG.maxSizeBytes,
  maxSizeMB = FILE_UPLOAD_CONFIG.maxSizeMB,
  onUpload,
  isProcessing = false,
  processingText = 'Analyzing document...',
  uploadedFileName,
  uploadedFileSize,
  onRemove,
  error,
  className,
}: DocumentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Animate progress bar realistically when processing
  useEffect(() => {
    if (!isProcessing) {
      setProgress(0);
      return;
    }
    setProgress(10);
    const steps = [
      { target: 30, delay: 400 },
      { target: 50, delay: 1200 },
      { target: 65, delay: 2500 },
      { target: 78, delay: 4000 },
      { target: 85, delay: 6000 },
      { target: 90, delay: 9000 },
      { target: 94, delay: 13000 },
    ];
    const timers = steps.map(({ target, delay }) =>
      setTimeout(() => setProgress(target), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isProcessing]);

  const validateAndUpload = useCallback(
    (file: File) => {
      setValidationError(null);

      if (!(acceptedTypes as readonly string[]).includes(file.type)) {
        setValidationError('Unsupported file type. Please upload a PDF, JPG, or PNG.');
        return;
      }
      if (file.size > maxSizeBytes) {
        setValidationError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
        return;
      }

      onUpload(file);
    },
    [acceptedTypes, maxSizeBytes, maxSizeMB, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndUpload(file);
    },
    [validateAndUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndUpload(file);
      // Reset input so re-uploading same file works
      if (inputRef.current) inputRef.current.value = '';
    },
    [validateAndUpload]
  );

  const displayError = error || validationError;

  // Processing state
  if (isProcessing) {
    return (
      <div className={cn('rounded-xl border-2 border-dashed border-primary/30 bg-accent/30 p-10', className)}>
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium">{processingText}</p>
          <div className="mt-4 flex w-full max-w-xs flex-col gap-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${progress}%`, transition: 'width 0.6s ease-out' }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        </div>
      </div>
    );
  }

  // File uploaded state
  if (uploadedFileName) {
    return (
      <div className={cn('rounded-xl border-2 border-dashed border-primary/30 bg-accent/10 p-6', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{uploadedFileName}</p>
              {uploadedFileSize && (
                <p className="text-xs text-muted-foreground">
                  {(uploadedFileSize / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Replace
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                type="button"
                className="text-destructive hover:text-destructive"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptedExtensions}
          onChange={handleFileInput}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    );
  }

  // Default upload zone
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">{label}</label>
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer',
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
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent transition-transform hover:scale-105">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground text-center max-w-sm">
          {helperText}
        </p>
        <Button variant="outline" className="mt-4" type="button">
          Browse Files
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          {acceptedExtensions.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')} up to {maxSizeMB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={acceptedExtensions}
          onChange={handleFileInput}
          className="hidden"
          aria-hidden="true"
        />
      </div>
      {displayError && (
        <p className="text-sm text-destructive">{displayError}</p>
      )}
    </div>
  );
}
