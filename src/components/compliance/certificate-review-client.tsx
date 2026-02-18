'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { formatCurrency, formatDate } from '@/lib/utils';
import {
  calculateCompliance,
  COVERAGE_LABELS,
  LIMIT_TYPE_LABELS,
  type CoverageInput,
  type EntityInput,
} from '@/lib/compliance/calculate';
import { confirmCertificate, type SavedCoverage, type SavedEntity } from '@/lib/actions/certificates';
import type {
  Certificate,
  ExtractedCoverage,
  ExtractedEntity,
  TemplateCoverageRequirement,
  PropertyEntity,
  CoverageType,
  LimitType,
  EntityType,
} from '@/types';

import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Minus,
  Info,
} from 'lucide-react';

// ============================================================================
// Types for editable state
// ============================================================================

interface EditableCoverage {
  _key: string; // stable key for React
  coverage_type: CoverageType;
  carrier_name: string;
  policy_number: string;
  limit_amount: string; // string for input
  limit_type: LimitType;
  effective_date: string;
  expiration_date: string;
  additional_insured_listed: boolean;
  waiver_of_subrogation: boolean;
  confidence_flag: boolean;
  raw_extracted_text: string | null;
  additional_insured_entities: string[];
}

interface EditableEntity {
  _key: string;
  entity_name: string;
  entity_address: string;
  entity_type: EntityType;
  confidence_flag: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const COVERAGE_TYPE_OPTIONS: { value: CoverageType; label: string }[] = Object.entries(
  COVERAGE_LABELS
).map(([value, label]) => ({ value: value as CoverageType, label }));

const LIMIT_TYPE_OPTIONS: { value: LimitType; label: string }[] = Object.entries(
  LIMIT_TYPE_LABELS
).map(([value, label]) => ({ value: value as LimitType, label }));

// ============================================================================
// Props
// ============================================================================

interface CertificateReviewClientProps {
  certificate: Certificate;
  extractedCoverages: ExtractedCoverage[];
  extractedEntities: ExtractedEntity[];
  templateRequirements: TemplateCoverageRequirement[];
  propertyEntities: PropertyEntity[];
  entityType: 'vendor' | 'tenant';
  entityId: string;
  entityName: string;
  propertyName: string | null;
  reviewerName: string | null;
  expirationThresholdDays: number;
}

// ============================================================================
// Component
// ============================================================================

export function CertificateReviewClient({
  certificate,
  extractedCoverages,
  extractedEntities,
  templateRequirements,
  propertyEntities,
  entityType,
  entityId,
  entityName,
  propertyName,
  reviewerName,
  expirationThresholdDays,
}: CertificateReviewClientProps) {
  const router = useRouter();
  const isConfirmed = certificate.processing_status === 'review_confirmed';
  const isFailed = certificate.processing_status === 'failed';
  const isProcessing = certificate.processing_status === 'processing';

  // ---- Failed state ----
  if (isFailed) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <BackLink entityType={entityType} entityId={entityId} entityName={entityName} />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold">Certificate could not be processed</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The document may be unreadable or corrupted.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href={`/dashboard/certificates/upload?${entityType}Id=${entityId}`}>
                Upload New COI
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/dashboard/${entityType}s/${entityId}`}>Go Back</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Processing state ----
  if (isProcessing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <BackLink entityType={entityType} entityId={entityId} entityName={entityName} />
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
          <h2 className="text-lg font-semibold">Processing Certificate</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This certificate is still being processed. Please wait...
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // ---- Review / Confirmed state ----
  return (
    <ReviewInterface
      certificate={certificate}
      extractedCoverages={extractedCoverages}
      extractedEntities={extractedEntities}
      templateRequirements={templateRequirements}
      propertyEntities={propertyEntities}
      entityType={entityType}
      entityId={entityId}
      entityName={entityName}
      propertyName={propertyName}
      reviewerName={reviewerName}
      isConfirmed={isConfirmed}
      expirationThresholdDays={expirationThresholdDays}
    />
  );
}

// ============================================================================
// Review Interface (extracted/review_confirmed)
// ============================================================================

function ReviewInterface({
  certificate,
  extractedCoverages,
  extractedEntities,
  templateRequirements,
  propertyEntities,
  entityType,
  entityId,
  entityName,
  propertyName,
  reviewerName,
  isConfirmed,
  expirationThresholdDays,
}: CertificateReviewClientProps & { isConfirmed: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  // Editable coverages
  const [coverages, setCoverages] = useState<EditableCoverage[]>(() =>
    extractedCoverages.map((c, i) => ({
      _key: c.id ?? `cov-${i}`,
      coverage_type: c.coverage_type,
      carrier_name: c.carrier_name ?? '',
      policy_number: c.policy_number ?? '',
      limit_amount: c.limit_amount != null ? String(c.limit_amount) : '',
      limit_type: c.limit_type ?? 'per_occurrence',
      effective_date: c.effective_date ?? '',
      expiration_date: c.expiration_date ?? '',
      additional_insured_listed: c.additional_insured_listed,
      waiver_of_subrogation: c.waiver_of_subrogation,
      confidence_flag: c.confidence_flag,
      raw_extracted_text: c.raw_extracted_text,
      additional_insured_entities: c.additional_insured_entities ?? [],
    }))
  );

  // Editable entities
  const [entities, setEntities] = useState<EditableEntity[]>(() =>
    extractedEntities.map((e, i) => ({
      _key: e.id ?? `ent-${i}`,
      entity_name: e.entity_name,
      entity_address: e.entity_address ?? '',
      entity_type: e.entity_type,
      confidence_flag: e.confidence_flag,
    }))
  );

  // ---- Coverage CRUD ----
  const updateCoverage = useCallback(
    (key: string, field: keyof EditableCoverage, value: unknown) => {
      setCoverages((prev) =>
        prev.map((c) => (c._key === key ? { ...c, [field]: value } : c))
      );
    },
    []
  );

  const removeCoverage = useCallback((key: string) => {
    setCoverages((prev) => prev.filter((c) => c._key !== key));
  }, []);

  const addCoverage = useCallback(() => {
    setCoverages((prev) => [
      ...prev,
      {
        _key: `new-cov-${Date.now()}`,
        coverage_type: 'general_liability',
        carrier_name: '',
        policy_number: '',
        limit_amount: '',
        limit_type: 'per_occurrence',
        effective_date: '',
        expiration_date: '',
        additional_insured_listed: false,
        waiver_of_subrogation: false,
        confidence_flag: true,
        raw_extracted_text: null,
        additional_insured_entities: [],
      },
    ]);
  }, []);

  // ---- Entity CRUD ----
  const updateEntity = useCallback(
    (key: string, field: keyof EditableEntity, value: unknown) => {
      setEntities((prev) =>
        prev.map((e) => (e._key === key ? { ...e, [field]: value } : e))
      );
    },
    []
  );

  const removeEntity = useCallback((key: string) => {
    setEntities((prev) => prev.filter((e) => e._key !== key));
  }, []);

  const addEntity = useCallback((type: EntityType) => {
    setEntities((prev) => [
      ...prev,
      {
        _key: `new-ent-${Date.now()}`,
        entity_name: '',
        entity_address: '',
        entity_type: type,
        confidence_flag: true,
      },
    ]);
  }, []);

  // ---- Live compliance calculation ----
  const complianceResult = useMemo(() => {
    const covInputs: CoverageInput[] = coverages.map((c) => ({
      coverage_type: c.coverage_type,
      carrier_name: c.carrier_name || null,
      policy_number: c.policy_number || null,
      limit_amount: c.limit_amount ? Number(c.limit_amount) : null,
      limit_type: c.limit_type,
      effective_date: c.effective_date || null,
      expiration_date: c.expiration_date || null,
      additional_insured_listed: c.additional_insured_listed,
      waiver_of_subrogation: c.waiver_of_subrogation,
    }));

    const entInputs: EntityInput[] = entities.map((e) => ({
      entity_name: e.entity_name,
      entity_address: e.entity_address || null,
      entity_type: e.entity_type,
    }));

    return calculateCompliance(
      covInputs,
      entInputs,
      templateRequirements.map((r) => ({
        id: r.id,
        coverage_type: r.coverage_type,
        is_required: r.is_required,
        minimum_limit: r.minimum_limit,
        limit_type: r.limit_type,
        requires_additional_insured: r.requires_additional_insured,
        requires_waiver_of_subrogation: r.requires_waiver_of_subrogation,
      })),
      propertyEntities.map((pe) => ({
        id: pe.id,
        entity_name: pe.entity_name,
        entity_address: pe.entity_address,
        entity_type: pe.entity_type,
      })),
      expirationThresholdDays
    );
  }, [coverages, entities, templateRequirements, propertyEntities, expirationThresholdDays]);

  // ---- Confirm handler ----
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const savedCovs: SavedCoverage[] = coverages.map((c) => ({
        coverage_type: c.coverage_type,
        carrier_name: c.carrier_name || null,
        policy_number: c.policy_number || null,
        limit_amount: c.limit_amount ? Number(c.limit_amount) : null,
        limit_type: c.limit_type,
        effective_date: c.effective_date || null,
        expiration_date: c.expiration_date || null,
        additional_insured_listed: c.additional_insured_listed,
        waiver_of_subrogation: c.waiver_of_subrogation,
        confidence_flag: c.confidence_flag,
        raw_extracted_text: c.raw_extracted_text,
        additional_insured_entities: c.additional_insured_entities,
      }));

      const savedEnts: SavedEntity[] = entities.map((e) => ({
        entity_name: e.entity_name,
        entity_address: e.entity_address || null,
        entity_type: e.entity_type,
        confidence_flag: e.confidence_flag,
      }));

      const result = await confirmCertificate(certificate.id, savedCovs, savedEnts);
      toast.success('Certificate confirmed. Compliance status updated.');
      router.push(`/dashboard/${result.entityType}s/${result.entityId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm certificate');
      setConfirming(false);
    }
  };

  // Compliance summary counts
  const metCount = complianceResult.coverageResults.filter((r) => r.status === 'met').length;
  const requiredCount = templateRequirements.filter((r) => r.is_required).length;

  // Detect expired coverages for the prominent banner
  const expiredCoverages = coverages.filter((c) => {
    if (!c.expiration_date) return false;
    return new Date(c.expiration_date + 'T00:00:00') < new Date();
  });

  const certHolderEntities = entities.filter((e) => e.entity_type === 'certificate_holder');
  const additionalInsuredEntities = entities.filter((e) => e.entity_type === 'additional_insured');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-1">
        <BackLink entityType={entityType} entityId={entityId} entityName={entityName} />
        <h1 className="text-2xl font-bold tracking-tight">Review Certificate</h1>
        <p className="text-sm text-muted-foreground">
          {entityType === 'vendor' ? 'Vendor' : 'Tenant'}:{' '}
          <span className="font-medium text-foreground">{entityName}</span>
          {propertyName && (
            <>
              {' '}
              &middot; Property:{' '}
              <span className="font-medium text-foreground">{propertyName}</span>
            </>
          )}
        </p>
      </div>

      {/* Expired coverage banner — highest priority, shown before everything */}
      {expiredCoverages.length > 0 && (
        <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                This certificate has expired coverage
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {expiredCoverages.map((c) => (
                  <li key={c._key} className="text-sm text-red-700">
                    {COVERAGE_LABELS[c.coverage_type]} expired on{' '}
                    <span className="font-medium">{formatDate(c.expiration_date)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed banner */}
      {isConfirmed && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Info className="h-5 w-5 flex-shrink-0 text-emerald-700" />
          <p className="text-sm text-emerald-800">
            This certificate was confirmed on{' '}
            <span className="font-medium">{formatDate(certificate.reviewed_at!)}</span>
            {reviewerName && (
              <>
                {' '}
                by <span className="font-medium">{reviewerName}</span>
              </>
            )}
            . Compliance results are final for this certificate.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* ============================================================ */}
        {/* LEFT: Extracted Data */}
        {/* ============================================================ */}
        <div className="space-y-6">
          {/* Coverage section */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Extracted Coverage Data
                </h2>
                {!isConfirmed && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Review the data below and correct any errors before confirming.
                  </p>
                )}
              </div>
              {!isConfirmed && (
                <Button size="sm" variant="outline" onClick={addCoverage}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Coverage
                </Button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {coverages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No coverages extracted. Click &quot;Add Coverage&quot; to add manually.
                </p>
              )}
              {coverages.map((cov) => (
                <CoverageCard
                  key={cov._key}
                  coverage={cov}
                  readOnly={isConfirmed}
                  onChange={(field, val) => updateCoverage(cov._key, field, val)}
                  onRemove={() => removeCoverage(cov._key)}
                />
              ))}
            </div>
          </div>

          {/* Entities section */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-foreground">Extracted Entities</h2>

            {/* Certificate Holder */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Certificate Holder
                </p>
                {!isConfirmed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => addEntity('certificate_holder')}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
              {certHolderEntities.length === 0 && (
                <p className="mt-1 text-sm text-muted-foreground">None extracted.</p>
              )}
              <div className="mt-2 space-y-2">
                {certHolderEntities.map((ent) => (
                  <EntityCard
                    key={ent._key}
                    entity={ent}
                    readOnly={isConfirmed}
                    onChange={(field, val) => updateEntity(ent._key, field, val)}
                    onRemove={() => removeEntity(ent._key)}
                  />
                ))}
              </div>
            </div>

            {/* Additional Insured */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Additional Insured
                </p>
                {!isConfirmed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => addEntity('additional_insured')}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
              {additionalInsuredEntities.length === 0 && (
                <p className="mt-1 text-sm text-muted-foreground">None extracted.</p>
              )}
              <div className="mt-2 space-y-2">
                {additionalInsuredEntities.map((ent) => (
                  <EntityCard
                    key={ent._key}
                    entity={ent}
                    readOnly={isConfirmed}
                    onChange={(field, val) => updateEntity(ent._key, field, val)}
                    onRemove={() => removeEntity(ent._key)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT: Compliance + Actions */}
        {/* ============================================================ */}
        <div className="space-y-6">
          {/* Compliance Check */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Compliance Check</h2>
              {templateRequirements.length > 0 && (
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    metCount === requiredCount && requiredCount > 0
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : requiredCount === 0
                        ? 'border-slate-200 bg-slate-50 text-slate-600'
                        : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  {metCount} of {requiredCount} requirements met
                </Badge>
              )}
            </div>

            {templateRequirements.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No requirement template assigned. Compliance cannot be checked.
              </p>
            ) : (
              <div className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="text-xs">Coverage</TableHead>
                      <TableHead className="text-xs">Required</TableHead>
                      <TableHead className="text-xs">Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templateRequirements.map((req) => {
                      const result = complianceResult.coverageResults.find(
                        (r) => r.coverage_requirement_id === req.id
                      );
                      const status = result?.status ?? 'missing';

                      // Find current editable coverage that matches
                      const match = coverages.find(
                        (c) =>
                          c.coverage_type === req.coverage_type &&
                          (req.limit_type == null || c.limit_type === req.limit_type)
                      );
                      const actualAmount = match?.limit_amount
                        ? Number(match.limit_amount)
                        : null;

                      return (
                        <TableRow key={req.id}>
                          <TableCell className="py-2">
                            <ComplianceStatusIcon status={status} />
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="text-xs font-medium">
                              {COVERAGE_LABELS[req.coverage_type]}
                            </div>
                            {req.limit_type && (
                              <div className="text-[10px] text-muted-foreground">
                                {LIMIT_TYPE_LABELS[req.limit_type]}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            {req.limit_type === 'statutory'
                              ? 'Statutory'
                              : req.minimum_limit != null
                                ? formatCurrency(req.minimum_limit)
                                : '—'}
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            {match
                              ? req.limit_type === 'statutory'
                                ? 'Statutory'
                                : actualAmount != null
                                  ? formatCurrency(actualAmount)
                                  : '—'
                              : <span className="text-slate-400">Not Found</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Gap descriptions */}
                {complianceResult.coverageResults.some(
                  (r) => r.gap_description
                ) && (
                  <div className="mt-3 space-y-1 border-t pt-3">
                    {complianceResult.coverageResults
                      .filter((r) => r.gap_description)
                      .map((r, i) => (
                        <p key={i} className="text-[11px] text-red-600">
                          {r.gap_description}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Entity compliance */}
            {propertyEntities.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-semibold text-foreground">Entity Matching</p>
                <div className="mt-2 space-y-1.5">
                  {propertyEntities.map((pe) => {
                    const result = complianceResult.entityResults.find(
                      (r) => r.property_entity_id === pe.id
                    );
                    const status = result?.status ?? 'missing';
                    return (
                      <div key={pe.id} className="flex items-center gap-2 text-xs">
                        <EntityStatusIcon status={status} />
                        <span className="flex-1 truncate">
                          {pe.entity_name}
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            ({pe.entity_type === 'certificate_holder' ? 'Cert Holder' : 'Add\'l Insured'})
                          </span>
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            status === 'found'
                              ? 'border-emerald-200 text-emerald-700'
                              : status === 'partial_match'
                                ? 'border-amber-200 text-amber-700'
                                : 'border-red-200 text-red-700'
                          }`}
                        >
                          {status === 'found' ? 'Found' : status === 'partial_match' ? 'Partial' : 'Missing'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
            {!isConfirmed && (
              <Button
                className="w-full bg-emerald-600 font-semibold hover:bg-emerald-700"
                disabled={confirming}
                onClick={handleConfirm}
              >
                {confirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm &amp; Save
                  </>
                )}
              </Button>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link
                href={`/dashboard/certificates/upload?${entityType}Id=${entityId}`}
              >
                Upload Different COI
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Coverage Card
// ============================================================================

function CoverageCard({
  coverage,
  readOnly,
  onChange,
  onRemove,
}: {
  coverage: EditableCoverage;
  readOnly: boolean;
  onChange: (field: keyof EditableCoverage, value: unknown) => void;
  onRemove: () => void;
}) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Derive a quick expiration status for the primary row
  const expirationStatus = (() => {
    if (!coverage.expiration_date) return null;
    const exp = new Date(coverage.expiration_date + 'T00:00:00');
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (exp < now) return 'expired' as const;
    if (exp < thirtyDays) return 'expiring_soon' as const;
    return 'valid' as const;
  })();

  return (
    <div
      className={`rounded-lg border p-4 ${
        !coverage.confidence_flag
          ? 'border-amber-300 bg-amber-50/50'
          : 'border-slate-200'
      }`}
    >
      {!coverage.confidence_flag && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          AI confidence is low — please verify this data
        </div>
      )}

      {/* PRIMARY: Coverage Type, Limit, Expiration, Endorsements */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Coverage Type */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Coverage Type</Label>
          {readOnly ? (
            <p className="text-sm font-medium">{COVERAGE_LABELS[coverage.coverage_type]}</p>
          ) : (
            <Select
              value={coverage.coverage_type}
              onValueChange={(val) => onChange('coverage_type', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COVERAGE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Limit Amount + Type */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Limit</Label>
          {readOnly ? (
            <p className="text-sm font-medium">
              {coverage.limit_type === 'statutory'
                ? 'Statutory'
                : coverage.limit_amount
                  ? `${formatCurrency(Number(coverage.limit_amount))} ${LIMIT_TYPE_LABELS[coverage.limit_type]?.toLowerCase() ?? ''}`
                  : '—'}
            </p>
          ) : (
            <div className="flex gap-1.5">
              <Input
                className="h-8 text-xs flex-1"
                type="number"
                value={coverage.limit_amount}
                onChange={(e) => onChange('limit_amount', e.target.value)}
                placeholder="e.g. 1000000"
              />
              <Select
                value={coverage.limit_type}
                onValueChange={(val) => onChange('limit_type', val)}
              >
                <SelectTrigger className="h-8 text-xs w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Expiration Date */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Expiration</Label>
          {readOnly ? (
            <div className="flex items-center gap-1.5">
              <p className="text-sm">{coverage.expiration_date ? formatDate(coverage.expiration_date) : '—'}</p>
              {expirationStatus === 'expired' && (
                <Badge variant="outline" className="text-[10px] border-red-200 bg-red-50 text-red-700">Expired</Badge>
              )}
              {expirationStatus === 'expiring_soon' && (
                <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">Expiring Soon</Badge>
              )}
            </div>
          ) : (
            <Input
              className="h-8 text-xs"
              type="date"
              value={coverage.expiration_date}
              onChange={(e) => onChange('expiration_date', e.target.value)}
            />
          )}
        </div>

        {/* Toggles */}
        <div className="flex items-end gap-4">
          <ToggleField
            label="Add'l Insured"
            checked={coverage.additional_insured_listed}
            readOnly={readOnly}
            onChange={(val) => onChange('additional_insured_listed', val)}
          />
          <ToggleField
            label="Waiver of Sub."
            checked={coverage.waiver_of_subrogation}
            readOnly={readOnly}
            onChange={(val) => onChange('waiver_of_subrogation', val)}
          />
        </div>
      </div>

      {/* SECONDARY: Expandable details section */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {detailsExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Details
        </button>
        {!readOnly && (
          <button
            onClick={onRemove}
            className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      {detailsExpanded && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Carrier */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Carrier</Label>
              {readOnly ? (
                <p className="text-sm">{coverage.carrier_name || '—'}</p>
              ) : (
                <Input
                  className="h-8 text-xs"
                  value={coverage.carrier_name}
                  onChange={(e) => onChange('carrier_name', e.target.value)}
                  placeholder="Carrier name"
                />
              )}
            </div>

            {/* Policy Number */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Policy Number</Label>
              {readOnly ? (
                <p className="text-sm">{coverage.policy_number || '—'}</p>
              ) : (
                <Input
                  className="h-8 text-xs"
                  value={coverage.policy_number}
                  onChange={(e) => onChange('policy_number', e.target.value)}
                  placeholder="Policy #"
                />
              )}
            </div>

            {/* Effective Date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Effective Date</Label>
              {readOnly ? (
                <p className="text-sm">{coverage.effective_date ? formatDate(coverage.effective_date) : '—'}</p>
              ) : (
                <Input
                  className="h-8 text-xs"
                  type="date"
                  value={coverage.effective_date}
                  onChange={(e) => onChange('effective_date', e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Raw extracted text */}
          {coverage.raw_extracted_text && (
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Raw Extracted Text</Label>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-100 p-2 text-[11px] text-slate-700">
                {coverage.raw_extracted_text}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Entity Card
// ============================================================================

function EntityCard({
  entity,
  readOnly,
  onChange,
  onRemove,
}: {
  entity: EditableEntity;
  readOnly: boolean;
  onChange: (field: keyof EditableEntity, value: unknown) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        !entity.confidence_flag ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'
      }`}
    >
      <div className="flex-1 space-y-2">
        {!entity.confidence_flag && (
          <div className="flex items-center gap-1 text-xs text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            Low confidence — verify
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            {readOnly ? (
              <p className="text-sm">{entity.entity_name}</p>
            ) : (
              <Input
                className="h-8 text-xs"
                value={entity.entity_name}
                onChange={(e) => onChange('entity_name', e.target.value)}
                placeholder="Entity name"
              />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Address</Label>
            {readOnly ? (
              <p className="text-sm">{entity.entity_address || '—'}</p>
            ) : (
              <Input
                className="h-8 text-xs"
                value={entity.entity_address}
                onChange={(e) => onChange('entity_address', e.target.value)}
                placeholder="Address"
              />
            )}
          </div>
        </div>
      </div>
      {!readOnly && (
        <button
          onClick={onRemove}
          className="mt-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Small helper components
// ============================================================================

function BackLink({ entityType, entityId, entityName }: { entityType: string; entityId: string; entityName?: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href={`/dashboard/${entityType}s/${entityId}`} className="hover:text-foreground">
        {entityName || (entityType === 'vendor' ? 'Vendor' : 'Tenant')}
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="font-medium text-foreground">Review Certificate</span>
    </nav>
  );
}

function ToggleField({
  label,
  checked,
  readOnly,
  onChange,
}: {
  label: string;
  checked: boolean;
  readOnly: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-slate-300'
        } ${readOnly ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  );
}

function ComplianceStatusIcon({ status }: { status: string }) {
  if (status === 'met') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (status === 'not_met') {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }
  if (status === 'missing') {
    return <Minus className="h-4 w-4 text-slate-400" />;
  }
  // not_required
  return <span className="text-[10px] text-slate-400">N/A</span>;
}

function EntityStatusIcon({ status }: { status: string }) {
  if (status === 'found') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  }
  if (status === 'partial_match') {
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
  }
  return <XCircle className="h-3.5 w-3.5 text-red-500" />;
}
