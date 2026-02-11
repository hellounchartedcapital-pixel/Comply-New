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
    .select('*, property:properties(*)', { count: 'exact' });

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
    .single();

  if (error) throw error;
  return data as Tenant;
}

export async function createTenant(tenant: {
  name: string;
  property_id?: string;
  unit?: string;
  email?: string;
  phone?: string;
  lease_start?: string;
  lease_end?: string;
}): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      ...tenant,
      status: 'active' as const,
      insurance_status: 'non-compliant' as const,
    })
    .select()
    .single();

  if (error) throw error;
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
  const { error } = await supabase.from('tenants').delete().eq('id', id);
  if (error) throw error;
}
