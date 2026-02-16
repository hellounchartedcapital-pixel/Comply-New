import { supabase } from '@/lib/supabase';
import type { Tenant, TenantRequirements } from '@/types';
import { PAGINATION } from '@/constants';

interface FetchTenantsParams {
  propertyId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface PaginatedResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

export async function fetchTenants({
  propertyId,
  status,
  search,
  page = 0,
  pageSize = PAGINATION.defaultPageSize,
}: FetchTenantsParams = {}): Promise<PaginatedResult<Tenant>> {
  let query = supabase
    .from('tenants')
    .select('*, property:properties(*)', { count: 'exact' })
    .is('deleted_at', null);

  if (propertyId && propertyId !== 'all') {
    query = query.eq('property_id', propertyId);
  }

  if (status && status !== 'all') {
    // Check both status and insurance_status for backward compat
    query = query.or(`status.eq.${status},insurance_status.eq.${status}`);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.order('name').range(from, to);

  if (error) throw error;

  return {
    data: (data as Tenant[]) ?? [],
    count: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

export async function fetchTenant(id: string): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*, property:properties(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data as Tenant;
}

export async function createTenant(tenant: {
  name: string;
  email?: string;
  property_id?: string;
  unit_suite?: string;
  tenant_type?: string;
  lease_start_date?: string;
  lease_end_date?: string;
}): Promise<Tenant> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Build insert payload with only columns guaranteed to exist.
  // The migration adding new columns may not have been applied yet.
  const upload_token = crypto.randomUUID();
  const basePayload: Record<string, unknown> = {
    name: tenant.name,
    property_id: tenant.property_id || null,
    unit: tenant.unit_suite || null,
    user_id: user.id,
    insurance_status: 'pending',
  };

  // First attempt: include new columns
  const fullPayload: Record<string, unknown> = {
    ...basePayload,
    email: tenant.email || null,
    unit_suite: tenant.unit_suite || null,
    tenant_type: tenant.tenant_type || null,
    lease_start_date: tenant.lease_start_date || null,
    lease_end_date: tenant.lease_end_date || null,
    status: 'pending',
    upload_token,
  };

  let { data, error } = await supabase
    .from('tenants')
    .insert(fullPayload)
    .select()
    .single();

  // If it fails because of missing columns, retry with only the base columns
  if (error && (error.message?.includes('column') || error.code === '42703')) {
    ({ data, error } = await supabase
      .from('tenants')
      .insert(basePayload)
      .select()
      .single());
  }

  if (error) throw new Error(error.message);
  return data as Tenant;
}

export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Tenant;
}

export async function deleteTenant(id: string): Promise<void> {
  const { error: softError } = await supabase
    .from('tenants')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (softError) throw softError;

  await supabase.from('tenants').delete().eq('id', id);
}

export async function deleteTenants(ids: string[]): Promise<void> {
  const { error: softError } = await supabase
    .from('tenants')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);
  if (softError) throw softError;

  await supabase.from('tenants').delete().in('id', ids);
}

// ============================================
// TENANT REQUIREMENTS
// ============================================

export async function fetchTenantRequirements(
  tenantId: string
): Promise<TenantRequirements | null> {
  const { data, error } = await supabase
    .from('tenant_requirements')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  // Table may not exist if migration hasn't been applied
  if (error && (error.code === '42P01' || error.message?.includes('relation'))) {
    return null;
  }
  if (error) throw error;
  return data as TenantRequirements | null;
}

export async function upsertTenantRequirements(
  tenantId: string,
  requirements: Partial<TenantRequirements>
): Promise<TenantRequirements> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tenant_requirements')
    .upsert(
      {
        tenant_id: tenantId,
        user_id: user.id,
        ...requirements,
      },
      { onConflict: 'tenant_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as TenantRequirements;
}
