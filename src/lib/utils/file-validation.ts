const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// PDF magic number: %PDF (hex: 25 50 44 46)
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a file is a PDF by checking its header bytes (magic number).
 * Also validates file size (max 10MB).
 */
export async function validatePDFFile(file: File): Promise<FileValidationResult> {
  // Check file size first
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMB}MB). Maximum allowed size is 10MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  // Read first 4 bytes and check PDF magic number
  const headerBytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isPDF = PDF_MAGIC_BYTES.every((byte, i) => headerBytes[i] === byte);

  if (!isPDF) {
    return {
      valid: false,
      error: 'This file does not appear to be a valid PDF. Please upload a PDF document.',
    };
  }

  return { valid: true };
}

/**
 * Compute a SHA-256 hash of the file contents for duplicate detection.
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
