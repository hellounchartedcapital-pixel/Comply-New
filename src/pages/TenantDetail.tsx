import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Mail,
  FileText,
  Loader2,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchTenant, updateTenant, fetchTenantRequirements } from '@/services/tenants';
import { fetchCertificates, fetchEmailLog, uploadCOIFile, createCertificate } from '@/services/certificates';
import { checkCompliance, extractedDataToComplianceCOI } from '@/lib/complianceEngine';
import type { ComplianceResult } from '@/lib/complianceEngine';
import { supabase } from '@/lib/supabase';
import { STATUS_CONFIG, SOURCE_CONFIG } from '@/constants';
import { formatDate } from '@/lib/utils';
import type { COIExtractedData } from '@/types';

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => fetchTenant(id!),
    enabled: !!id,
  });

  const { data: certificates } = useQuery({
    queryKey: ['certificates', 'tenant', id],
    queryFn: () => fetchCertificates('tenant', id!),
    enabled: !!id,
  });

  const { data: emailLog } = useQuery({
    queryKey: ['emailLog', 'tenant', id],
    queryFn: () => fetchEmailLog('tenant', id!),
    enabled: !!id,
  });

  const { data: requirements } = useQuery({
    queryKey: ['tenantRequirements', id],
    queryFn: () => fetchTenantRequirements(id!),
    enabled: !!id,
  });

  const latestCert = certificates?.[0];
  const complianceResult = latestCert?.compliance_result as ComplianceResult | null;

  const effectiveStatus: string = tenant?.status !== 'pending' ? (tenant?.status ?? 'pending') : ((tenant?.insurance_status as string) ?? 'pending');
  const statusCfg = (STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG['pending'])!;
  const StatusIcon = statusCfg.icon;

  const sourceLabel = requirements?.source ? (SOURCE_CONFIG[requirements.source]?.label ?? requirements.source) : null;

  const updateMutation = useMutation({
    mutationFn: (updates: { name?: string; email?: string }) => updateTenant(id!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      toast.success('Tenant updated');
      setEditingInfo(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpload = useCallback(
    async (file: File) => {
      if (!tenant || !id) return;
      setUploading(true);

      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] ?? '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke('extract-coi', {
          body: { file_base64: base64, file_name: file.name },
        });

        if (error) throw new Error(error.message || 'Extraction failed');
        const extracted = data as COIExtractedData;

        const filePath = await uploadCOIFile('tenant', id, file);

        let result: ComplianceResult | null = null;
        if (requirements && tenant.property) {
          const coiInput = extractedDataToComplianceCOI(extracted);
          result = checkCompliance({
            coi: coiInput,
            requirements: {
              general_liability_per_occurrence: requirements.general_liability_per_occurrence,
              general_liability_aggregate: requirements.general_liability_aggregate,
              auto_liability: requirements.auto_liability,
              workers_comp_required: requirements.workers_comp_required,
              employers_liability: requirements.employers_liability,
              umbrella_liability: requirements.umbrella_liability,
              property_insurance_required: requirements.property_insurance_required,
              waiver_of_subrogation_required: requirements.waiver_of_subrogation_required,
              liquor_liability: requirements.liquor_liability,
              business_interruption_required: requirements.business_interruption_required,
              additional_insured_entities: requirements.additional_insured_entities,
            },
            property: {
              additional_insured_entities: tenant.property.additional_insured_entities ?? [],
              certificate_holder_name: tenant.property.certificate_holder_name ?? null,
              loss_payee_entities: tenant.property.loss_payee_entities ?? [],
            },
          });
        }

        const expirations = extracted.policies
          ?.map((p) => p.expiration_date)
          .filter(Boolean)
          .sort();
        const earliest = expirations?.[0] ?? null;

        await createCertificate({
          entity_type: 'tenant',
          entity_id: id,
          property_id: tenant.property_id,
          file_path: filePath,
          file_name: file.name,
          extracted_data: extracted,
          compliance_result: result ?? undefined,
          overall_status: result?.overall_status ?? 'pending',
          earliest_expiration: earliest ?? undefined,
          uploaded_by: 'pm',
        });

        // Update tenant status
        const newStatus = (result?.overall_status as string) ?? 'pending';
        await updateTenant(id, {
          status: newStatus,
          insurance_status: newStatus,
          expiration_date: earliest ?? undefined,
        } as Record<string, unknown>);

        queryClient.invalidateQueries({ queryKey: ['tenant', id] });
        queryClient.invalidateQueries({ queryKey: ['certificates', 'tenant', id] });
        toast.success('COI uploaded and processed');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [tenant, id, requirements, queryClient]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Tenant not found</p>
        <Button onClick={() => navigate('/tenants')}>Back to Tenants</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tenants')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <Badge className={`${statusCfg.bgColor} ${statusCfg.textColor} ${statusCfg.borderColor} border`}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {tenant.email || 'No email'} · {tenant.property?.name || 'No property'}
              {tenant.unit_suite && ` · Unit ${tenant.unit_suite}`}
            </p>
            {sourceLabel && (
              <Badge variant="outline" className="mt-1 text-xs">
                Requirements: {sourceLabel}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {tenant.upload_token && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/upload/${tenant.upload_token}`} target="_blank">
                <ExternalLink className="mr-1 h-4 w-4" /> Self-Service Link
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingInfo(true);
              setEditName(tenant.name);
              setEditEmail(tenant.email || '');
            }}
          >
            <Edit className="mr-1 h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      {/* Edit Info */}
      {editingInfo && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Tenant Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({ name: editName, email: editEmail })}
                disabled={updateMutation.isPending}
              >
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingInfo(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lease Info */}
      {(tenant.lease_start_date || tenant.lease_end_date) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-6 text-sm">
              {tenant.lease_start_date && (
                <div>
                  <span className="text-muted-foreground">Lease Start:</span>{' '}
                  <span className="font-medium">{formatDate(tenant.lease_start_date)}</span>
                </div>
              )}
              {tenant.lease_end_date && (
                <div>
                  <span className="text-muted-foreground">Lease End:</span>{' '}
                  <span className="font-medium">{formatDate(tenant.lease_end_date)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {complianceResult?.items?.length ? (
            <div className="space-y-2">
              {complianceResult.items.map((item, i) => {
                const icon =
                  item.status === 'pass' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : item.status === 'expired' ? (
                    <Clock className="h-4 w-4 text-red-500" />
                  ) : item.status === 'expiring' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  );

                return (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {icon}
                      <div>
                        <p className="text-sm font-medium">{item.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Required: {item.required} | Actual: {item.actual || 'Not found'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        item.status === 'pass'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : item.status === 'expiring'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                      }
                    >
                      {item.status === 'pass'
                        ? 'Pass'
                        : item.status === 'expired'
                          ? 'Expired'
                          : item.status === 'expiring'
                            ? 'Expiring'
                            : item.status === 'not_found'
                              ? 'Missing'
                              : 'Fail'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No compliance data yet. Upload a COI to check compliance.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upload COI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload New COI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-muted-foreground/50 transition-colors"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Reading certificate...</p>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drop a PDF here or click to upload</p>
                <p className="text-xs text-muted-foreground">PDF up to 25MB</p>
                <label className="mt-3">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* COI History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> COI History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certificates?.length ? (
            <div className="space-y-2">
              {certificates.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{cert.file_name || 'Certificate'}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatDate(cert.created_at)} · {cert.uploaded_by === 'self_service' ? 'Self-service' : 'PM'}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      cert.overall_status === 'compliant'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : cert.overall_status === 'expired'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                    }
                  >
                    {cert.overall_status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No certificates uploaded yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Email History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emailLog?.length ? (
            <div className="space-y-2">
              {emailLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{entry.email_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent to {entry.recipient_email} · {formatDate(entry.sent_at)}
                    </p>
                  </div>
                  {entry.follow_up_count > 0 && (
                    <Badge variant="outline">Follow-up #{entry.follow_up_count}</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No emails sent yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
