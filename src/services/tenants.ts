import { supabase } from '@/lib/supabase';
import type { Tenant } from '@/types';
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
    query = query.eq('insurance_status', status);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('name')
    .range(from, to);

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
  property_id?: string;
  email?: string;
  phone?: string;
  tenant_type?: string;
}): Promise<Tenant> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      ...tenant,
      user_id: user.id,
      status: 'active' as const,
      insurance_status: 'non-compliant' as const,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Tenant;
}

export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Tenant;
}

export async function deleteTenant(id: string): Promise<void> {
  // Soft-delete first to ensure record is hidden from queries immediately
  const { error: softError } = await supabase
    .from('tenants')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (softError) throw softError;

  // Then attempt hard delete as cleanup
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
