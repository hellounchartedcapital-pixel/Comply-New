import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SourceTag } from './SourceTag';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import type { EntityType, RequirementSource } from '@/types';

interface FieldValue {
  value: number | boolean | string;
  source: RequirementSource;
  confidence?: number;
}

interface FormData {
  gl_occurrence?: FieldValue;
  gl_aggregate?: FieldValue;
  auto_liability_csl?: FieldValue;
  workers_comp_statutory?: FieldValue;
  workers_comp_employers_liability?: FieldValue;
  umbrella_limit?: FieldValue;
  professional_liability?: FieldValue;
  property_insurance?: FieldValue;
  business_interruption_required?: FieldValue;
  additional_insured_required?: FieldValue;
  waiver_of_subrogation_required?: FieldValue;
  certificate_holder_name?: FieldValue;
  certificate_holder_address?: FieldValue;
  cancellation_notice_days?: FieldValue;
  lease_start?: string;
  lease_end?: string;
}

interface RequirementProfileFormProps {
  entityType: EntityType;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}


function CoverageField({
  label,
  fieldData,
  onChange,
  type = 'currency',
}: {
  label: string;
  fieldData?: FieldValue;
  onChange: (val: FieldValue) => void;
  type?: 'currency' | 'boolean' | 'text' | 'number';
}) {
  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>{label}</Label>
          {fieldData?.source && fieldData.source !== 'manual' && (
            <SourceTag source={fieldData.source} />
          )}
          {fieldData?.confidence !== undefined && (
            <ConfidenceIndicator score={fieldData.confidence} />
          )}
        </div>
        <Switch
          checked={fieldData?.value === true}
          onCheckedChange={(checked) =>
            onChange({ value: checked, source: 'manual', confidence: undefined })
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {fieldData?.source && fieldData.source !== 'manual' && (
          <SourceTag source={fieldData.source} />
        )}
        {fieldData?.confidence !== undefined && (
          <ConfidenceIndicator score={fieldData.confidence} />
        )}
      </div>
      <Input
        type={type === 'currency' ? 'number' : type === 'number' ? 'number' : 'text'}
        placeholder={type === 'currency' ? '1,000,000' : ''}
        value={typeof fieldData?.value === 'number' || typeof fieldData?.value === 'string' ? fieldData.value : ''}
        onChange={(e) => {
          const val = type === 'currency' || type === 'number' ? Number(e.target.value) : e.target.value;
          onChange({ value: val, source: 'manual', confidence: undefined });
        }}
      />
    </div>
  );
}

export function RequirementProfileForm({
  entityType,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: RequirementProfileFormProps) {
  const [data, setData] = useState<FormData>(initialData ?? {});

  const update = (key: keyof FormData) => (val: FieldValue) => {
    setData((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>General Liability</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <CoverageField label="Each Occurrence" fieldData={data.gl_occurrence} onChange={update('gl_occurrence')} />
          <CoverageField label="General Aggregate" fieldData={data.gl_aggregate} onChange={update('gl_aggregate')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automobile Liability</CardTitle>
        </CardHeader>
        <CardContent>
          <CoverageField label="Combined Single Limit" fieldData={data.auto_liability_csl} onChange={update('auto_liability_csl')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workers&apos; Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CoverageField label="Statutory Limits Required" fieldData={data.workers_comp_statutory} onChange={update('workers_comp_statutory')} type="boolean" />
          <CoverageField label="Employers Liability Limit" fieldData={data.workers_comp_employers_liability} onChange={update('workers_comp_employers_liability')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Umbrella / Excess Liability</CardTitle>
        </CardHeader>
        <CardContent>
          <CoverageField label="Umbrella Limit" fieldData={data.umbrella_limit} onChange={update('umbrella_limit')} />
        </CardContent>
      </Card>

      {entityType === 'vendor' && (
        <Card>
          <CardHeader>
            <CardTitle>Professional Liability / E&amp;O</CardTitle>
          </CardHeader>
          <CardContent>
            <CoverageField label="Professional Liability Limit" fieldData={data.professional_liability} onChange={update('professional_liability')} />
          </CardContent>
        </Card>
      )}

      {entityType === 'tenant' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Property Insurance</CardTitle>
            </CardHeader>
            <CardContent>
              <CoverageField label="Property / Contents Limit" fieldData={data.property_insurance} onChange={update('property_insurance')} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Interruption</CardTitle>
            </CardHeader>
            <CardContent>
              <CoverageField label="Required" fieldData={data.business_interruption_required} onChange={update('business_interruption_required')} type="boolean" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lease Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Lease Start</Label>
                <Input type="date" value={data.lease_start ?? ''} onChange={(e) => setData((p) => ({ ...p, lease_start: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Lease End</Label>
                <Input type="date" value={data.lease_end ?? ''} onChange={(e) => setData((p) => ({ ...p, lease_end: e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Endorsements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CoverageField label="Require Additional Insured" fieldData={data.additional_insured_required} onChange={update('additional_insured_required')} type="boolean" />
          <Separator />
          <CoverageField label="Require Waiver of Subrogation" fieldData={data.waiver_of_subrogation_required} onChange={update('waiver_of_subrogation_required')} type="boolean" />
          <Separator />
          <CoverageField label="Certificate Holder Name" fieldData={data.certificate_holder_name} onChange={update('certificate_holder_name')} type="text" />
          <CoverageField label="Certificate Holder Address" fieldData={data.certificate_holder_address} onChange={update('certificate_holder_address')} type="text" />
          <CoverageField label="Cancellation Notice Days" fieldData={data.cancellation_notice_days} onChange={update('cancellation_notice_days')} type="number" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Requirements'}
        </Button>
      </div>
    </form>
  );
}
