import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Minus,
  type LucideIcon,
} from 'lucide-react';

export const COVERAGE_TYPES = [
  { key: 'general_liability', label: 'General Liability' },
  { key: 'automobile_liability', label: 'Automobile Liability' },
  { key: 'workers_compensation', label: "Workers' Compensation" },
  { key: 'umbrella_excess', label: 'Umbrella / Excess' },
  { key: 'professional_liability', label: 'Professional Liability / E&O' },
  { key: 'property_insurance', label: 'Property Insurance' },
  { key: 'business_interruption', label: 'Business Interruption' },
] as const;

export type CoverageTypeKey = (typeof COVERAGE_TYPES)[number]['key'];

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: LucideIcon;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  compliant: {
    label: 'Compliant',
    color: 'hsl(160, 82%, 39%)',
    bgColor: 'bg-success/15',
    textColor: 'text-success',
    borderColor: 'border-success/30',
    icon: CheckCircle2,
  },
  'non-compliant': {
    label: 'Non-Compliant',
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'bg-destructive/15',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/30',
    icon: XCircle,
  },
  expiring: {
    label: 'Expiring Soon',
    color: 'hsl(38, 92%, 50%)',
    bgColor: 'bg-warning/15',
    textColor: 'text-warning',
    borderColor: 'border-warning/30',
    icon: AlertTriangle,
  },
  expired: {
    label: 'Expired',
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'bg-destructive/15',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/30',
    icon: Clock,
  },
  'not-required': {
    label: 'Not Required',
    color: 'hsl(215, 16%, 47%)',
    bgColor: 'bg-secondary',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
    icon: Minus,
  },
};

export const SOURCE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  building_default: {
    label: 'Building Default',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  lease_extracted: {
    label: 'Lease Extracted',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  coi_prefill: {
    label: 'COI Pre-fill',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  manual: {
    label: 'Manual',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
};

export const FILE_UPLOAD_CONFIG = {
  maxSizeBytes: 25 * 1024 * 1024,
  maxSizeMB: 25,
  acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  acceptedExtensions: '.pdf,.jpg,.jpeg,.png',
} as const;

export const PAGINATION = {
  defaultPageSize: 25,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  high: 85,
  medium: 60,
} as const;
