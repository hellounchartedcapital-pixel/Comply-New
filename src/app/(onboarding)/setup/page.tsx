'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { StepOrgSetup, type OrgSetupData } from '@/components/onboarding/step-org-setup';
import { StepProperty, type PropertyData } from '@/components/onboarding/step-property';
import { StepTemplates, type SelectedTemplate } from '@/components/onboarding/step-templates';
import { StepUpload } from '@/components/onboarding/step-upload';

const TOTAL_STEPS = 4;

export default function OnboardingSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data from each step
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgData, setOrgData] = useState<OrgSetupData>({
    companyName: '',
    certificateHolder: null,
    additionalInsured: [],
  });
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  // Store auth user ID for creating org/profile when missing
  const authUserIdRef = useRef<string | null>(null);
  const authEmailRef = useRef<string | null>(null);
  const authNameRef = useRef<string | null>(null);

  // Load the current user's org ID on mount (run once)
  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    async function loadUserOrg() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      authUserIdRef.current = user.id;
      authEmailRef.current = user.email ?? '';
      authNameRef.current = user.user_metadata?.full_name ?? '';

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profile?.organization_id) {
        setOrgId(profile.organization_id);

        // Check if onboarding is already completed
        const { data: org } = await supabase
          .from('organizations')
          .select('name, settings')
          .eq('id', profile.organization_id)
          .single();

        if (org?.settings?.onboarding_completed) {
          router.push('/dashboard');
          return;
        }

        // Pre-fill company name if already set
        if (org?.name && !org.name.endsWith("'s Organization")) {
          setOrgData((prev) => ({ ...prev, companyName: org.name }));
        }
      }
    }

    loadUserOrg();
  }, [supabase, router]);

  // Helper: ensure org and user profile exist, return orgId
  async function ensureOrgAndProfile(companyName: string): Promise<string> {
    // If we already have an orgId, just return it
    if (orgId) return orgId;

    const userId = authUserIdRef.current;
    if (!userId) throw new Error('Not authenticated. Please refresh and try again.');

    // Create organization
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: companyName })
      .select('id')
      .single();

    if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`);

    const newOrgId = newOrg.id;

    // Create user profile linking auth user to organization
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      organization_id: newOrgId,
      email: authEmailRef.current ?? '',
      full_name: authNameRef.current ?? '',
      role: 'manager',
    });

    if (userError) throw new Error(`Failed to create user profile: ${userError.message}`);

    setOrgId(newOrgId);
    return newOrgId;
  }

  // Step 1: Save org name + default entities
  async function handleOrgSetupNext(data: OrgSetupData) {
    setSaving(true);
    setError(null);
    setOrgData(data);

    try {
      // Ensure the org and user profile exist (creates them if missing)
      const currentOrgId = await ensureOrgAndProfile(data.companyName);

      // Update organization name (in case it was pre-existing)
      const { error: orgError } = await supabase
        .from('organizations')
        .update({ name: data.companyName })
        .eq('id', currentOrgId);

      if (orgError) throw orgError;

      // Clear existing default entities and re-insert
      await supabase
        .from('organization_default_entities')
        .delete()
        .eq('organization_id', currentOrgId);

      const entitiesToInsert: {
        organization_id: string;
        entity_name: string;
        entity_address: string;
        entity_type: 'certificate_holder' | 'additional_insured';
      }[] = [];

      if (data.certificateHolder && data.certificateHolder.entity_name) {
        entitiesToInsert.push({
          organization_id: currentOrgId,
          entity_name: data.certificateHolder.entity_name,
          entity_address: data.certificateHolder.entity_address,
          entity_type: 'certificate_holder',
        });
      }

      for (const ai of data.additionalInsured) {
        if (ai.entity_name.trim()) {
          entitiesToInsert.push({
            organization_id: currentOrgId,
            entity_name: ai.entity_name,
            entity_address: ai.entity_address,
            entity_type: 'additional_insured',
          });
        }
      }

      if (entitiesToInsert.length > 0) {
        const { error: entError } = await supabase
          .from('organization_default_entities')
          .insert(entitiesToInsert);
        if (entError) throw entError;
      }

      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save organization');
    } finally {
      setSaving(false);
    }
  }

  // Step 2: Save property + property entities
  async function handlePropertyNext(data: PropertyData) {
    if (!orgId) {
      setError('Organization not set up. Please go back to Step 1.');
      return;
    }
    setSaving(true);
    setError(null);
    setPropertyData(data);

    try {
      const { data: property, error: propError } = await supabase
        .from('properties')
        .insert({
          organization_id: orgId,
          name: data.name,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
          property_type: data.property_type,
        })
        .select('id')
        .single();

      if (propError) throw propError;
      setPropertyId(property.id);

      // Insert property entities
      if (data.entities.length > 0) {
        const entityRows = data.entities.map((e) => ({
          property_id: property.id,
          entity_name: e.entity_name,
          entity_address: e.entity_address || null,
          entity_type: e.entity_type,
        }));

        const { error: entError } = await supabase
          .from('property_entities')
          .insert(entityRows);
        if (entError) throw entError;
      }

      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save property');
    } finally {
      setSaving(false);
    }
  }

  function handlePropertySkip() {
    setCurrentStep(3);
  }

  // Step 3: Duplicate selected system templates into org templates
  async function handleTemplatesNext(selected: SelectedTemplate[]) {
    if (!orgId) {
      setError('Organization not set up. Please go back to Step 1.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      for (const { template, adjustedRequirements } of selected) {
        // Create org-specific template
        const { data: newTemplate, error: tplError } = await supabase
          .from('requirement_templates')
          .insert({
            organization_id: orgId,
            name: template.name,
            description: template.description,
            category: template.category,
            risk_level: template.risk_level,
            is_system_default: false,
          })
          .select('id')
          .single();

        if (tplError) throw tplError;

        // Insert adjusted coverage requirements
        if (adjustedRequirements.length > 0) {
          const reqRows = adjustedRequirements.map((r) => ({
            template_id: newTemplate.id,
            coverage_type: r.coverage_type,
            is_required: r.is_required,
            minimum_limit: r.minimum_limit,
            limit_type: r.limit_type,
            requires_additional_insured: r.requires_additional_insured,
            requires_waiver_of_subrogation: r.requires_waiver_of_subrogation,
          }));

          const { error: reqError } = await supabase
            .from('template_coverage_requirements')
            .insert(reqRows);
          if (reqError) throw reqError;
        }
      }

      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save templates');
    } finally {
      setSaving(false);
    }
  }

  function handleTemplatesSkip() {
    setCurrentStep(4);
  }

  // Step 4: Finish onboarding
  async function handleFinish() {
    if (!orgId) {
      setError('Organization not set up. Please go back to Step 1.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      // Get current settings
      const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();

      const currentSettings = org?.settings || {};

      // Set onboarding_completed flag
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          settings: { ...currentSettings, onboarding_completed: true },
        })
        .eq('id', orgId);

      if (updateError) throw updateError;

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish onboarding');
    } finally {
      setSaving(false);
    }
  }

  function goBackToProperty() {
    setCurrentStep(2);
  }

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="space-y-8">
      {/* Step indicator + progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            Step {currentStep} of {TOTAL_STEPS}
          </span>
          <span className="text-muted-foreground">
            {currentStep === 1 && 'Organization'}
            {currentStep === 2 && 'Property'}
            {currentStep === 3 && 'Templates'}
            {currentStep === 4 && 'Upload'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Steps */}
      {currentStep === 1 && (
        <StepOrgSetup data={orgData} onNext={handleOrgSetupNext} saving={saving} />
      )}
      {currentStep === 2 && (
        <StepProperty
          orgData={orgData}
          data={propertyData}
          onNext={handlePropertyNext}
          onSkip={handlePropertySkip}
          saving={saving}
        />
      )}
      {currentStep === 3 && (
        <StepTemplates
          onNext={handleTemplatesNext}
          onSkip={handleTemplatesSkip}
          saving={saving}
        />
      )}
      {currentStep === 4 && (
        <StepUpload
          hasProperty={propertyId !== null}
          onGoBack={goBackToProperty}
          onFinish={handleFinish}
          saving={saving}
        />
      )}
    </div>
  );
}
