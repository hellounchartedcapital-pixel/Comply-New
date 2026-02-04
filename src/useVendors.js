import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import logger from './logger';
import { recalculateVendorStatus } from './utils/complianceUtils';

const PAGE_SIZE = 50;

/**
 * Custom hook for managing vendors
 * @param {string|null} propertyId - Filter vendors by property ID
 * @param {object} options - Optional configuration
 * @param {number} options.expiringThresholdDays - Days before expiration to mark as "expiring" (default: 30)
 */
export function useVendors(propertyId = null, options = {}) {
  const { expiringThresholdDays = 30 } = options;

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Use ref to track current vendor count for pagination without causing re-renders
  const vendorCountRef = useRef(0);

  // Fetch vendors with pagination
  const fetchVendors = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setVendors([]);
        vendorCountRef.current = 0;
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startIndex = reset ? 0 : vendorCountRef.current;
      const endIndex = startIndex + PAGE_SIZE - 1;

      // Build query with optional property filter
      let countQuery = supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null); // Exclude soft-deleted vendors

      let dataQuery = supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null); // Exclude soft-deleted vendors

      // Filter by property if specified (check both property_id and property_ids array)
      if (propertyId) {
        countQuery = countQuery.or(`property_id.eq.${propertyId},property_ids.cs.{${propertyId}}`);
        dataQuery = dataQuery.or(`property_id.eq.${propertyId},property_ids.cs.{${propertyId}}`);
      }

      // Get total count first (only on initial load)
      if (reset) {
        const { count } = await countQuery;
        setTotalCount(count || 0);
      }

      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(startIndex, endIndex);

      if (error) throw error;

      // Recalculate status for each vendor based on current date and threshold
      const newVendors = (data || []).map(v => recalculateVendorStatus(v, expiringThresholdDays));

      if (reset) {
        setVendors(newVendors);
        vendorCountRef.current = newVendors.length;
      } else {
        setVendors(prev => {
          const updated = [...prev, ...newVendors];
          vendorCountRef.current = updated.length;
          return updated;
        });
      }

      setHasMore(newVendors.length === PAGE_SIZE);
    } catch (err) {
      logger.error('Error fetching vendors', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [propertyId, expiringThresholdDays]); // Removed vendors.length to prevent infinite loop

  // Load more vendors
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchVendors(false);
    }
  }, [fetchVendors, loadingMore, hasMore]);

  // Add a new vendor
  // tokenExpiryDays can be passed from settings (default: 30 days)
  const addVendor = async (vendorData, tokenExpiryDays = 30) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Generate upload token if not provided (for vendor upload portal)
      const uploadToken = vendorData.rawData?.uploadToken || crypto.randomUUID();
      // Token expiration: use provided value, passed setting, or default to 30 days
      const expiryDays = tokenExpiryDays || 30;
      const tokenExpiresAt = vendorData.rawData?.uploadTokenExpiresAt ||
        new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

      // Handle both single propertyId and multiple propertyIds
      const propertyIds = vendorData.propertyIds || (vendorData.propertyId ? [vendorData.propertyId] : []);
      const primaryPropertyId = propertyIds[0] || propertyId || null;

      const { data, error } = await supabase
        .from('vendors')
        .insert([{
          user_id: user.id,
          property_id: primaryPropertyId, // Keep for backwards compatibility
          property_ids: propertyIds, // New array field
          name: vendorData.name,
          dba: vendorData.dba,
          status: vendorData.status,
          expiration_date: vendorData.expirationDate,
          days_overdue: vendorData.daysOverdue || 0,
          coverage: vendorData.coverage,
          issues: vendorData.issues,
          raw_data: vendorData.rawData || null,
          requirements: vendorData.requirements || null,
          additional_coverages: vendorData.additionalCoverages || [],
          additional_insured: vendorData.additionalInsured || '',
          certificate_holder: vendorData.certificateHolder || '',
          has_additional_insured: vendorData.hasAdditionalInsured || false,
          missing_additional_insured: vendorData.missingAdditionalInsured || false,
          waiver_of_subrogation: vendorData.waiverOfSubrogation || '',
          has_waiver_of_subrogation: vendorData.hasWaiverOfSubrogation || false,
          missing_waiver_of_subrogation: vendorData.missingWaiverOfSubrogation || false,
          contact_name: vendorData.contactName || null,
          contact_email: vendorData.contactEmail || null,
          contact_phone: vendorData.contactPhone || null,
          contact_notes: vendorData.contactNotes || null,
          upload_token: uploadToken,
          upload_token_expires_at: tokenExpiresAt
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to local state at the beginning
      setVendors(prev => {
        const updated = [data, ...prev];
        vendorCountRef.current = updated.length;
        return updated;
      });
      setTotalCount(prev => prev + 1);
      return { success: true, data };
    } catch (err) {
      logger.error('Error adding vendor', err);
      return { success: false, error: err.message };
    }
  };

  // Update a vendor
  const updateVendor = async (id, updates) => {
    try {
      // Map frontend field names to database column names
      const dbUpdates = {
        name: updates.name,
        dba: updates.dba,
        status: updates.status,
        expiration_date: updates.expirationDate,
        days_overdue: updates.daysOverdue,
        coverage: updates.coverage,
        issues: updates.issues
      };

      // Add contact fields if present
      if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
      if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
      if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
      if (updates.contactNotes !== undefined) dbUpdates.contact_notes = updates.contactNotes;

      // Handle property assignment (support both single and multiple)
      if (updates.propertyIds !== undefined) {
        dbUpdates.property_ids = updates.propertyIds;
        dbUpdates.property_id = updates.propertyIds[0] || null; // Keep primary for backwards compatibility
      } else if (updates.propertyId !== undefined) {
        dbUpdates.property_id = updates.propertyId;
        dbUpdates.property_ids = updates.propertyId ? [updates.propertyId] : [];
      }

      const { data, error } = await supabase
        .from('vendors')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setVendors(prev => prev.map(v => v.id === id ? data : v));
      return { success: true, data };
    } catch (err) {
      logger.error('Error updating vendor', err);
      return { success: false, error: err.message };
    }
  };

  // Soft delete a vendor (sets deleted_at timestamp instead of hard delete)
  const deleteVendor = async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Soft delete by setting deleted_at timestamp
      const { data, error } = await supabase
        .from('vendors')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .is('deleted_at', null) // Only delete if not already deleted
        .select();

      if (error) throw error;

      // Check if any row was actually updated
      if (!data || data.length === 0) {
        throw new Error('Vendor not found or already deleted');
      }

      logger.info('Successfully soft-deleted vendor', id);

      // Remove from local state
      setVendors(prev => {
        const updated = prev.filter(v => v.id !== id);
        vendorCountRef.current = updated.length;
        return updated;
      });
      setTotalCount(prev => prev - 1);
      return { success: true };
    } catch (err) {
      logger.error('Error deleting vendor', err);
      return { success: false, error: err.message };
    }
  };

  // Restore a soft-deleted vendor
  const restoreVendor = async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('vendors')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null) // Only restore if actually deleted
        .select()
        .single();

      if (error) throw error;

      logger.info('Successfully restored vendor', id);

      // Refresh to get updated list
      await fetchVendors(true);
      return { success: true, data };
    } catch (err) {
      logger.error('Error restoring vendor', err);
      return { success: false, error: err.message };
    }
  };

  // Fetch vendors on mount and when propertyId changes
  useEffect(() => {
    fetchVendors(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  // Realtime subscription for instant updates
  useEffect(() => {
    let channel = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to changes on the vendors table for this user
      channel = supabase
        .channel('vendors-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'vendors',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            logger.info('Realtime: vendor inserted', payload.new.id);
            const newVendor = recalculateVendorStatus(payload.new, expiringThresholdDays);
            setVendors(prev => {
              // Avoid duplicates
              if (prev.some(v => v.id === newVendor.id)) return prev;
              const updated = [newVendor, ...prev];
              vendorCountRef.current = updated.length;
              return updated;
            });
            setTotalCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'vendors',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            logger.info('Realtime: vendor updated', payload.new.id);

            // Handle soft delete - if deleted_at is set, remove from list
            if (payload.new.deleted_at) {
              logger.info('Realtime: vendor soft-deleted', payload.new.id);
              setVendors(prev => {
                const updated = prev.filter(v => v.id !== payload.new.id);
                vendorCountRef.current = updated.length;
                return updated;
              });
              setTotalCount(prev => Math.max(0, prev - 1));
              return;
            }

            // Handle restore - if was deleted and now isn't, add back to list
            if (payload.old?.deleted_at && !payload.new.deleted_at) {
              logger.info('Realtime: vendor restored', payload.new.id);
              const restoredVendor = recalculateVendorStatus(payload.new, expiringThresholdDays);
              setVendors(prev => {
                if (prev.some(v => v.id === restoredVendor.id)) return prev;
                const updated = [restoredVendor, ...prev];
                vendorCountRef.current = updated.length;
                return updated;
              });
              setTotalCount(prev => prev + 1);
              return;
            }

            const updatedVendor = recalculateVendorStatus(payload.new, expiringThresholdDays);
            setVendors(prev => prev.map(v => v.id === updatedVendor.id ? updatedVendor : v));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'vendors',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            logger.info('Realtime: vendor deleted', payload.old.id);
            setVendors(prev => {
              const updated = prev.filter(v => v.id !== payload.old.id);
              vendorCountRef.current = updated.length;
              return updated;
            });
            setTotalCount(prev => Math.max(0, prev - 1));
          }
        )
        .subscribe((status) => {
          logger.info('Realtime subscription status:', status);
        });
    };

    setupRealtimeSubscription();

    // Refresh when tab regains focus (fallback for any missed events)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchVendors(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchVendors, expiringThresholdDays]);

  return {
    vendors,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    addVendor,
    updateVendor,
    deleteVendor,
    restoreVendor,
    loadMore,
    refreshVendors: () => fetchVendors(true)
  };
}
