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
    .select('*, property:properties(*)', { count: 'exact' })
    .is('deleted_at', null);

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
    .is('deleted_at', null)
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
  // Soft-delete first to ensure record is hidden from queries immediately
  const { error: softError } = await supabase
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (softError) throw softError;

  // Then attempt hard delete as cleanup
  await supabase.from('vendors').delete().eq('id', id);
}

export async function deleteVendors(ids: string[]): Promise<void> {
  const { error: softError } = await supabase
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);
  if (softError) throw softError;

  await supabase.from('vendors').delete().in('id', ids);
}
