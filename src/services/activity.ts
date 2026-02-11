import { supabase } from '@/lib/supabase';
import type { ActivityType, EntityType } from '@/types';

export interface ActivityLogEntry {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  activity_type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  created_by?: string;
}

export async function logActivity(params: {
  entityType: EntityType;
  entityId: string;
  activityType: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('activity_log').insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    activity_type: params.activityType,
    description: params.description,
    metadata: params.metadata ?? {},
    created_by: user?.id ?? null,
  });

  // Swallow errors — activity logging should never break primary flows
  if (error) {
    // Table may not exist yet; silently ignore
    if (error.code !== '42P01') {
      console.warn('Activity log write failed:', error.message);
    }
  }
}

export async function fetchActivityLog(
  entityType: EntityType,
  entityId: string,
  limit = 50
): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return (data as ActivityLogEntry[]) ?? [];
}
