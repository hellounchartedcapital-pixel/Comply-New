import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all vendors for the current user
  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      // Add to local state
      setVendors(prev => [data, ...prev]);
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
      return { success: true };
    } catch (err) {
      console.error('Error deleting vendor:', err);
      return { success: false, error: err.message };
    }
  };

  // Fetch vendors on mount
  useEffect(() => {
    fetchVendors();
  }, []);

  return {
    vendors,
    loading,
    error,
    addVendor,
    updateVendor,
    deleteVendor,
    refreshVendors: fetchVendors
  };
}
