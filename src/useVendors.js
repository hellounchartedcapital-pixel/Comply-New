import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

const PAGE_SIZE = 50;

// Helper to recalculate vendor status based on current date
function recalculateVendorStatus(vendor) {
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Parse date string to local date
  const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Check if any coverage is expired or expiring
  let hasExpired = false;
  let hasExpiringSoon = false;

  const checkCoverage = (coverage) => {
    if (!coverage || !coverage.expirationDate) return;
    const expDate = parseLocalDate(coverage.expirationDate);
    if (!expDate) return;

    const daysUntil = Math.floor((expDate - todayLocal) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) {
      hasExpired = true;
      coverage.expired = true;
    } else if (daysUntil <= 30) {
      hasExpiringSoon = true;
      coverage.expiringSoon = true;
    }
  };

  // Check all coverage types
  if (vendor.coverage) {
    checkCoverage(vendor.coverage.generalLiability);
    checkCoverage(vendor.coverage.autoLiability);
    checkCoverage(vendor.coverage.workersComp);
    checkCoverage(vendor.coverage.employersLiability);
  }

  // Check additional coverages
  if (vendor.additional_coverages && Array.isArray(vendor.additional_coverages)) {
    vendor.additional_coverages.forEach(cov => checkCoverage(cov));
  }

  // Normalize issues to expected format {type, message}
  let normalizedIssues = [];
  if (vendor.issues && Array.isArray(vendor.issues)) {
    normalizedIssues = vendor.issues.map(issue => {
      if (typeof issue === 'string') {
        // Convert string to object format
        const isCritical = issue.toLowerCase().includes('expired') ||
                          issue.toLowerCase().includes('missing') ||
                          issue.toLowerCase().includes('below');
        return { type: isCritical ? 'critical' : 'warning', message: issue };
      }
      // Already an object, ensure it has required properties
      return {
        type: issue.type || 'warning',
        message: issue.message || String(issue)
      };
    });
  }

  // Determine new status
  let newStatus = vendor.status;
  if (hasExpired) {
    newStatus = 'expired';
  } else if (hasExpiringSoon && vendor.status === 'compliant') {
    newStatus = 'expiring';
  } else if (normalizedIssues.length > 0 && vendor.status === 'compliant') {
    newStatus = 'non-compliant';
  }

  return { ...vendor, status: newStatus, issues: normalizedIssues };
}

export function useVendors(propertyId = null) {
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startIndex = reset ? 0 : vendors.length;
      const endIndex = startIndex + PAGE_SIZE - 1;

      // Build query with optional property filter
      let countQuery = supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      let dataQuery = supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id);

      // Filter by property if specified
      if (propertyId) {
        countQuery = countQuery.eq('property_id', propertyId);
        dataQuery = dataQuery.eq('property_id', propertyId);
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

      // Recalculate status for each vendor based on current date
      const newVendors = (data || []).map(recalculateVendorStatus);

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
  }, [vendors.length, propertyId]);

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

      // Generate upload token if not provided (for vendor upload portal)
      const uploadToken = vendorData.rawData?.uploadToken || crypto.randomUUID();

      const { data, error } = await supabase
        .from('vendors')
        .insert([{
          user_id: user.id,
          property_id: vendorData.propertyId || propertyId || null,
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
          upload_token: uploadToken
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use select() to return the deleted row and verify deletion
      const { data, error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      // Check if any row was actually deleted
      if (!data || data.length === 0) {
        throw new Error('Vendor not found or already deleted');
      }

      console.log('Successfully deleted vendor:', id);

      // Remove from local state
      setVendors(prev => prev.filter(v => v.id !== id));
      setTotalCount(prev => prev - 1);
      return { success: true };
    } catch (err) {
      console.error('Error deleting vendor:', err);
      return { success: false, error: err.message };
    }
  };

  // Fetch vendors on mount and when propertyId changes
  useEffect(() => {
    fetchVendors(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

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
