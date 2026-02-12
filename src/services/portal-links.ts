import { supabase } from '@/lib/supabase';
import type { EntityType } from '@/types';

/**
 * Generate a cryptographically random upload token as a valid UUID v4.
 * The database column is UUID type so we must produce a properly formatted UUID.
 */
function generateToken(): string {
  return crypto.randomUUID();
}

/**
 * Create (or refresh) an upload token for a vendor or tenant and return the
 * full portal URL the entity can use to self-serve their COI upload.
 *
 * Tokens expire after `expiryDays` days (default 30).
 */
export async function generatePortalLink(
  entityType: EntityType,
  entityId: string,
  expiryDays = 30
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const table = entityType === 'vendor' ? 'vendors' : 'tenants';

  const { error } = await supabase
    .from(table)
    .update({
      upload_token: token,
      upload_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', entityId);

  if (error) throw new Error(`Failed to generate portal link: ${error.message}`);

  const portalPath = entityType === 'vendor' ? '/vendor-portal' : '/tenant-portal';
  return `${window.location.origin}${portalPath}?token=${token}`;
}

/**
 * Get the existing portal link for an entity, or null if no token exists / it
 * has expired.
 */
export async function getExistingPortalLink(
  entityType: EntityType,
  entityId: string
): Promise<string | null> {
  const table = entityType === 'vendor' ? 'vendors' : 'tenants';

  const { data, error } = await supabase
    .from(table)
    .select('upload_token, upload_token_expires_at')
    .eq('id', entityId)
    .single();

  if (error || !data?.upload_token) return null;

  // Check if expired
  if (
    data.upload_token_expires_at &&
    new Date(data.upload_token_expires_at) < new Date()
  ) {
    return null;
  }

  const portalPath = entityType === 'vendor' ? '/vendor-portal' : '/tenant-portal';
  return `${window.location.origin}${portalPath}?token=${data.upload_token}`;
}
