import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddPropertyButton } from '@/components/properties/add-property-button';
import type { PropertyType } from '@/types';

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  office: 'Office',
  retail: 'Retail',
  industrial: 'Industrial',
  mixed_use: 'Mixed-Use',
  multifamily: 'Multifamily',
  other: 'Other',
};

interface PropertyWithCounts {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  property_type: PropertyType;
  vendor_count: number;
  tenant_count: number;
  vendor_compliant: number;
  vendor_expiring: number;
  vendor_non_compliant: number;
  tenant_compliant: number;
  tenant_expiring: number;
  tenant_non_compliant: number;
}

function formatAddress(p: PropertyWithCounts): string | null {
  const parts = [p.address, p.city, p.state ? `${p.state} ${p.zip ?? ''}`.trim() : p.zip]
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

function ComplianceSummary({
  label,
  total,
  compliant,
  expiring,
  nonCompliant,
}: {
  label: string;
  total: number;
  compliant: number;
  expiring: number;
  nonCompliant: number;
}) {
  if (total === 0) {
    return (
      <span className="text-xs text-slate-400">No {label} yet</span>
    );
  }

  let colorClass = 'text-status-compliant';
  if (nonCompliant > 0) colorClass = 'text-status-non-compliant';
  else if (expiring > 0) colorClass = 'text-status-expiring';

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {compliant} of {total} {label} compliant
    </span>
  );
}

export default async function PropertiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) redirect('/login');
  const orgId = profile.organization_id;

  // Fetch org default entities (for the add property modal)
  const { data: defaultEntities } = await supabase
    .from('organization_default_entities')
    .select('*')
    .eq('organization_id', orgId);

  // Fetch properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, address, city, state, zip, property_type, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  // Fetch vendor and tenant compliance counts per property
  const propertyList: PropertyWithCounts[] = [];

  if (properties && properties.length > 0) {
    for (const prop of properties) {
      const { data: vendors } = await supabase
        .from('vendors')
        .select('compliance_status')
        .eq('property_id', prop.id)
        .is('deleted_at', null);

      const { data: tenants } = await supabase
        .from('tenants')
        .select('compliance_status')
        .eq('property_id', prop.id)
        .is('deleted_at', null);

      const vList = vendors ?? [];
      const tList = tenants ?? [];

      propertyList.push({
        ...prop,
        vendor_count: vList.length,
        tenant_count: tList.length,
        vendor_compliant: vList.filter((v) => v.compliance_status === 'compliant').length,
        vendor_expiring: vList.filter((v) => v.compliance_status === 'expiring_soon').length,
        vendor_non_compliant: vList.filter(
          (v) => v.compliance_status === 'non_compliant' || v.compliance_status === 'expired'
        ).length,
        tenant_compliant: tList.filter((t) => t.compliance_status === 'compliant').length,
        tenant_expiring: tList.filter((t) => t.compliance_status === 'expiring_soon').length,
        tenant_non_compliant: tList.filter(
          (t) => t.compliance_status === 'non_compliant' || t.compliance_status === 'expired'
        ).length,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Properties
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your properties and track compliance.
          </p>
        </div>
        <AddPropertyButton
          defaultEntities={defaultEntities ?? []}
          orgId={orgId}
        />
      </div>

      {/* Property cards or empty state */}
      {propertyList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-7 w-7 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">
              No properties yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first property to start tracking compliance.
            </p>
            <div className="mt-6">
              <AddPropertyButton
                defaultEntities={defaultEntities ?? []}
                orgId={orgId}
                variant="default"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {propertyList.map((prop) => {
            const addr = formatAddress(prop);
            return (
              <Link
                key={prop.id}
                href={`/dashboard/properties/${prop.id}`}
                className="group"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-foreground group-hover:text-brand-dark">
                        {prop.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px]"
                      >
                        {PROPERTY_TYPE_LABELS[prop.property_type]}
                      </Badge>
                    </div>

                    {addr && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {addr}
                      </p>
                    )}

                    <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
                      <ComplianceSummary
                        label="vendors"
                        total={prop.vendor_count}
                        compliant={prop.vendor_compliant}
                        expiring={prop.vendor_expiring}
                        nonCompliant={prop.vendor_non_compliant}
                      />
                      <br />
                      <ComplianceSummary
                        label="tenants"
                        total={prop.tenant_count}
                        compliant={prop.tenant_compliant}
                        expiring={prop.tenant_expiring}
                        nonCompliant={prop.tenant_non_compliant}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
