import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

  const { data, error, count } = await query.order('name').range(from, to);

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
  email?: string;
  property_id?: string;
}): Promise<Vendor> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your hosting platform's environment variables, then redeploy."
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(`Authentication error: ${authError.message}`);
  if (!user) throw new Error('Not authenticated — please sign in to continue.');

  // Build insert payload with only columns that exist in the current schema.
  // The migration adding `email` and `upload_token` may not have been applied yet,
  // so we start with guaranteed columns and attempt to include new ones gracefully.
  const upload_token = crypto.randomUUID();
  const insertPayload: Record<string, unknown> = {
    name: vendor.name,
    contact_email: vendor.email || null,
    property_id: vendor.property_id || null,
    user_id: user.id,
    status: 'pending',
  };

  // First attempt: include new columns (email, upload_token)
  let { data, error } = await supabase
    .from('vendors')
    .insert({ ...insertPayload, email: vendor.email || null, upload_token })
    .select()
    .single();

  // If it fails because of missing columns, retry with only the base columns
  if (error && (error.message?.includes("column") || error.code === '42703')) {
    ({ data, error } = await supabase
      .from('vendors')
      .insert(insertPayload)
      .select()
      .single());
  }

  if (error) {
    if (error.code === '42P01') {
      throw new Error('Database table "vendors" not found. Run the initial setup SQL.');
    }
    if (error.code === '42703') {
      throw new Error(`Database column missing: ${error.message}. Run the latest migration.`);
    }
    if (
      error.code === '42501' ||
      error.message?.includes('row-level security') ||
      error.message?.includes('policy')
    ) {
      throw new Error('Permission denied by RLS policy. Check your RLS policies.');
    }
    throw new Error(`Failed to create vendor: ${error.message}`);
  }

  return data as Vendor;
}

export async function updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  const { error: softError } = await supabase
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (softError) throw softError;

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
