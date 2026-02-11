import { supabase } from '@/lib/supabase';
import type { Vendor } from '@/types';
import { PAGINATION } from '@/constants';

interface FetchVendorsParams {
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

export async function fetchVendors({
  propertyId,
  status,
  search,
  page = 0,
  pageSize = PAGINATION.defaultPageSize,
}: FetchVendorsParams = {}): Promise<PaginatedResult<Vendor>> {
  let query = supabase
    .from('vendors')
    .select('*, property:properties(*)', { count: 'exact' });

  if (propertyId && propertyId !== 'all') {
    query = query.eq('property_id', propertyId);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
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
    data: (data as Vendor[]) ?? [],
    count: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

export async function fetchVendor(id: string): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*, property:properties(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Vendor;
}

export async function createVendor(vendor: {
  name: string;
  property_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .insert({ ...vendor, status: 'non-compliant' as const })
    .select()
    .single();

  if (error) throw error;
  return data as Vendor;
}

export async function updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw error;
}
