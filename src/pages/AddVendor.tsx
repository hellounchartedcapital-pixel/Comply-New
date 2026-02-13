import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { DocumentUploadZone } from '@/components/shared/DocumentUploadZone';
import { ExtractedCoverageDisplay } from '@/components/shared/ExtractedCoverageDisplay';
import { RequirementTemplateSelector, findTemplateById } from '@/components/shared/RequirementTemplateSelector';
import { PropertySelector } from '@/components/shared/PropertySelector';
import { ComplianceResults } from '@/components/shared/ComplianceResults';
import { extractCOI, uploadCOIFile } from '@/services/ai-extraction';
import { createVendor, updateVendor } from '@/services/vendors';
import { fetchRequirementTemplates } from '@/services/requirements';
import { fetchProperty } from '@/services/properties';
import { compareCoverageToRequirements } from '@/services/compliance';
import type { COIExtractionResult, ComplianceResult } from '@/types';

export default function AddVendor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // File state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<COIExtractionResult | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Form state
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [templateId, setTemplateId] = useState('');

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission state
  const [isCreating, setIsCreating] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [createdSuccessfully, setCreatedSuccessfully] = useState(false);

  // Fetch requirement templates so we can look up the selected one during create
  const { data: templates } = useQuery({
    queryKey: ['requirement-templates'],
    queryFn: fetchRequirementTemplates,
  });

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadedFile(file);
    setExtractionError(null);
    setExtractionResult(null);
    setIsExtracting(true);

    try {
      const result = await extractCOI(file);
      if (result.success) {
        setExtractionResult(result);
        // Pre-fill vendor name from named insured
        if (result.named_insured) {
          setVendorName(result.named_insured);
        }
        toast.success('Certificate analyzed successfully');
      } else {
        setExtractionError(
          result.error ?? "We couldn't automatically extract data from this certificate. Please check that the file is a valid COI and try again, or contact support."
        );
      }
    } catch {
      setExtractionError(
        "We couldn't automatically extract data from this certificate. Please check that the file is a valid COI and try again, or contact support."
      );
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setExtractionResult(null);
    setExtractionError(null);
    setVendorName('');
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!vendorName.trim()) {
      newErrors.name = 'Vendor name is required';
    }
    if (!vendorEmail.trim()) {
      newErrors.email = 'Email is required for compliance notifications';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!templateId) {
      newErrors.template = 'Please select a requirement template to compare against';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = useCallback(async () => {
    if (!validate()) return;
    if (!extractionResult || !uploadedFile) return;

    setIsCreating(true);
    try {
      // 1. Create vendor record
      const vendor = await createVendor({
        name: vendorName.trim(),
        contact_email: vendorEmail.trim(),
        property_id: propertyId || undefined,
      });

      // 2. Upload COI file to storage
      try {
        await uploadCOIFile(uploadedFile, 'vendor', vendor.id);
      } catch {
        // Storage might not be configured — continue anyway
      }

      // 3. Update vendor with extracted data
      const now = new Date();
      let status: 'compliant' | 'non-compliant' | 'expired' = 'non-compliant';
      if (extractionResult.expiration_date) {
        status = new Date(extractionResult.expiration_date) > now ? 'compliant' : 'expired';
      }

      await updateVendor(vendor.id, {
        expiration_date: extractionResult.expiration_date,
        coverage: extractionResult.coverages,
        endorsements: extractionResult.endorsements ?? [],
        certificate_holder_on_coi: extractionResult.certificate_holder ?? '',
        status,
      } as any);

      // 4. Run compliance comparison against the selected requirement template
      const selectedTemplate = findTemplateById(templateId, templates ?? []);
      if (selectedTemplate) {
        // Fetch property data for endorsement/entity name checks
        let propertyData = null;
        if (propertyId) {
          try {
            propertyData = await fetchProperty(propertyId);
          } catch {
            // Property fetch is non-critical
          }
        }
        const compliance = compareCoverageToRequirements(
          extractionResult.coverages,
          selectedTemplate,
          {
            endorsements: extractionResult.endorsements,
            property: propertyData,
            certificateHolder: extractionResult.certificate_holder,
          }
        );
        setComplianceResult(compliance);

        // Update vendor status based on compliance result
        if (compliance.overall_status !== status) {
          await updateVendor(vendor.id, {
            status: compliance.overall_status,
          } as any);
        }
      }

      // 5. Invalidate queries and show success
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setCreatedSuccessfully(true);
      toast.success('Vendor created — compliance check complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create vendor';
      toast.error(message, { duration: 8000 });
      console.error('Vendor creation failed:', err);
    } finally {
      setIsCreating(false);
    }
  }, [vendorName, vendorEmail, propertyId, templateId, extractionResult, uploadedFile, templates, queryClient]);

  // After successful creation, show compliance results with a link to go back
  if (createdSuccessfully) {
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

        {complianceResult ? (
          <ComplianceResults result={complianceResult} />
        ) : (
          <ComplianceResults
            result={{ overall_status: 'non-compliant', compliance_percentage: 0, fields: [], expiring_within_30_days: 0, expired_count: 0 }}
            noRequirementsMessage="No requirement template was selected. Set up requirements to enable compliance tracking."
          />
        )}

        <div className="flex gap-3">
          <Button onClick={() => navigate('/vendors')} className="flex-1">
            Go to Vendor List
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Reset everything for adding another
              setCreatedSuccessfully(false);
              setUploadedFile(null);
              setExtractionResult(null);
              setExtractionError(null);
              setVendorName('');
              setVendorEmail('');
              setPropertyId('');
              setTemplateId('');
              setComplianceResult(null);
              setErrors({});
            }}
            className="flex-1"
          >
            Add Another Vendor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Add New Vendor"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Step 1: Upload COI */}
      <DocumentUploadZone
        label="Upload Certificate of Insurance"
        helperText="Upload the vendor's Certificate of Insurance to get started"
        onUpload={handleFileUpload}
        isProcessing={isExtracting}
        processingText="Analyzing certificate..."
        uploadedFileName={uploadedFile?.name}
        uploadedFileSize={uploadedFile?.size}
        onRemove={handleRemoveFile}
        error={extractionError ?? undefined}
      />

      {/* Extraction error with retry */}
      {extractionError && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <p className="text-sm text-center text-muted-foreground">{extractionError}</p>
            <Button
              variant="outline"
              onClick={() => {
                setExtractionError(null);
                setUploadedFile(null);
              }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review Extracted Info + Complete Details */}
      {extractionResult?.success && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Extracted vendor name */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
              <CardDescription>Pulled from COI — edit if needed</CardDescription>
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
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Vendor name from COI"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                <p className="text-xs text-muted-foreground">
                  Auto-filled from the Named Insured field on the COI
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Extracted coverages (read-only) */}
          <ExtractedCoverageDisplay
            coverages={extractionResult.coverages}
            carrier={extractionResult.carrier}
            policyNumber={extractionResult.policy_number}
            effectiveDate={extractionResult.effective_date}
            expirationDate={extractionResult.expiration_date}
            overallConfidence={extractionResult.confidence_score}
          />

          {/* User-provided details */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Details</CardTitle>
              <CardDescription>Provide the remaining details to create this vendor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor-email">
                  Vendor Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={vendorEmail}
                  onChange={(e) => {
                    setVendorEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="vendor@example.com"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                <p className="text-xs text-muted-foreground">
                  Used for compliance notifications and COI update requests
                </p>
              </div>

              <PropertySelector
                value={propertyId}
                onChange={(v) => setPropertyId(v)}
              />

              <RequirementTemplateSelector
                value={templateId}
                onChange={(v) => {
                  setTemplateId(v);
                  if (errors.template) setErrors((prev) => ({ ...prev, template: '' }));
                }}
                entityType="vendor"
                label="Requirement Template"
                required
                error={errors.template}
              />
              <p className="text-xs text-muted-foreground -mt-2">
                The vendor's COI will be compared against this template to check compliance.
                Manage templates on the Requirements page.
              </p>
            </CardContent>
          </Card>

          {/* Create button */}
          <Button
            onClick={handleCreate}
            disabled={isCreating || !vendorName.trim() || !vendorEmail.trim() || !templateId}
            className="w-full h-12 text-base"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Vendor...
              </>
            ) : (
              'Create Vendor'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
