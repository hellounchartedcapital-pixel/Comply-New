import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Shield,
  FileText,
  Upload,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { createVendor } from '@/services/vendors';
import { fetchProperties, fetchVendorRequirements } from '@/services/properties';
import { createCertificate, uploadCOIFile } from '@/services/certificates';
import {
  checkCompliance,
  extractedDataToComplianceCOI,
} from '@/lib/complianceEngine';
import type { ComplianceResult } from '@/lib/complianceEngine';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import type { COIExtractedData, Property } from '@/types';

// ============================================
// Helper: Convert File to base64 (strip data: prefix)
// ============================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:application/pdf;base64," prefix
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================
// Helper: Get earliest expiration from policies
// ============================================

function getEarliestExpiration(data: COIExtractedData): string | null {
  let earliest: string | null = null;
  for (const policy of data.policies ?? []) {
    if (policy.expiration_date) {
      if (!earliest || new Date(policy.expiration_date) < new Date(earliest)) {
        earliest = policy.expiration_date;
      }
    }
  }
  return earliest;
}

// ============================================
// Coverage display labels
// ============================================

interface CoverageDisplayItem {
  label: string;
  value: string;
}

function extractCoverageItems(data: COIExtractedData): CoverageDisplayItem[] {
  const items: CoverageDisplayItem[] = [];

  if (data.general_liability_per_occurrence != null) {
    items.push({
      label: 'General Liability (Per Occurrence)',
      value: formatCurrency(data.general_liability_per_occurrence),
    });
  }
  if (data.general_liability_aggregate != null) {
    items.push({
      label: 'General Liability (Aggregate)',
      value: formatCurrency(data.general_liability_aggregate),
    });
  }
  if (data.auto_liability != null) {
    items.push({
      label: 'Automobile Liability',
      value: formatCurrency(data.auto_liability),
    });
  }
  if (data.workers_comp_found) {
    items.push({
      label: "Workers' Compensation",
      value: 'Statutory',
    });
  }
  if (data.employers_liability != null) {
    items.push({
      label: "Employers' Liability",
      value: formatCurrency(data.employers_liability),
    });
  }
  if (data.umbrella_per_occurrence != null) {
    items.push({
      label: 'Umbrella (Per Occurrence)',
      value: formatCurrency(data.umbrella_per_occurrence),
    });
  }
  if (data.umbrella_aggregate != null) {
    items.push({
      label: 'Umbrella (Aggregate)',
      value: formatCurrency(data.umbrella_aggregate),
    });
  }
  if (data.property_insurance != null) {
    items.push({
      label: 'Property Insurance',
      value: formatCurrency(data.property_insurance),
    });
  }

  return items;
}

// ============================================
// Component
// ============================================

export default function AddVendor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Step tracking: 1 = Upload COI, 2 = Review & Confirm, 3 = Save / Complete
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<COIExtractedData | null>(null);

  // Step 2: Form state
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 3: Save state
  const [isSaving, setIsSaving] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [createdVendorId, setCreatedVendorId] = useState<string | null>(null);

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  // ============================================
  // Step 1: Upload COI and call extract-coi edge function
  // ============================================

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setExtractionError(null);
      setExtractedData(null);
      setIsExtracting(true);

      try {
        // Convert file to base64
        const base64data = await fileToBase64(selectedFile);

        // Call the extract-coi edge function
        const { data, error } = await supabase.functions.invoke('extract-coi', {
          body: { file_base64: base64data, file_name: selectedFile.name },
        });

        if (error) {
          throw new Error(error.message || 'Extraction failed');
        }

        if (!data || !data.success) {
          throw new Error(
            data?.error ||
              "We couldn't extract data from this certificate. Please check that the file is a valid COI."
          );
        }

        const extracted = data.data as COIExtractedData;
        setExtractedData(extracted);

        // Pre-fill vendor name from the insured name on the COI
        if (extracted.insured_name) {
          setVendorName(extracted.insured_name);
        }

        toast.success('Certificate analyzed successfully');
        setStep(2);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "We couldn't extract data from this certificate. Please try again.";
        setExtractionError(message);
      } finally {
        setIsExtracting(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && droppedFile.type === 'application/pdf') {
        handleFileSelect(droppedFile);
      } else {
        setExtractionError('Please upload a PDF file.');
      }
    },
    [handleFileSelect]
  );

  // ============================================
  // Step 2: Validate and proceed to save
  // ============================================

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!vendorName.trim()) {
      newErrors.name = 'Vendor name is required';
    }
    if (!vendorEmail.trim()) {
      newErrors.email = 'Vendor email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!propertyId) {
      newErrors.property = 'Please assign this vendor to a property';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================
  // Step 3: Save everything
  // ============================================

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    if (!extractedData || !file) return;

    setIsSaving(true);
    try {
      // 1. Create the vendor record
      const vendor = await createVendor({
        name: vendorName.trim(),
        email: vendorEmail.trim(),
        property_id: propertyId,
      });

      setCreatedVendorId(vendor.id);

      // 2. Upload the PDF file to storage
      let filePath: string | undefined;
      try {
        filePath = await uploadCOIFile('vendor', vendor.id, file);
      } catch {
        // Storage may not be configured -- continue
      }

      // 3. Fetch vendor requirements for the selected property
      let compResult: ComplianceResult | null = null;
      try {
        const requirements = await fetchVendorRequirements(propertyId);
        const selectedProperty = (properties ?? []).find(
          (p: Property) => p.id === propertyId
        );

        if (requirements && selectedProperty) {
          // 4. Run compliance check
          compResult = checkCompliance({
            coi: extractedDataToComplianceCOI(extractedData),
            requirements: {
              general_liability_per_occurrence:
                requirements.general_liability_per_occurrence,
              general_liability_aggregate:
                requirements.general_liability_aggregate,
              auto_liability: requirements.auto_liability,
              workers_comp_required: requirements.workers_comp_required,
              employers_liability: requirements.employers_liability,
              umbrella_liability: requirements.umbrella_liability,
              waiver_of_subrogation_required:
                requirements.waiver_of_subrogation_required,
              cancellation_notice_days: requirements.cancellation_notice_days,
            },
            property: {
              additional_insured_entities:
                selectedProperty.additional_insured_entities ?? [],
              certificate_holder_name:
                selectedProperty.certificate_holder_name ?? null,
              loss_payee_entities:
                selectedProperty.loss_payee_entities ?? [],
            },
          });
          setComplianceResult(compResult);
        }
      } catch {
        // Requirements may not exist yet -- that is OK
      }

      // 5. Save certificate record
      const earliestExpiration = getEarliestExpiration(extractedData);
      try {
        await createCertificate({
          entity_type: 'vendor',
          entity_id: vendor.id,
          property_id: propertyId,
          file_path: filePath,
          file_name: file.name,
          extracted_data: extractedData,
          compliance_result: compResult ?? undefined,
          overall_status: compResult?.overall_status ?? 'pending',
          earliest_expiration: earliestExpiration ?? undefined,
          uploaded_by: 'pm',
        });
      } catch {
        // Certificate table may not exist -- continue
      }

      // 6. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });

      setStep(3);
      toast.success('Vendor created successfully');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create vendor';
      toast.error(message, { duration: 8000 });
    } finally {
      setIsSaving(false);
    }
  }, [
    vendorName,
    vendorEmail,
    propertyId,
    extractedData,
    file,
    properties,
    queryClient,
  ]);

  // ============================================
  // Reset for "Add Another"
  // ============================================

  const resetAll = () => {
    setStep(1);
    setFile(null);
    setIsExtracting(false);
    setExtractionError(null);
    setExtractedData(null);
    setVendorName('');
    setVendorEmail('');
    setPropertyId('');
    setErrors({});
    setIsSaving(false);
    setComplianceResult(null);
    setCreatedVendorId(null);
  };

  // ============================================
  // Derived values
  // ============================================

  const coverageItems = extractedData ? extractCoverageItems(extractedData) : [];

  // ============================================
  // RENDER: Step 3 -- Save Complete
  // ============================================

  if (step === 3) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Vendor Created"
          subtitle={`${vendorName} has been added successfully`}
          actions={
            <Button variant="outline" onClick={() => navigate('/vendors')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Vendors
            </Button>
          }
        />

        {/* Compliance result */}
        {complianceResult ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Compliance Results</CardTitle>
                  <CardDescription className="mt-1">
                    {complianceResult.items.filter((i) => i.status === 'pass').length} of{' '}
                    {complianceResult.items.length} requirements met
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    complianceResult.overall_status === 'compliant'
                      ? 'success'
                      : complianceResult.overall_status === 'expired'
                        ? 'danger'
                        : 'danger'
                  }
                  className="gap-1.5 px-3 py-1"
                >
                  {complianceResult.overall_status === 'compliant' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Shield className="h-3.5 w-3.5" />
                  )}
                  {complianceResult.overall_status === 'compliant'
                    ? 'Compliant'
                    : complianceResult.overall_status === 'expired'
                      ? 'Expired'
                      : 'Non-Compliant'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {complianceResult.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        item.status === 'pass'
                          ? 'bg-success'
                          : item.status === 'expiring'
                            ? 'bg-warning'
                            : 'bg-destructive'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{item.display_name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Required: {item.required}</span>
                        <span>Found: {item.actual ?? 'Not found'}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      item.status === 'pass'
                        ? 'text-success'
                        : item.status === 'expiring'
                          ? 'text-warning'
                          : 'text-destructive'
                    }`}
                  >
                    {item.status === 'pass'
                      ? 'Pass'
                      : item.status === 'expiring'
                        ? 'Expiring'
                        : item.status === 'expired'
                          ? 'Expired'
                          : item.status === 'not_found'
                            ? 'Not Found'
                            : 'Fail'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No compliance requirements configured</p>
                <p className="text-xs text-muted-foreground">
                  Set up vendor requirements for this property to enable compliance tracking.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => {
              if (createdVendorId) {
                navigate(`/vendors/${createdVendorId}`);
              } else {
                navigate('/vendors');
              }
            }}
            className="flex-1"
          >
            Go to Vendor Detail
          </Button>
          <Button variant="outline" onClick={resetAll} className="flex-1">
            Add Another Vendor
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Step 2 -- Review & Confirm
  // ============================================

  if (step === 2 && extractedData) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Review & Confirm"
          subtitle="Verify the extracted information and fill in the remaining details"
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep(1);
                setFile(null);
                setExtractedData(null);
                setExtractionError(null);
                setVendorName('');
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            1
          </span>
          <span className="text-primary font-medium">Upload</span>
          <div className="h-px flex-1 bg-primary/30" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            2
          </span>
          <span className="font-medium">Review</span>
          <div className="h-px flex-1 bg-border" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            3
          </span>
          <span>Save</span>
        </div>

        {/* Vendor Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Vendor Information
            </CardTitle>
            <CardDescription>
              Pre-filled from the certificate -- edit if needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor-name">
                Vendor Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendor-name"
                value={vendorName}
                onChange={(e) => {
                  setVendorName(e.target.value);
                  if (errors.name)
                    setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Vendor name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-email">
                Vendor Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendor-email"
                type="email"
                value={vendorEmail}
                onChange={(e) => {
                  setVendorEmail(e.target.value);
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="vendor@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Used for compliance notifications and COI update requests
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property-select">
                Assign to Property <span className="text-destructive">*</span>
              </Label>
              <Select
                value={propertyId}
                onValueChange={(v) => {
                  setPropertyId(v);
                  if (errors.property)
                    setErrors((prev) => ({ ...prev, property: '' }));
                }}
              >
                <SelectTrigger id="property-select">
                  <SelectValue
                    placeholder={
                      propertiesLoading
                        ? 'Loading properties...'
                        : 'Select a property'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(properties ?? []).map((p: Property) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.address ? ` -- ${p.address}` : ''}
                    </SelectItem>
                  ))}
                  {(!properties || properties.length === 0) &&
                    !propertiesLoading && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No properties found. Create a property first.
                      </div>
                    )}
                </SelectContent>
              </Select>
              {errors.property && (
                <p className="text-sm text-destructive">{errors.property}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Extracted Coverages */}
        {coverageItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Extracted Coverages
              </CardTitle>
              <CardDescription>
                Coverage information found on the uploaded certificate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {coverageItems.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-secondary/30 p-4"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Policy details */}
              {extractedData.policies.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Policies
                  </p>
                  {extractedData.policies.map((policy, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md bg-secondary/20 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">
                        {policy.coverage_type}
                      </span>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {policy.carrier && <span>{policy.carrier}</span>}
                        {policy.expiration_date && (
                          <span>
                            Exp:{' '}
                            {new Date(
                              policy.expiration_date
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirm button */}
        <Button
          onClick={handleSave}
          disabled={
            isSaving ||
            !vendorName.trim() ||
            !vendorEmail.trim() ||
            !propertyId
          }
          className="w-full h-12 text-base"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving Vendor...
            </>
          ) : (
            'Create Vendor & Check Compliance'
          )}
        </Button>
      </div>
    );
  }

  // ============================================
  // RENDER: Step 1 -- Upload COI
  // ============================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Add New Vendor"
        subtitle="Upload a Certificate of Insurance to get started"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          1
        </span>
        <span className="font-medium">Upload</span>
        <div className="h-px flex-1 bg-border" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          2
        </span>
        <span>Review</span>
        <div className="h-px flex-1 bg-border" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          3
        </span>
        <span>Save</span>
      </div>

      {/* Upload zone */}
      {isExtracting ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-base font-medium">Reading certificate...</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Extracting vendor and coverage information from the PDF
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer hover:border-primary/50 hover:bg-accent/20"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              const selected = target.files?.[0];
              if (selected) handleFileSelect(selected);
            };
            input.click();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf';
              input.onchange = (ev) => {
                const target = ev.target as HTMLInputElement;
                const selected = target.files?.[0];
                if (selected) handleFileSelect(selected);
              };
              input.click();
            }
          }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-4 text-base font-medium">
            Drag & drop your COI here
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse files
          </p>
          <Button variant="outline" className="mt-4" type="button">
            <FileText className="mr-2 h-4 w-4" />
            Select PDF
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            PDF up to 25MB
          </p>
        </div>
      )}

      {/* Extraction error */}
      {extractionError && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <p className="text-sm text-center text-destructive">
              {extractionError}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setExtractionError(null);
                setFile(null);
              }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Show uploaded file name if present but not yet extracted */}
      {file && !isExtracting && !extractionError && !extractedData && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
