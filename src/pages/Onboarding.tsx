import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, ChevronRight, ChevronLeft, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { upsertOrganizationSettings } from '@/services/settings';
import { createProperty } from '@/services/properties';

const STEPS = [
  { number: 1, label: 'Company Info' },
  { number: 2, label: 'First Property' },
  { number: 3, label: 'Requirements' },
  { number: 4, label: 'All Set!' },
] as const;

const LIMIT_OPTIONS = [
  { value: '500000', label: '$500,000' },
  { value: '1000000', label: '$1,000,000' },
  { value: '1500000', label: '$1,500,000' },
  { value: '2000000', label: '$2,000,000' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 - Company Info
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // Step 2 - First Property
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');

  // Step 3 - Default Requirements
  const [glOccurrence, setGlOccurrence] = useState('');
  const [glAggregate, setGlAggregate] = useState('');
  const [wcRequired, setWcRequired] = useState(false);
  const [aiRequired, setAiRequired] = useState(false);
  const [wosRequired, setWosRequired] = useState(false);

  const progressValue = (currentStep / STEPS.length) * 100;

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return companyName.trim().length > 0 && companyAddress.trim().length > 0;
      case 2:
        return propertyName.trim().length > 0 && propertyAddress.trim().length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!isStepValid(currentStep)) return;

    setSaving(true);
    try {
      if (currentStep === 1) {
        await upsertOrganizationSettings({
          company_name: companyName.trim(),
          company_address: companyAddress.trim(),
        });
        queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
        toast.success('Company info saved');
      } else if (currentStep === 2) {
        await createProperty({
          name: propertyName.trim(),
          address: propertyAddress.trim(),
        });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        toast.success('Property created');
      } else if (currentStep === 3) {
        await upsertOrganizationSettings({
          default_gl_occurrence: glOccurrence ? Number(glOccurrence) : undefined,
          default_gl_aggregate: glAggregate ? Number(glAggregate) : undefined,
          default_wc_required: wcRequired,
          default_ai_required: aiRequired,
          default_wos_required: wosRequired,
        });
        queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
        toast.success('Default requirements saved');
      }

      setCurrentStep((prev) => prev + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Welcome to SmartCOI</h1>
          </div>
          <p className="text-muted-foreground">
            Let&apos;s get your account set up in just a few steps.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                    currentStep > step.number
                      ? 'border-primary bg-primary text-primary-foreground'
                      : currentStep === step.number
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground/50'
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    currentStep >= step.number
                      ? 'text-foreground'
                      : 'text-muted-foreground/50'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Tell us about your organization so we can personalize your experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="onboard-company-name">Company Name</Label>
                <Input
                  id="onboard-company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Apex Property Management LLC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboard-company-address">Company Address</Label>
                <Input
                  id="onboard-company-address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, Suite 100, New York, NY 10001"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Add Your First Property</CardTitle>
              <CardDescription>
                Properties represent the buildings or locations where you track vendor and tenant insurance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="onboard-property-name">Property Name</Label>
                <Input
                  id="onboard-property-name"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g., Sunset Business Park"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboard-property-address">Property Address</Label>
                <Input
                  id="onboard-property-address"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="e.g., 456 Oak Ave, Los Angeles, CA 90001"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Set Default Requirements</CardTitle>
              <CardDescription>
                Configure the default insurance requirements for your vendors and tenants. You can
                always customize these later per property.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="onboard-gl-occurrence">GL Occurrence Limit</Label>
                  <Select value={glOccurrence} onValueChange={setGlOccurrence}>
                    <SelectTrigger id="onboard-gl-occurrence">
                      <SelectValue placeholder="Select limit" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIMIT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboard-gl-aggregate">GL Aggregate Limit</Label>
                  <Select value={glAggregate} onValueChange={setGlAggregate}>
                    <SelectTrigger id="onboard-gl-aggregate">
                      <SelectValue placeholder="Select limit" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIMIT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Require Workers&apos; Compensation</p>
                    <p className="text-xs text-muted-foreground">
                      Vendors must carry statutory workers&apos; comp coverage
                    </p>
                  </div>
                  <Switch checked={wcRequired} onCheckedChange={setWcRequired} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Require Additional Insured</p>
                    <p className="text-xs text-muted-foreground">
                      Your organization must be listed as additional insured
                    </p>
                  </div>
                  <Switch checked={aiRequired} onCheckedChange={setAiRequired} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Require Waiver of Subrogation</p>
                    <p className="text-xs text-muted-foreground">
                      Policies must include a waiver of subrogation endorsement
                    </p>
                  </div>
                  <Switch checked={wosRequired} onCheckedChange={setWosRequired} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">You&apos;re All Set!</CardTitle>
              <CardDescription>
                Your SmartCOI account is ready to go. Here&apos;s a summary of what we configured:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Company Profile</p>
                  <p className="text-xs text-muted-foreground">
                    {companyName} &mdash; {companyAddress}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-medium">First Property</p>
                  <p className="text-xs text-muted-foreground">
                    {propertyName} &mdash; {propertyAddress}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Default Requirements</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      glOccurrence &&
                        `GL Occurrence: ${LIMIT_OPTIONS.find((o) => o.value === glOccurrence)?.label}`,
                      glAggregate &&
                        `GL Aggregate: ${LIMIT_OPTIONS.find((o) => o.value === glAggregate)?.label}`,
                      wcRequired && "Workers' Comp",
                      aiRequired && 'Additional Insured',
                      wosRequired && 'Waiver of Subrogation',
                    ]
                      .filter(Boolean)
                      .join(' \u00B7 ') || 'Using default settings'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 1 && currentStep < 4 && (
              <Button variant="outline" onClick={handleBack} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div>
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid(currentStep) || saving}
              >
                {saving ? 'Saving...' : 'Next'}
                {!saving && <ChevronRight className="ml-1 h-4 w-4" />}
              </Button>
            ) : (
              <Button onClick={() => navigate('/')}>
                Go to Dashboard
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
