import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import logger from './logger';

export function useTenants(propertyId = null) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTenants([]);
        return;
      }

      let query = supabase
        .from('tenants')
        .select(`
          *,
          unit:units(id, unit_number, property_id),
          property:properties(id, name, address)
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .is('deleted_at', null) // Exclude soft-deleted tenants
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setTenants(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      logger.error('Error loading tenants', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Realtime subscription for instant updates
  useEffect(() => {
    let channel = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to changes on the tenants table for this user
      channel = supabase
        .channel('tenants-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tenants',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            logger.info('Realtime: tenant inserted', payload.new.id);
            // Fetch full tenant data with relations
            const { data } = await supabase
              .from('tenants')
              .select(`*, unit:units(id, unit_number, property_id), property:properties(id, name, address)`)
              .eq('id', payload.new.id)
              .single();
            if (data) {
              setTenants(prev => {
                if (prev.some(t => t.id === data.id)) return prev;
                return [data, ...prev];
              });
              setTotalCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tenants',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            logger.info('Realtime: tenant updated', payload.new.id);

            // Handle soft delete - if deleted_at is set, remove from list
            if (payload.new.deleted_at) {
              logger.info('Realtime: tenant soft-deleted', payload.new.id);
              setTenants(prev => prev.filter(t => t.id !== payload.new.id));
              setTotalCount(prev => Math.max(0, prev - 1));
              return;
            }

            // Handle restore - if was deleted and now isn't, add back to list
            if (payload.old?.deleted_at && !payload.new.deleted_at) {
              logger.info('Realtime: tenant restored', payload.new.id);
              const { data } = await supabase
                .from('tenants')
                .select(`*, unit:units(id, unit_number, property_id), property:properties(id, name, address)`)
                .eq('id', payload.new.id)
                .single();
              if (data) {
                setTenants(prev => {
                  if (prev.some(t => t.id === data.id)) return prev;
                  return [data, ...prev];
                });
                setTotalCount(prev => prev + 1);
              }
              return;
            }

            // Fetch full tenant data with relations
            const { data } = await supabase
              .from('tenants')
              .select(`*, unit:units(id, unit_number, property_id), property:properties(id, name, address)`)
              .eq('id', payload.new.id)
              .single();
            if (data) {
              setTenants(prev => prev.map(t => t.id === data.id ? data : t));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'tenants',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            logger.info('Realtime: tenant deleted', payload.old.id);
            setTenants(prev => prev.filter(t => t.id !== payload.old.id));
            setTotalCount(prev => Math.max(0, prev - 1));
          }
        )
        .subscribe((status) => {
          logger.info('Tenants realtime subscription status:', status);
        });
    };

    setupRealtimeSubscription();

    // Refresh when tab regains focus (fallback for any missed events)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadTenants();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadTenants]);

  // tokenExpiryDays can be passed from settings (default: 30 days)
  const addTenant = useCallback(async (tenantData, tokenExpiryDays = 30) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate upload token
      const uploadToken = crypto.randomUUID();
      const tokenExpiry = new Date();
      const expiryDays = tokenExpiryDays || 30;
      tokenExpiry.setDate(tokenExpiry.getDate() + expiryDays);

      const { data, error } = await supabase
        .from('tenants')
        .insert({
          user_id: user.id,
          ...tenantData,
          upload_token: uploadToken,
          upload_token_expires_at: tokenExpiry.toISOString(),
        })
        .select(`
          *,
          unit:units(id, unit_number, property_id),
          property:properties(id, name, address)
        `)
        .single();

      if (error) throw error;

      setTenants(prev => [data, ...prev]);
      setTotalCount(prev => prev + 1);
      return data;
    } catch (err) {
      logger.error('Error adding tenant', err);
      throw err;
    }
  }, []);

  const updateTenant = useCallback(async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          unit:units(id, unit_number, property_id),
          property:properties(id, name, address)
        `)
        .single();

      if (error) throw error;

      setTenants(prev => prev.map(t => t.id === id ? data : t));
      return data;
    } catch (err) {
      logger.error('Error updating tenant', err);
      throw err;
    }
  }, []);

  // Soft delete a tenant (sets deleted_at timestamp instead of hard delete)
  const deleteTenant = useCallback(async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tenants')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .is('deleted_at', null) // Only delete if not already deleted
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Tenant not found or already deleted');
      }

      logger.info('Successfully soft-deleted tenant', id);
      setTenants(prev => prev.filter(t => t.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      logger.error('Error deleting tenant', err);
      throw err;
    }
  }, []);

  // Restore a soft-deleted tenant
  const restoreTenant = useCallback(async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tenants')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null) // Only restore if actually deleted
        .select(`
          *,
          unit:units(id, unit_number, property_id),
          property:properties(id, name, address)
        `)
        .single();

      if (error) throw error;

      logger.info('Successfully restored tenant', id);
      await loadTenants(); // Refresh to get updated list
      return data;
    } catch (err) {
      logger.error('Error restoring tenant', err);
      throw err;
    }
  }, [loadTenants]);

  // tokenExpiryDays can be passed from settings (default: 30 days)
  const regenerateUploadToken = useCallback(async (id, tokenExpiryDays = 30) => {
    try {
      const uploadToken = crypto.randomUUID();
      const tokenExpiry = new Date();
      const expiryDays = tokenExpiryDays || 30;
      tokenExpiry.setDate(tokenExpiry.getDate() + expiryDays);

      const { data, error } = await supabase
        .from('tenants')
        .update({
          upload_token: uploadToken,
          upload_token_expires_at: tokenExpiry.toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTenants(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      return data;
    } catch (err) {
      logger.error('Error regenerating token', err);
      throw err;
    }
  }, []);

  // Memoize compliance stats to prevent recalculation on every render
  const stats = useMemo(() => ({
    total: tenants.length,
    compliant: tenants.filter(t => t.insurance_status === 'compliant').length,
    nonCompliant: tenants.filter(t => t.insurance_status === 'non-compliant').length,
    expiring: tenants.filter(t => t.insurance_status === 'expiring').length,
    expired: tenants.filter(t => t.insurance_status === 'expired').length,
    pending: tenants.filter(t => t.insurance_status === 'pending').length,
  }), [tenants]);

  return {
    tenants,
    loading,
    error,
    totalCount,
    stats,
    addTenant,
    updateTenant,
    deleteTenant,
    restoreTenant,
    regenerateUploadToken,
    refreshTenants: loadTenants,
  };
}

export default useTenants;
