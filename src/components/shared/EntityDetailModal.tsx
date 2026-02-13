import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Mail,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Link2,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from './StatusBadge';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type {
  Vendor,
  Tenant,
  ExtractedCoverage,
  ExtractedEndorsement,
  ComplianceField,
  RequirementTemplate,
  EntityType,
  Property,
} from '@/types';
import { compareCoverageToRequirements, getComplianceGaps } from '@/services/compliance';
import { sendCOIRequest } from '@/services/settings';
import { generatePortalLink } from '@/services/portal-links';

interface EntityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Vendor | Tenant;
  entityType: EntityType;
  coverages?: ExtractedCoverage[];
  coiUrl?: string;
  template?: RequirementTemplate | null;
  property?: Property | null;
  onDelete: () => void;
  onEdit?: () => void;
  isDeleting?: boolean;
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ComplianceFieldRow({ field }: { field: ComplianceField }) {
  const statusIcons = {
    compliant: <CheckCircle2 className="h-4 w-4 text-success" />,
    'non-compliant': <XCircle className="h-4 w-4 text-destructive" />,
    expiring: <AlertTriangle className="h-4 w-4 text-warning" />,
    expired: <Clock className="h-4 w-4 text-destructive" />,
    'not-required': null,
  };

  const formatValue = (val: number | boolean | string | null) => {
    if (val === null) return 'Missing';
    if (typeof val === 'number') return formatCurrency(val);
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return val;
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
      <div className="flex-1">
        <p className="text-sm font-medium">{field.field_name}</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Required: {formatValue(field.required_value)}</span>
          <span>Found: {formatValue(field.actual_value)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {statusIcons[field.status]}
        <Badge
          variant={
            field.status === 'compliant'
              ? 'success'
              : field.status === 'expiring'
                ? 'warning'
                : field.status === 'not-required'
                  ? 'secondary'
                  : 'destructive'
          }
          className="text-[10px]"
        >
          {field.status === 'compliant'
            ? 'Met'
            : field.status === 'non-compliant'
              ? 'Gap'
              : field.status === 'expiring'
                ? 'Expiring'
                : field.status === 'expired'
                  ? 'Expired'
                  : 'N/A'}
        </Badge>
      </div>
    </div>
  );
}

function CoveragesList({ coverages }: { coverages: ExtractedCoverage[] }) {
  if (coverages.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No coverages on file
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {coverages.map((coverage, i) => {
        const limit =
          coverage.occurrence_limit ??
          coverage.aggregate_limit ??
          coverage.combined_single_limit;

        return (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{coverage.type}</p>
              <p className="text-xs text-muted-foreground">
                {limit
                  ? formatCurrency(limit)
                  : coverage.is_statutory
                    ? 'Statutory'
                    : 'N/A'}
                {coverage.expiration_date && ` · Exp: ${coverage.expiration_date}`}
              </p>
            </div>
            <ConfidenceIndicator score={coverage.confidence_score} />
          </div>
        );
      })}
    </div>
  );
}

function EditCoveragesForm({
  coverages,
  onSave,
  onCancel,
}: {
  coverages: ExtractedCoverage[];
  onSave: (updated: ExtractedCoverage[]) => void;
  onCancel: () => void;
}) {
  const [editData, setEditData] = useState<ExtractedCoverage[]>(
    coverages.length > 0
      ? coverages
      : [
          { type: 'General Liability', occurrence_limit: 0, aggregate_limit: 0, confidence_score: 100 },
          { type: 'Automobile Liability', combined_single_limit: 0, confidence_score: 100 },
          { type: "Workers' Compensation", is_statutory: true, confidence_score: 100 },
          { type: 'Umbrella / Excess', occurrence_limit: 0, confidence_score: 100 },
        ]
  );

  const updateCoverage = (index: number, updates: Partial<ExtractedCoverage>) => {
    setEditData((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates, confidence_score: 100 } : c))
    );
  };

  return (
    <div className="space-y-4">
      {editData.map((cov, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">{cov.type}</p>
          <div className="grid grid-cols-2 gap-2">
            {cov.is_statutory !== undefined ? (
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cov.is_statutory}
                  onChange={(e) => updateCoverage(i, { is_statutory: e.target.checked })}
                  className="rounded"
                />
                <Label className="text-xs">Statutory</Label>
              </div>
            ) : (
              <>
                {(cov.occurrence_limit !== undefined || cov.combined_single_limit === undefined) && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {cov.combined_single_limit !== undefined ? 'CSL' : 'Occurrence'}
                    </Label>
                    <Input
                      type="number"
                      value={cov.occurrence_limit ?? cov.combined_single_limit ?? ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (cov.combined_single_limit !== undefined) {
                          updateCoverage(i, { combined_single_limit: val });
                        } else {
                          updateCoverage(i, { occurrence_limit: val });
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                )}
                {cov.aggregate_limit !== undefined && (
                  <div className="space-y-1">
                    <Label className="text-xs">Aggregate</Label>
                    <Input
                      type="number"
                      value={cov.aggregate_limit ?? ''}
                      onChange={(e) =>
                        updateCoverage(i, { aggregate_limit: Number(e.target.value) })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(editData)} className="flex-1">
          Save Changes
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ============================================
// COI PREVIEW PANEL
// ============================================

function COIPreviewPanel({ coiUrl, entityType }: { coiUrl: string | null; entityType: string }) {
  if (!coiUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30 p-6">
        <FileText className="h-16 w-16 text-muted-foreground/30" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">No COI document on file</p>
        <p className="mt-1 text-xs text-muted-foreground text-center">
          Upload a COI or request one from the {entityType}
        </p>
      </div>
    );
  }

  const isPdf = coiUrl.toLowerCase().includes('.pdf');

  if (isPdf) {
    return (
      <div className="flex h-full flex-col rounded-lg border bg-background overflow-hidden">
        <iframe
          src={`${coiUrl}#toolbar=1&navpanes=0`}
          className="flex-1 w-full min-h-0"
          title="COI Document Preview"
        />
        <div className="flex items-center justify-between border-t px-3 py-2 bg-secondary/30">
          <span className="text-xs text-muted-foreground truncate">Certificate of Insurance</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => window.open(coiUrl, '_blank')}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Open
          </Button>
        </div>
      </div>
    );
  }

  // Image preview (JPG, PNG)
  return (
    <div className="flex h-full flex-col rounded-lg border bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto p-2 flex items-start justify-center bg-secondary/20">
        <img
          src={coiUrl}
          alt="COI Document"
          className="max-w-full h-auto rounded"
        />
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 bg-secondary/30">
        <span className="text-xs text-muted-foreground truncate">Certificate of Insurance</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => window.open(coiUrl, '_blank')}
        >
          <ExternalLink className="mr-1 h-3 w-3" />
          Open
        </Button>
      </div>
    </div>
  );
}

// ============================================
// HOOK: Fetch COI URL from storage
// ============================================

function useCOIUrl(entityType: EntityType, entityId: string, externalUrl?: string) {
  const [coiUrl, setCoiUrl] = useState<string | null>(externalUrl ?? null);
  const [loading, setLoading] = useState(!externalUrl);

  useEffect(() => {
    if (externalUrl) {
      setCoiUrl(externalUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchUrl() {
      try {
        const prefix = `${entityType}/${entityId}/`;
        const { data: files } = await supabase.storage
          .from('coi-documents')
          .list(`${entityType}/${entityId}`, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

        if (cancelled) return;

        const latestFile = files?.[0];
        if (latestFile) {
          const { data: urlData } = supabase.storage
            .from('coi-documents')
            .getPublicUrl(`${prefix}${latestFile.name}`);
          setCoiUrl(urlData?.publicUrl ?? null);
        } else {
          setCoiUrl(null);
        }
      } catch {
        if (!cancelled) setCoiUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUrl();
    return () => { cancelled = true; };
  }, [entityType, entityId, externalUrl]);

  return { coiUrl, loading };
}

// ============================================
// MAIN MODAL
// ============================================

export function EntityDetailModal({
  open,
  onOpenChange,
  entity,
  entityType,
  coverages = [],
  coiUrl: externalCoiUrl,
  template,
  property,
  onDelete,
  onEdit,
  isDeleting = false,
}: EntityDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Derive coverages from entity's coverage JSONB field if not explicitly passed
  const derivedCoverages =
    coverages.length > 0
      ? coverages
      : (entityType === 'vendor'
          ? ((entity as Vendor).coverage ?? [])
          : ((entity as Tenant).coverage ?? []));

  // Derive endorsements from entity record
  const derivedEndorsements: ExtractedEndorsement[] =
    entityType === 'vendor'
      ? ((entity as Vendor).endorsements ?? [])
      : ((entity as Tenant).endorsements ?? []);

  const [localCoverages, setLocalCoverages] = useState(derivedCoverages);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const { coiUrl } = useCOIUrl(entityType, entity.id, externalCoiUrl);

  const entityName = entity.name;
  const entityEmail =
    entityType === 'vendor'
      ? (entity as Vendor).contact_email
      : (entity as Tenant).email;
  const entityStatus =
    entityType === 'vendor'
      ? (entity as Vendor).status
      : (entity as Tenant).insurance_status;

  // Get certificate holder text from the entity for AI entity name verification
  const certHolderOnCoi =
    entityType === 'vendor'
      ? (entity as Vendor).certificate_holder_on_coi
      : (entity as Tenant).certificate_holder_on_coi;

  const compliance = compareCoverageToRequirements(localCoverages, template ?? null, {
    endorsements: derivedEndorsements,
    property: property ?? null,
    certificateHolder: certHolderOnCoi,
  });
  const gaps = getComplianceGaps(compliance.fields);

  const handleRequestCOI = async () => {
    if (!entityEmail) {
      toast.error('No email address on file for this ' + entityType);
      return;
    }

    setSendingRequest(true);
    try {
      await sendCOIRequest({
        entityType,
        entityId: entity.id,
        entityName,
        entityEmail,
        entityStatus,
        complianceGaps: gaps,
        propertyName:
          entityType === 'vendor'
            ? (entity as Vendor).property?.name
            : (entity as Tenant).property?.name,
        uploadToken:
          entityType === 'vendor'
            ? (entity as Vendor).upload_token
            : (entity as Tenant).upload_token,
      });
      toast.success(`COI request sent to ${entityEmail}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to send COI request'
      );
    } finally {
      setSendingRequest(false);
    }
  };

  const handleDownload = () => {
    if (coiUrl) {
      window.open(coiUrl, '_blank');
    } else {
      toast.error('No COI document on file');
    }
  };

  const handleSaveCoverages = (updated: ExtractedCoverage[]) => {
    setLocalCoverages(updated);
    setIsEditing(false);
    toast.success('Coverages updated');
  };

  const handleCopyPortalLink = async () => {
    setGeneratingLink(true);
    try {
      const link = await generatePortalLink(entityType, entity.id);
      await navigator.clipboard.writeText(link);
      toast.success('Portal link copied to clipboard');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to generate portal link'
      );
    } finally {
      setGeneratingLink(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-lg">{entityName}</DialogTitle>
            <StatusBadge status={entityStatus} />
          </div>
          <p className="text-sm text-muted-foreground">
            {entityType === 'vendor' ? 'Vendor' : 'Tenant'}
            {entityType === 'vendor' && (entity as Vendor).property?.name
              ? ` · ${(entity as Vendor).property!.name}`
              : entityType === 'tenant' && (entity as Tenant).property?.name
                ? ` · ${(entity as Tenant).property!.name}`
                : ''}
            {entityEmail ? ` · ${entityEmail}` : ''}
          </p>
        </DialogHeader>

        {/* Main content: side-by-side */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: COI Document Preview */}
          <div className="w-1/2 border-r p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">COI Document</h3>
              {coiUrl && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDownload}>
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </Button>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <COIPreviewPanel coiUrl={coiUrl} entityType={entityType} />
            </div>
          </div>

          {/* Right: Tabs + Details */}
          <div className="w-1/2 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <Tabs defaultValue="compliance">
                <TabsList className="w-full">
                  <TabsTrigger value="compliance" className="flex-1">
                    Compliance
                  </TabsTrigger>
                  <TabsTrigger value="coverages" className="flex-1">
                    Coverages
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="compliance" className="space-y-4 mt-4">
                  {template ? (
                    <>
                      <div className="flex items-center gap-4 rounded-lg border p-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Overall Compliance</p>
                          <p className="text-2xl font-bold">
                            {compliance.compliance_percentage}%
                          </p>
                        </div>
                        <StatusBadge status={compliance.overall_status} />
                      </div>

                      {compliance.fields.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Requirement Comparison</p>
                          {compliance.fields.map((field, i) => (
                            <ComplianceFieldRow key={i} field={field} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No requirements configured for comparison
                        </p>
                      )}

                      {gaps.length > 0 && (
                        <Card className="border-destructive/30 bg-destructive/5">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-destructive">
                              Compliance Gaps ({gaps.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {gaps.map((gap, i) => (
                                <li key={i} className="text-xs text-muted-foreground">
                                  • {gap}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center">
                        <p>No requirement template assigned</p>
                        <p className="text-xs mt-1">
                          Assign a template from the Requirements page to enable compliance tracking
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="coverages" className="space-y-4 mt-4">
                  {isEditing ? (
                    <EditCoveragesForm
                      coverages={localCoverages}
                      onSave={handleSaveCoverages}
                      onCancel={() => setIsEditing(false)}
                    />
                  ) : (
                    <>
                      <CoveragesList coverages={localCoverages} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="w-full"
                      >
                        <Edit className="mr-2 h-3.5 w-3.5" />
                        Edit Coverages
                      </Button>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Action buttons */}
            <div className="shrink-0 border-t px-6 py-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestCOI}
                  disabled={!entityEmail || sendingRequest}
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  {sendingRequest ? 'Sending...' : 'Request COI'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPortalLink}
                  disabled={generatingLink}
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  {generatingLink ? 'Generating...' : 'Portal Link'}
                </Button>
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload New COI
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Delete ${entityType} "${entityName}"?`)) {
                      onDelete();
                    }
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
