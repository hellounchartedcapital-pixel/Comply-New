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

  // Auto-refresh on interval and tab focus to prevent stale data
  useEffect(() => {
    // Refresh every 60 seconds
    const intervalId = setInterval(() => {
      loadTenants();
    }, 60000);

    // Refresh when tab regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadTenants();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
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

  const deleteTenant = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTenants(prev => prev.filter(t => t.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      logger.error('Error deleting tenant', err);
      throw err;
    }
  }, []);

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
    regenerateUploadToken,
    refreshTenants: loadTenants,
  };
}

export default useTenants;
