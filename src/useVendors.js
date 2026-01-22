import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

const PAGE_SIZE = 50;

export function useVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch vendors with pagination
  const fetchVendors = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setVendors([]);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const startIndex = reset ? 0 : vendors.length;
      const endIndex = startIndex + PAGE_SIZE - 1;

      // Get total count first (only on initial load)
      if (reset) {
        const { count } = await supabase
          .from('vendors')
          .select('*', { count: 'exact', head: true });
        setTotalCount(count || 0);
      }

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false })
        .range(startIndex, endIndex);

      if (error) throw error;

      const newVendors = data || [];

      if (reset) {
        setVendors(newVendors);
      } else {
        setVendors(prev => [...prev, ...newVendors]);
      }

      setHasMore(newVendors.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [vendors.length]);

  // Load more vendors
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchVendors(false);
    }
  }, [fetchVendors, loadingMore, hasMore]);

  // Add a new vendor
  const addVendor = async (vendorData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('vendors')
        .insert([{
          user_id: user.id,
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
          contact_notes: vendorData.contactNotes || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to local state at the beginning
      setVendors(prev => [data, ...prev]);
      setTotalCount(prev => prev + 1);
      return { success: true, data };
    } catch (err) {
      console.error('Error adding vendor:', err);
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
      console.error('Error updating vendor:', err);
      return { success: false, error: err.message };
    }
  };

  // Delete a vendor
  const deleteVendor = async (id) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setVendors(prev => prev.filter(v => v.id !== id));
      setTotalCount(prev => prev - 1);
      return { success: true };
    } catch (err) {
      console.error('Error deleting vendor:', err);
      return { success: false, error: err.message };
    }
  };

  // Fetch vendors on mount
  useEffect(() => {
    fetchVendors(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    loadMore,
    refreshVendors: () => fetchVendors(true)
  };
}
