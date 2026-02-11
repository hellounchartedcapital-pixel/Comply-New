import { useState } from 'react';
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
  Eye,
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from './StatusBadge';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { formatCurrency } from '@/lib/utils';
import type {
  Vendor,
  Tenant,
  ExtractedCoverage,
  ComplianceField,
  RequirementTemplate,
  EntityType,
} from '@/types';
import { compareCoverageToRequirements, getComplianceGaps } from '@/services/compliance';
import { sendCOIRequest } from '@/services/settings';

interface EntityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Vendor | Tenant;
  entityType: EntityType;
  coverages?: ExtractedCoverage[];
  coiUrl?: string;
  template?: RequirementTemplate | null;
  onDelete: () => void;
  onEdit?: () => void;
  isDeleting?: boolean;
}

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

export function EntityDetailModal({
  open,
  onOpenChange,
  entity,
  entityType,
  coverages = [],
  coiUrl,
  template,
  onDelete,
  onEdit,
  isDeleting = false,
}: EntityDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localCoverages, setLocalCoverages] = useState(coverages);
  const [sendingRequest, setSendingRequest] = useState(false);

  const entityName = entity.name;
  const entityEmail =
    entityType === 'vendor'
      ? (entity as Vendor).contact_email
      : (entity as Tenant).email;
  const entityStatus =
    entityType === 'vendor'
      ? (entity as Vendor).status
      : (entity as Tenant).insurance_status;

  const compliance = compareCoverageToRequirements(localCoverages, template ?? null);
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
        complianceGaps: gaps,
        propertyName:
          entityType === 'vendor'
            ? (entity as Vendor).property?.name
            : (entity as Tenant).property?.name,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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

        <Tabs defaultValue="compliance" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="compliance" className="flex-1">
              Compliance
            </TabsTrigger>
            <TabsTrigger value="coverages" className="flex-1">
              Coverages
            </TabsTrigger>
            <TabsTrigger value="document" className="flex-1">
              COI Document
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compliance" className="space-y-4">
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

          <TabsContent value="coverages" className="space-y-4">
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

          <TabsContent value="document" className="space-y-4">
            {coiUrl ? (
              <div className="space-y-4">
                <div className="flex h-[300px] items-center justify-center rounded-lg bg-secondary">
                  <div className="text-center">
                    <FileText className="mx-auto h-16 w-16 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      COI Document on file
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => window.open(coiUrl, '_blank')}
                    >
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      View Full Document
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-2">No COI document on file</p>
                  <p className="text-xs mt-1">
                    Upload a COI or request one from the {entityType}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!coiUrl}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestCOI}
            disabled={!entityEmail || sendingRequest}
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            {sendingRequest ? 'Sending...' : 'Request COI'}
          </Button>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
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
      </DialogContent>
    </Dialog>
  );
}
