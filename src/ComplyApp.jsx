import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Calendar, X, Search, Download, Settings as SettingsIcon, Eye, Bell, FileDown, Phone, Mail, User, Send, Clock, History, FileCheck, Building2, CreditCard, Users, LayoutDashboard, Loader2 } from 'lucide-react';
import { useVendors } from './useVendors';
import { useTenants } from './useTenants';
import { useSubscription } from './useSubscription';
import { SmartUploadModal } from './SmartUploadModal';
import { Settings } from './Settings';
import { NotificationSettings } from './NotificationSettings';
import { OnboardingTutorial } from './OnboardingTutorial';
import { AlertModal, useAlertModal } from './AlertModal';
import { ActivityLog } from './ActivityLog';
import { supabase } from './supabaseClient';
import { exportPDFReport } from './exportPDFReport';
import { Logo } from './Logo';
import Properties from './Properties';
import { PropertySelector } from './PropertySelector';
import { TenantsView } from './TenantsView';
import { Dashboard } from './Dashboard';
import { isValidEmail } from './validation';
import logger from './logger';
import { formatDate, formatRelativeDate, formatCurrency, getDaysUntil } from './utils/complianceUtils';

function ComplyApp({ user, onSignOut, onShowPricing }) {
  // Active tab state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'vendors', or 'tenants'
  const [showSmartUpload, setShowSmartUpload] = useState(false);

  // Properties state
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showProperties, setShowProperties] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);

  // Use database hook instead of local state - filter by selected property
  const { vendors: dbVendors, loading, loadingMore, error, hasMore, totalCount, updateVendor, deleteVendor, loadMore, refreshVendors } = useVendors(selectedProperty?.id);

  // Tenants hook for dashboard
  const { tenants: dbTenants, refreshTenants } = useTenants();

  // Convert database format (snake_case) to app format (camelCase)
  const vendors = dbVendors.map(v => ({
    id: v.id,
    propertyId: v.property_id,
    name: v.name,
    dba: v.dba,
    status: v.status,
    expirationDate: v.expiration_date,
    daysOverdue: v.days_overdue,
    coverage: v.coverage,
    issues: v.issues,
    additionalCoverages: v.additional_coverages || [],
    additionalInsured: v.additional_insured,
    hasAdditionalInsured: v.has_additional_insured,
    missingAdditionalInsured: v.missing_additional_insured,
    waiverOfSubrogation: v.waiver_of_subrogation,
    hasWaiverOfSubrogation: v.has_waiver_of_subrogation,
    missingWaiverOfSubrogation: v.missing_waiver_of_subrogation,
    contactName: v.contact_name,
    contactEmail: v.contact_email,
    contactPhone: v.contact_phone,
    contactNotes: v.contact_notes,
    lastContactedAt: v.last_contacted_at,
    uploadToken: v.upload_token,
    uploadTokenExpiresAt: v.upload_token_expires_at,
    rawData: v.raw_data
  }));

  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all'); // Quick filter for button interface
  const [sortBy, setSortBy] = useState('name');
  const [editingVendor, setEditingVendor] = useState(null);
  const [savingVendor, setSavingVendor] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingVendor, setDeletingVendor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [userRequirements, setUserRequirements] = useState(null);
  const [requestCOIVendor, setRequestCOIVendor] = useState(null);
  const [requestCOIEmail, setRequestCOIEmail] = useState('');
  const [vendorDetailsTab, setVendorDetailsTab] = useState('details');
  const [coiPreviewUrl, setCoiPreviewUrl] = useState(null);
  const [vendorActivity, setVendorActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [bulkRequesting, setBulkRequesting] = useState(false);
  const [bulkRequestConfirm, setBulkRequestConfirm] = useState(null); // vendors to send bulk requests to
  const [selectedVendorIds, setSelectedVendorIds] = useState(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignPropertyId, setBulkAssignPropertyId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { subscription, isFreePlan } = useSubscription();

  // Load properties
  const loadProperties = async () => {
    try {
      setLoadingProperties(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error loading properties', error);
        return;
      }

      setProperties(data || []);
      // If no property is selected and we have properties, select the first one
      // Or if "All Properties" mode (selectedProperty = null), keep it
    } catch (err) {
      logger.error('Error loading properties', err);
    } finally {
      setLoadingProperties(false);
    }
  };

  // Load user requirements, properties, and check onboarding status on mount
  React.useEffect(() => {
    loadUserRequirements();
    loadProperties();
    checkOnboardingStatus();
  }, []);

  const loadUserRequirements = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error loading requirements', error);
        return;
      }

      if (data) {
        // Decode custom coverages from additional_requirements array
        const additionalReqs = data.additional_requirements || [];
        const customCoverages = [];

        if (Array.isArray(additionalReqs)) {
          additionalReqs.forEach(item => {
            if (typeof item === 'string' && item.startsWith('__COVERAGE__')) {
              try {
                const coverage = JSON.parse(item.substring(12));
                customCoverages.push(coverage);
              } catch (e) {
                logger.error('Failed to parse coverage', e);
              }
            }
          });
        }

        setUserRequirements({
          general_liability: data.general_liability || 1000000,
          auto_liability: data.auto_liability || 1000000,
          workers_comp: data.workers_comp || 'Statutory',
          employers_liability: data.employers_liability || 500000,
          custom_coverages: customCoverages,
          company_name: data.company_name || '',
          require_additional_insured: data.require_additional_insured !== false,
          require_waiver_of_subrogation: data.require_waiver_of_subrogation || false
        });
      }
    } catch (err) {
      logger.error('Error loading user requirements', err);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('settings')
        .select('onboarding_completed')
        .eq('user_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error checking onboarding status', error);
        setOnboardingChecked(true);
        return;
      }

      // If no settings exist or onboarding not completed, show onboarding
      if (!data || !data.onboarding_completed) {
        setShowOnboarding(true);
      }

      setOnboardingChecked(true);
    } catch (err) {
      logger.error('Error checking onboarding status', err);
      setOnboardingChecked(true);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Update or insert onboarding completion status
      const { error } = await supabase
        .from('settings')
        .upsert({
          user_id: currentUser.id,
          onboarding_completed: true
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        logger.error('Error saving onboarding status', error);
      }

      setShowOnboarding(false);
    } catch (err) {
      logger.error('Error completing onboarding', err);
      setShowOnboarding(false);
    }
  };

  const handleOnboardingSkip = async () => {
    // Same as complete - mark as done so they don't see it again
    await handleOnboardingComplete();
  };

  // Helper functions
  const getStatusIcon = (status) => {
    if (status === 'expired') return <XCircle className="text-red-500" size={20} />;
    if (status === 'non-compliant') return <AlertCircle className="text-orange-500" size={20} />;
    if (status === 'expiring') return <AlertCircle className="text-yellow-500" size={20} />;
    return <CheckCircle className="text-emerald-500" size={20} />;
  };

  // Get status badge with dynamic days calculation
  const getStatusBadge = (status, expirationDate) => {
    const styles = {
      expired: 'bg-red-100 text-red-700 border border-red-200',
      'non-compliant': 'bg-orange-100 text-orange-700 border border-orange-200',
      expiring: 'bg-amber-100 text-amber-700 border border-amber-200',
      compliant: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    };

    // Calculate days dynamically for accurate display
    const days = getDaysUntil(expirationDate);

    let label;
    if (status === 'expired' && days !== null && days < 0) {
      label = `Expired ${Math.abs(days)} days`;
    } else if (status === 'expiring' && days !== null && days >= 0) {
      label = `Expiring in ${days} days`;
    } else {
      label = status.replace('-', ' ').toUpperCase();
    }

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {label}
      </span>
    );
  };

  // formatDate, formatRelativeDate, and formatCurrency imported from utils/complianceUtils

  // Get public URL for COI document
  const getCOIDocumentUrl = async (documentPath) => {
    if (!documentPath) return null;

    const { data } = supabase.storage
      .from('coi-documents')
      .getPublicUrl(documentPath);

    return data.publicUrl;
  };

  // View COI in new tab
  const handleViewCOI = async (vendor) => {
    if (!vendor.rawData?.documentPath) {
      showAlert({
        type: 'warning',
        title: 'No Document',
        message: 'No document available for this vendor.',
        details: 'This vendor was added without uploading a COI document.'
      });
      return;
    }

    const url = await getCOIDocumentUrl(vendor.rawData.documentPath);
    if (url) {
      window.open(url, '_blank');
    } else {
      showAlert({
        type: 'error',
        title: 'Retrieval Failed',
        message: 'Unable to retrieve the document.',
        details: 'Please try again or contact support if the issue persists.'
      });
    }
  };

  // Download COI
  const handleDownloadCOI = async (vendor) => {
    if (!vendor.rawData?.documentPath) {
      showAlert({
        type: 'warning',
        title: 'No Document',
        message: 'No document available for this vendor.',
        details: 'This vendor was added without uploading a COI document.'
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('coi-documents')
        .download(vendor.rawData.documentPath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vendor.name}_COI.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Error downloading COI', err);
      showAlert({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download the document.',
        details: err.message || 'Please try again or contact support.'
      });
    }
  };

  // Filter and sort
  const filterAndSort = (vendors) => {
    let filtered = vendors;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.dba && v.dba.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Quick filter (replaces status filter dropdown)
    if (quickFilter !== 'all') {
      if (quickFilter === 'expired') {
        filtered = filtered.filter(v => v.status === 'expired');
      } else if (quickFilter === 'expiring') {
        filtered = filtered.filter(v => v.status === 'expiring');
      } else if (quickFilter === 'non-compliant') {
        filtered = filtered.filter(v => v.status === 'non-compliant');
      } else if (quickFilter === 'compliant') {
        filtered = filtered.filter(v => v.status === 'compliant');
      } else if (quickFilter === 'missing-additional-insured') {
        filtered = filtered.filter(v => v.missingAdditionalInsured || !v.hasAdditionalInsured);
      } else if (quickFilter === 'not-contacted-30-days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(v => {
          if (!v.lastContactedAt) return true; // Never contacted
          return new Date(v.lastContactedAt) < thirtyDaysAgo;
        });
      } else if (quickFilter === 'needs-attention') {
        filtered = filtered.filter(v =>
          v.status === 'expired' || v.status === 'non-compliant' || v.status === 'expiring'
        );
      }
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'expiration') {
        return new Date(a.expirationDate) - new Date(b.expirationDate);
      } else if (sortBy === 'status') {
        const statusOrder = { expired: 0, 'non-compliant': 1, expiring: 2, compliant: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      } else if (sortBy === 'last-contacted') {
        // Sort by last contacted (null/never contacted first)
        if (!a.lastContactedAt && !b.lastContactedAt) return 0;
        if (!a.lastContactedAt) return -1;
        if (!b.lastContactedAt) return 1;
        return new Date(a.lastContactedAt) - new Date(b.lastContactedAt);
      }
      return 0;
    });

    return filtered;
  };

  const filteredVendors = filterAndSort(vendors);

  // Stats
  // Calculate stats including new filters
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const stats = {
    total: vendors.length,
    expired: vendors.filter(v => v.status === 'expired').length,
    expiring: vendors.filter(v => v.status === 'expiring').length,
    nonCompliant: vendors.filter(v => v.status === 'non-compliant').length,
    compliant: vendors.filter(v => v.status === 'compliant').length,
    missingAdditionalInsured: vendors.filter(v => v.missingAdditionalInsured || !v.hasAdditionalInsured).length,
    notContactedRecently: vendors.filter(v => {
      if (!v.lastContactedAt) return true;
      return new Date(v.lastContactedAt) < thirtyDaysAgo;
    }).length,
    needsAttention: vendors.filter(v =>
      v.status === 'expired' || v.status === 'non-compliant' || v.status === 'expiring'
    ).length
  };

  const saveEdit = async () => {
    setSavingVendor(true);
    try {
      const result = await updateVendor(editingVendor.id, editingVendor);
      if (result.success) {
        setEditingVendor(null);
        showAlert({
          type: 'success',
          title: 'Vendor Updated',
          message: 'The vendor information has been saved successfully.'
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update vendor.',
          details: result.error
        });
      }
    } finally {
      setSavingVendor(false);
    }
  };

  // Delete vendor
  const handleDelete = (vendor) => {
    setDeleteConfirm(vendor);
  };

  const confirmDelete = async () => {
    setDeletingVendor(true);
    const vendorName = deleteConfirm.name;
    try {
      const result = await deleteVendor(deleteConfirm.id);
      if (result.success) {
        setDeleteConfirm(null);
        if (selectedVendor?.id === deleteConfirm.id) {
          setSelectedVendor(null);
        }
        showAlert({
          type: 'success',
          title: 'Vendor Deleted',
          message: `"${vendorName}" has been permanently removed.`
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete vendor.',
          details: result.error
        });
      }
    } finally {
      setDeletingVendor(false);
    }
  };

  // Load vendor activity history
  const loadVendorActivity = async (vendorId) => {
    setLoadingActivity(true);
    try {
      const { data, error } = await supabase
        .from('vendor_activity')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setVendorActivity(data || []);
    } catch (err) {
      logger.error('Error loading activity', err);
      setVendorActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Handle selecting a vendor (load details and activity)
  const handleSelectVendor = async (vendor) => {
    setSelectedVendor(vendor);
    setVendorDetailsTab('details');
    loadVendorActivity(vendor.id);

    // Load COI preview URL
    if (vendor.rawData?.documentPath) {
      const url = await getCOIDocumentUrl(vendor.rawData.documentPath);
      setCoiPreviewUrl(url);
    } else {
      setCoiPreviewUrl(null);
    }
  };

  // Handle Request New COI
  const handleRequestCOI = (vendor) => {
    setRequestCOIVendor(vendor);
    setRequestCOIEmail(vendor.contactEmail || '');
  };

  const [sendingEmail, setSendingEmail] = useState(false);

  const sendCOIRequest = async () => {
    if (!requestCOIEmail) {
      showAlert({
        type: 'warning',
        title: 'Email Required',
        message: 'Please enter an email address to send the COI request.'
      });
      return;
    }

    if (!isValidEmail(requestCOIEmail)) {
      showAlert({
        type: 'warning',
        title: 'Invalid Email',
        message: 'Please enter a valid email address.'
      });
      return;
    }

    setSendingEmail(true);

    try {
      // Save the email to the vendor if it's new or updated
      if (requestCOIEmail !== requestCOIVendor.contactEmail) {
        const result = await updateVendor(requestCOIVendor.id, {
          ...requestCOIVendor,
          contactEmail: requestCOIEmail
        });
        if (!result.success) {
          showAlert({
            type: 'error',
            title: 'Save Failed',
            message: 'Failed to save contact email.',
            details: result.error
          });
          setSendingEmail(false);
          return;
        }
      }

      // Send email via Edge Function
      const companyName = userRequirements?.company_name || 'Our Company';
      const issues = (requestCOIVendor.issues || []).map(i => typeof i === 'string' ? i : i.message);

      // Generate upload token if vendor doesn't have one or if it's expired
      let uploadToken = requestCOIVendor.rawData?.uploadToken;
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // Token valid for 30 days

      if (!uploadToken) {
        uploadToken = crypto.randomUUID();
      }
      // Always update the token expiration when sending a COI request
      await supabase
        .from('vendors')
        .update({
          upload_token: uploadToken,
          upload_token_expires_at: tokenExpiresAt.toISOString()
        })
        .eq('id', requestCOIVendor.id);

      // Get the app URL (current origin)
      const appUrl = window.location.origin;

      // Get property requirements for this vendor
      const vendorProperty = properties.find(p => p.id === requestCOIVendor.propertyId);
      const requirements = {
        generalLiability: vendorProperty?.general_liability || userRequirements?.general_liability || 1000000,
        autoLiability: vendorProperty?.auto_liability_required ? (vendorProperty?.auto_liability || userRequirements?.auto_liability || 1000000) : null,
        workersComp: vendorProperty?.workers_comp_required || false,
        employersLiability: vendorProperty?.workers_comp_required ? (vendorProperty?.employers_liability || userRequirements?.employers_liability || 500000) : null,
        additionalInsured: vendorProperty?.require_additional_insured !== false,
        waiverOfSubrogation: vendorProperty?.require_waiver_of_subrogation || userRequirements?.require_waiver_of_subrogation || false,
      };

      const { data: result, error: fnError } = await supabase.functions.invoke('send-coi-request', {
        body: {
          to: requestCOIEmail,
          vendorName: requestCOIVendor.name,
          vendorStatus: requestCOIVendor.status,
          issues: issues,
          companyName: companyName,
          replyTo: user?.email,
          uploadToken: uploadToken,
          appUrl: appUrl,
          requirements: requirements,
          propertyName: vendorProperty?.name || null,
        },
      });

      // Log the activity
      await supabase.from('vendor_activity').insert({
        vendor_id: requestCOIVendor.id,
        user_id: user?.id,
        activity_type: 'email_sent',
        description: `COI request email sent to ${requestCOIEmail}`,
        metadata: { email: requestCOIEmail }
      });

      if (fnError) {
        logger.error('Edge Function error', fnError);
        // Try to get more details from the error
        const errorMsg = fnError.message || fnError.context?.body || JSON.stringify(fnError);
        throw new Error(errorMsg);
      }

      if (result && !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Update last contacted timestamp
      await updateVendor(requestCOIVendor.id, {
        ...requestCOIVendor,
        contactEmail: requestCOIEmail,
        lastContactedAt: new Date().toISOString()
      });

      showAlert({
        type: 'success',
        title: 'Email Sent',
        message: `COI request sent successfully to ${requestCOIEmail}`,
        details: 'The vendor will receive an email with instructions to upload their updated certificate.'
      });

      setRequestCOIVendor(null);
      setRequestCOIEmail('');
      refreshVendors();
    } catch (error) {
      logger.error('Failed to send email', error);
      showAlert({
        type: 'error',
        title: 'Email Failed',
        message: 'Failed to send the COI request email.',
        details: error.message
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Show bulk request confirmation modal
  const handleBulkRequest = (vendorsToContact) => {
    if (!vendorsToContact || vendorsToContact.length === 0) return;
    setBulkRequestConfirm(vendorsToContact);
  };

  // Execute bulk COI requests after confirmation
  const executeBulkRequest = async () => {
    const vendorsToContact = bulkRequestConfirm;
    if (!vendorsToContact || vendorsToContact.length === 0) return;

    setBulkRequestConfirm(null);
    setBulkRequesting(true);
    let successCount = 0;
    let failCount = 0;
    const companyName = userRequirements?.company_name || 'Our Company';
    const appUrl = window.location.origin;

    try {
      for (const vendor of vendorsToContact) {
        try {
          // Generate/refresh upload token
          const uploadToken = crypto.randomUUID();
          const tokenExpiresAt = new Date();
          tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);

          await supabase
            .from('vendors')
            .update({
              upload_token: uploadToken,
              upload_token_expires_at: tokenExpiresAt.toISOString()
            })
            .eq('id', vendor.id);

          // Send email with requirements
          const issues = (vendor.issues || []).map(i => typeof i === 'string' ? i : i.message);
          const vendorProperty = properties.find(p => p.id === vendor.propertyId);
          const requirements = {
            generalLiability: vendorProperty?.general_liability || userRequirements?.general_liability || 1000000,
            autoLiability: vendorProperty?.auto_liability_required ? (vendorProperty?.auto_liability || userRequirements?.auto_liability || 1000000) : null,
            workersComp: vendorProperty?.workers_comp_required || false,
            employersLiability: vendorProperty?.workers_comp_required ? (vendorProperty?.employers_liability || userRequirements?.employers_liability || 500000) : null,
            additionalInsured: vendorProperty?.require_additional_insured !== false,
            waiverOfSubrogation: vendorProperty?.require_waiver_of_subrogation || userRequirements?.require_waiver_of_subrogation || false,
          };

          const { data: result, error: fnError } = await supabase.functions.invoke('send-coi-request', {
            body: {
              to: vendor.contactEmail,
              vendorName: vendor.name,
              vendorStatus: vendor.status,
              issues: issues,
              companyName: companyName,
              replyTo: user?.email,
              uploadToken: uploadToken,
              appUrl: appUrl,
              requirements: requirements,
              propertyName: vendorProperty?.name || null,
            },
          });

          if (fnError || (result && !result.success)) {
            failCount++;
            continue;
          }

          // Log activity and update last contacted
          await supabase.from('vendor_activity').insert({
            vendor_id: vendor.id,
            user_id: user?.id,
            activity_type: 'email_sent',
            description: `COI request email sent to ${vendor.contactEmail} (bulk)`,
            metadata: { email: vendor.contactEmail, bulk: true }
          });

          await supabase
            .from('vendors')
            .update({ last_contacted_at: new Date().toISOString() })
            .eq('id', vendor.id);

          successCount++;
        } catch (err) {
          logger.error(`Failed to send to ${vendor.name}`, err);
          failCount++;
        }
      }

      refreshVendors();

      if (failCount === 0) {
        showAlert({
          type: 'success',
          title: 'All Emails Sent',
          message: `Successfully sent COI requests to ${successCount} vendors.`
        });
      } else {
        showAlert({
          type: 'warning',
          title: 'Partial Success',
          message: `Sent ${successCount} emails, ${failCount} failed.`,
          details: 'Check vendor email addresses and try again for failed vendors.'
        });
      }
    } catch (error) {
      logger.error('Bulk request error', error);
      showAlert({
        type: 'error',
        title: 'Bulk Request Failed',
        message: 'An error occurred while sending bulk requests.',
        details: error.message
      });
    } finally {
      setBulkRequesting(false);
    }
  };

  // Bulk property assignment
  const handleBulkPropertyAssign = async () => {
    if (selectedVendorIds.size === 0) return;

    setBulkAssigning(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const vendorId of selectedVendorIds) {
        try {
          const { error } = await supabase
            .from('vendors')
            .update({ property_id: bulkAssignPropertyId || null })
            .eq('id', vendorId);

          if (error) {
            failCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          failCount++;
        }
      }

      refreshVendors();
      setSelectedVendorIds(new Set());
      setShowBulkAssignModal(false);
      setBulkAssignPropertyId('');

      const propertyName = bulkAssignPropertyId
        ? properties.find(p => p.id === bulkAssignPropertyId)?.name || 'selected property'
        : 'No Property';

      if (failCount === 0) {
        showAlert({
          type: 'success',
          title: 'Vendors Assigned',
          message: `Successfully assigned ${successCount} vendors to ${propertyName}.`
        });
      } else {
        showAlert({
          type: 'warning',
          title: 'Partial Success',
          message: `Assigned ${successCount} vendors, ${failCount} failed.`
        });
      }
    } catch (error) {
      logger.error('Bulk property assignment error', error);
      showAlert({
        type: 'error',
        title: 'Assignment Failed',
        message: 'An error occurred while assigning properties.',
        details: error.message
      });
    } finally {
      setBulkAssigning(false);
    }
  };

  // Toggle vendor selection
  const toggleVendorSelection = (vendorId) => {
    setSelectedVendorIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vendorId)) {
        newSet.delete(vendorId);
      } else {
        newSet.add(vendorId);
      }
      return newSet;
    });
  };

  // Select/deselect all vendors
  const toggleSelectAll = () => {
    if (selectedVendorIds.size === filteredVendors.length) {
      setSelectedVendorIds(new Set());
    } else {
      setSelectedVendorIds(new Set(filteredVendors.map(v => v.id)));
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Company Name', 'DBA', 'Status', 'Expiration Date', 'Days Overdue', 'General Liability', 'Auto Liability', 'Workers Comp', 'Employers Liability', 'Issues'];

    // Helper to escape CSV fields (handle commas, quotes, newlines)
    const escapeCSV = (field) => {
      const str = String(field ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredVendors.map(v => [
      escapeCSV(v.name),
      escapeCSV(v.dba || ''),
      v.status.toUpperCase(),
      new Date(v.expirationDate).toLocaleDateString(),
      v.daysOverdue || 0,
      escapeCSV(formatCurrency(v.coverage.generalLiability.amount)),
      escapeCSV(formatCurrency(v.coverage.autoLiability.amount)),
      v.coverage.workersComp.amount,
      escapeCSV(formatCurrency(v.coverage.employersLiability.amount)),
      escapeCSV((v.issues || []).map(i => typeof i === 'string' ? i : i.message).join('; '))
    ]);

    const csvContent = [headers.map(escapeCSV), ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartcoi-vendor-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url); // Clean up
  };

  // Export to PDF
  const exportToPDF = () => {
    const result = exportPDFReport(filteredVendors, { email: user?.email });
    if (result && !result.success) {
      showAlert({
        type: 'warning',
        title: 'Popup Blocked',
        message: result.error,
        details: 'Please enable popups for this site in your browser settings and try again.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Background gradients - subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-teal-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo size="default" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">
                  {subscription?.plan ? `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan` : 'Free Plan'}
                </p>
              </div>
              {isFreePlan && (
                <button
                  onClick={onShowPricing}
                  className="px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-1.5 text-sm font-semibold"
                  title="Upgrade Plan"
                >
                  <CreditCard size={16} />
                  <span className="hidden sm:inline">Upgrade</span>
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 hover:text-gray-900 transition-all"
                title="Settings"
                data-onboarding="settings-button"
              >
                <SettingsIcon size={18} />
              </button>
              <button
                onClick={() => setShowNotifications(true)}
                className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 hover:text-gray-900 transition-all"
                title="Notifications"
                data-onboarding="notifications-button"
              >
                <Bell size={18} />
              </button>
              <button
                onClick={() => setShowActivityLog(true)}
                className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 hover:text-gray-900 transition-all"
                title="Activity Log"
              >
                <History size={18} />
              </button>
              <button
                onClick={() => setShowSmartUpload(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2 font-semibold"
                data-onboarding="upload-button"
              >
                <Upload size={18} />
                <span>Upload COI</span>
              </button>
              <button
                onClick={onSignOut}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="relative bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <nav className="flex space-x-1" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('vendors')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'vendors'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileCheck size={18} />
                Vendors
              </button>
              <button
                onClick={() => setActiveTab('tenants')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'tenants'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users size={18} />
                Tenants
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Dashboard Tab Content */}
      {activeTab === 'dashboard' && (
        <Dashboard
          vendors={vendors}
          tenants={dbTenants}
          properties={properties}
          selectedProperty={selectedProperty}
          onSelectProperty={setSelectedProperty}
          loadingProperties={loadingProperties}
          onViewVendors={() => setActiveTab('vendors')}
          onViewTenants={() => setActiveTab('tenants')}
          onSelectVendor={(vendor) => {
            setActiveTab('vendors');
            setSelectedVendor(vendor);
          }}
          onSelectTenant={(tenant) => {
            setActiveTab('tenants');
          }}
        />
      )}

      {/* Vendors Tab Content */}
      {activeTab === 'vendors' && (
        <>
        {/* Property Selector for Vendors */}
        <div className="mb-6 flex items-center justify-between">
          <PropertySelector
            properties={properties}
            selectedProperty={selectedProperty}
            onSelectProperty={setSelectedProperty}
            loading={loadingProperties}
          />
          {selectedProperty && (
            <p className="text-sm text-gray-500">
              Showing vendors for <span className="font-medium text-gray-700">{selectedProperty.name}</span>
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setQuickFilter('all')}
            className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${quickFilter === 'all' ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Vendors</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <FileText className="text-gray-500" size={24} />
              </div>
            </div>
          </button>

          <button
            onClick={() => setQuickFilter('expired')}
            className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${quickFilter === 'expired' ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Expired</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.expired}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="text-red-500" size={24} />
              </div>
            </div>
          </button>

          <button
            onClick={() => setQuickFilter('non-compliant')}
            className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${quickFilter === 'non-compliant' ? 'border-orange-500 ring-2 ring-orange-500' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Non-Compliant</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.nonCompliant}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="text-orange-500" size={24} />
              </div>
            </div>
          </button>

          <button
            onClick={() => setQuickFilter('compliant')}
            className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${quickFilter === 'compliant' ? 'border-emerald-500 ring-2 ring-emerald-500' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Compliant</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.compliant}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-emerald-500" size={24} />
              </div>
            </div>
          </button>
        </div>


        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6" data-onboarding="quick-filters">
          {/* Search and Sort Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 transition-all"
                />
              </div>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 font-medium text-gray-700"
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="expiration">Sort: Expiration Date</option>
              <option value="status">Sort: Status</option>
              <option value="last-contacted">Sort: Last Contacted</option>
            </select>

            {/* Issue Filter */}
            <select
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 font-medium text-gray-700"
            >
              <option value="all">All Vendors</option>
              <option value="needs-attention">⚠️ Needs Attention ({stats.needsAttention})</option>
              <option value="expired">🔴 Expired ({stats.expired})</option>
              <option value="expiring">🟡 Expiring Soon ({stats.expiring})</option>
              <option value="non-compliant">🟠 Non-Compliant ({stats.nonCompliant})</option>
              <option value="compliant">🟢 Compliant ({stats.compliant})</option>
              <option value="missing-additional-insured">📋 Missing Add'l Insured ({stats.missingAdditionalInsured})</option>
              <option value="not-contacted-30-days">📭 Not Contacted 30+ Days ({stats.notContactedRecently})</option>
            </select>

            {/* Export Buttons */}
            <button
              onClick={exportToPDF}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center space-x-2 text-sm font-semibold transition-all"
              title="Export PDF Report"
            >
              <FileDown size={16} />
              <span className="hidden sm:inline">Export PDF</span>
            </button>

            <button
              onClick={exportToCSV}
              className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center space-x-2 text-sm font-semibold transition-all"
              title="Export CSV"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Bulk Request COIs - only show if there are non-compliant vendors with emails */}
            {(() => {
              const needsAttention = filteredVendors.filter(v =>
                (v.status === 'expired' || v.status === 'non-compliant' || v.status === 'expiring') && v.contactEmail
              );
              if (needsAttention.length > 0) {
                return (
                  <button
                    onClick={() => handleBulkRequest(needsAttention)}
                    disabled={bulkRequesting}
                    className="px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 flex items-center space-x-2 text-sm font-semibold transition-all disabled:opacity-50"
                    title={`Send COI requests to ${needsAttention.length} vendors`}
                  >
                    {bulkRequesting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span className="hidden sm:inline">Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span className="hidden sm:inline">Request COIs ({needsAttention.length})</span>
                      </>
                    )}
                  </button>
                );
              }
              return null;
            })()}

            {/* Bulk Assign Property - show when vendors are selected */}
            {selectedVendorIds.size > 0 && properties.length > 0 && (
              <button
                onClick={() => setShowBulkAssignModal(true)}
                className="px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 flex items-center space-x-2 text-sm font-semibold transition-all"
                title={`Assign ${selectedVendorIds.size} vendors to a property`}
              >
                <Building2 size={16} />
                <span className="hidden sm:inline">Assign Property ({selectedVendorIds.size})</span>
              </button>
            )}

            {/* Clear */}
            {(searchQuery || quickFilter !== 'all' || sortBy !== 'name') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setQuickFilter('all');
                  setSortBy('name');
                }}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl font-medium transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>

          {filteredVendors.length > 0 && (
            <p className="text-sm text-gray-500 mt-4">
              Showing {filteredVendors.length} of {vendors.length} vendors
            </p>
          )}
        </div>

        {/* Vendors List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" data-onboarding="vendor-list">
          {/* Select All Header */}
          {filteredVendors.length > 0 && !loading && (
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedVendorIds.size === filteredVendors.length && filteredVendors.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {selectedVendorIds.size === filteredVendors.length && filteredVendors.length > 0
                    ? 'Deselect All'
                    : `Select All (${filteredVendors.length})`}
                </span>
              </label>
              {selectedVendorIds.size > 0 && (
                <span className="text-sm text-purple-600 font-medium">
                  {selectedVendorIds.size} selected
                </span>
              )}
            </div>
          )}
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
              <p className="text-gray-600">Loading vendors...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading vendors</h3>
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
            {filteredVendors.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery || quickFilter !== 'all'
                    ? 'No vendors found'
                    : 'Welcome to SmartCOI!'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || quickFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first vendor'}
                </p>
                {!searchQuery && quickFilter === 'all' && (
                  <div className="max-w-md mx-auto text-left bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                    <h4 className="font-semibold text-emerald-900 mb-3">Quick Start:</h4>
                    <ol className="space-y-2 text-sm text-emerald-800">
                      <li>1. Click <strong>"Settings"</strong> to customize your requirements</li>
                      <li>2. Click <strong>"Upload COI"</strong> to add your first certificate</li>
                      <li>3. Our AI will extract all the data automatically!</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              filteredVendors.map((vendor) => (
                <div key={vendor.id} className={`p-5 hover:bg-gray-50 transition-colors ${selectedVendorIds.has(vendor.id) ? 'bg-purple-50' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Checkbox for bulk selection */}
                      <div className="flex-shrink-0 pt-0.5">
                        <input
                          type="checkbox"
                          checked={selectedVendorIds.has(vendor.id)}
                          onChange={() => toggleVendorSelection(vendor.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                          title="Select for bulk actions"
                        />
                      </div>
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(vendor.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                          <h3 className="text-base font-semibold text-gray-900 truncate">{vendor.name}</h3>
                          {getStatusBadge(vendor.status, vendor.expirationDate)}
                        </div>
                        {vendor.dba && (
                          <p className="text-sm text-gray-500 mb-2 truncate">DBA: {vendor.dba}</p>
                        )}

                        {vendor.issues.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            {vendor.issues.map((issue, idx) => (
                              <div key={idx} className={`flex items-start space-x-2 text-sm ${
                                issue.type === 'critical' ? 'text-red-700' : 'text-orange-700'
                              }`}>
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <span className="break-words">{issue.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start space-x-2 sm:space-x-0 sm:space-y-2 sm:ml-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="flex items-center text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                        <Calendar size={14} className="mr-1.5" />
                        {formatDate(vendor.expirationDate)}
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleSelectVendor(vendor)}
                          className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                        >
                          Details
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleDelete(vendor)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                      <button
                        onClick={() => handleRequestCOI(vendor)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap flex items-center space-x-1.5 transition-all ${
                          vendor.status === 'expired' || vendor.status === 'non-compliant' || vendor.status === 'expiring'
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Send size={12} />
                        <span className="hidden sm:inline">Request COI</span>
                        <span className="sm:hidden">Request</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Load More Button */}
            {hasMore && filteredVendors.length > 0 && (
              <div className="p-4 text-center bg-gray-50">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold disabled:opacity-50 transition-all"
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                      <span>Loading...</span>
                    </span>
                  ) : (
                    `Load More (${vendors.length} of ${totalCount})`
                  )}
                </button>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Edit Modal */}
      {editingVendor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="edit-vendor-title">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 id="edit-vendor-title" className="text-xl font-bold text-gray-900">Edit Vendor</h3>
              <button onClick={() => setEditingVendor(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all" aria-label="Close edit vendor modal">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name</label>
                <input
                  type="text"
                  value={editingVendor.name}
                  onChange={(e) => setEditingVendor({...editingVendor, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">DBA</label>
                <input
                  type="text"
                  value={editingVendor.dba || ''}
                  onChange={(e) => setEditingVendor({...editingVendor, dba: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
                />
              </div>

              {/* Property Assignment - Multi-select */}
              {properties.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <Building2 size={14} className="inline mr-1.5 mb-0.5" />
                    Assigned Properties
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Select one or more properties</p>
                  <div className="border border-gray-200 rounded-xl bg-gray-50 max-h-40 overflow-y-auto">
                    {properties.map((property) => {
                      // Get property IDs - check both property_ids array and legacy propertyId
                      const currentPropertyIds = editingVendor.property_ids || editingVendor.propertyIds ||
                        (editingVendor.propertyId ? [editingVendor.propertyId] : []);
                      const isChecked = currentPropertyIds.includes(property.id);

                      return (
                        <label
                          key={property.id}
                          className="flex items-center px-4 py-2.5 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let newPropertyIds;
                              if (e.target.checked) {
                                newPropertyIds = [...currentPropertyIds, property.id];
                              } else {
                                newPropertyIds = currentPropertyIds.filter(id => id !== property.id);
                              }
                              setEditingVendor({
                                ...editingVendor,
                                propertyIds: newPropertyIds,
                                property_ids: newPropertyIds,
                                propertyId: newPropertyIds[0] || null
                              });
                            }}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="ml-3 text-sm text-gray-700">{property.name}</span>
                          {property.address && (
                            <span className="ml-2 text-xs text-gray-400">{property.address}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {(editingVendor.property_ids?.length === 0 && editingVendor.propertyIds?.length === 0 && !editingVendor.propertyId) && (
                    <p className="text-xs text-gray-400 mt-1 italic">No properties selected</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiration Date</label>
                <input
                  type="date"
                  value={editingVendor.expirationDate}
                  onChange={(e) => setEditingVendor({...editingVendor, expirationDate: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Contact Information</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={editingVendor.contactName || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, contactName: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 text-sm"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingVendor.contactEmail || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, contactEmail: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 text-sm"
                      placeholder="contact@vendor.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editingVendor.contactPhone || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, contactPhone: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 text-sm"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={editingVendor.contactNotes || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, contactNotes: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 text-sm"
                      placeholder="Additional contact notes..."
                      rows="2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={saveEdit}
                disabled={savingVendor}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingVendor ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingVendor(null)}
                disabled={savingVendor}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title" aria-describedby="delete-confirm-desc">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 id="delete-confirm-title" className="text-xl font-bold text-red-600">Confirm Delete</h3>
              <button onClick={() => setDeleteConfirm(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all" aria-label="Cancel deletion">
                <X size={20} />
              </button>
            </div>

            <p id="delete-confirm-desc" className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={confirmDelete}
                disabled={deletingVendor}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingVendor ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingVendor}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Request Confirmation Modal */}
      {bulkRequestConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="bulk-confirm-title" aria-describedby="bulk-confirm-desc">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 id="bulk-confirm-title" className="text-xl font-bold flex items-center space-x-2">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Send size={20} className="text-orange-600" />
                </div>
                <span>Bulk Request COIs</span>
              </h3>
              <button onClick={() => setBulkRequestConfirm(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all" aria-label="Cancel">
                <X size={20} />
              </button>
            </div>

            <p id="bulk-confirm-desc" className="text-gray-600 mb-4">
              Send COI requests to <strong>{bulkRequestConfirm.length}</strong> vendors?
            </p>

            <p className="text-sm text-gray-500 mb-6">
              This will email all vendors who need updated certificates and have an email address on file.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={executeBulkRequest}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-md font-semibold transition-all"
              >
                Send Requests
              </button>
              <button
                onClick={() => setBulkRequestConfirm(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request COI Modal */}
      {requestCOIVendor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Send size={20} className="text-orange-600" />
                </div>
                <span>Request New COI</span>
              </h3>
              <button onClick={() => { setRequestCOIVendor(null); setRequestCOIEmail(''); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-500">Vendor</p>
              <p className="font-semibold text-gray-900">{requestCOIVendor.name}</p>
              <div className="mt-2">
                {getStatusBadge(requestCOIVendor.status, requestCOIVendor.expirationDate)}
              </div>
            </div>

            {requestCOIVendor.issues.length > 0 && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-sm font-semibold text-orange-800 mb-2">Issues to address:</p>
                <ul className="space-y-1">
                  {requestCOIVendor.issues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-orange-700 flex items-start space-x-1">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vendor Contact Email
                {!requestCOIVendor.contactEmail && (
                  <span className="text-orange-500 ml-1">(required)</span>
                )}
              </label>
              <input
                type="email"
                value={requestCOIEmail}
                onChange={(e) => setRequestCOIEmail(e.target.value)}
                placeholder="vendor@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
              />
              {!requestCOIVendor.contactEmail && (
                <p className="text-xs text-gray-500 mt-1.5">
                  This email will be saved to the vendor's contact info
                </p>
              )}
            </div>

            {/* Email Preview */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <Eye size={14} className="text-blue-600" />
                <p className="text-sm font-semibold text-blue-800">Email Preview</p>
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Subject:</strong> Certificate of Insurance Request - {requestCOIVendor.name}</p>
                <p><strong>To:</strong> {requestCOIEmail || '(enter email above)'}</p>
                <div className="mt-2 p-2 bg-white/50 rounded-lg text-blue-600">
                  <p>The email will include:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Direct upload link (valid 30 days)</li>
                    <li>List of current compliance issues</li>
                    <li>Your company name as the requester</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={sendCOIRequest}
                disabled={!requestCOIEmail || sendingEmail}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {sendingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Email</span>
                  </>
                )}
              </button>
              <button
                onClick={() => { setRequestCOIVendor(null); setRequestCOIEmail(''); }}
                disabled={sendingEmail}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Email will be sent directly from SmartCOI
            </p>
          </div>
        </div>
      )}

      {/* Vendor Details Modal - Two Column Layout */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 lg:p-6">
          <div className="bg-white rounded-2xl w-full max-w-[95vw] lg:max-w-[85vw] xl:max-w-7xl h-[95vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedVendor.name}</h3>
                {selectedVendor.dba && <p className="text-gray-500 text-sm">DBA: {selectedVendor.dba}</p>}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingVendor({...selectedVendor});
                    setSelectedVendor(null);
                  }}
                  className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all"
                >
                  Edit
                </button>
                <button onClick={() => setSelectedVendor(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Two Column Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Column - COI Preview */}
              <div className="w-1/2 bg-gray-100 flex flex-col border-r border-gray-200">
                {selectedVendor.rawData?.documentPath && coiPreviewUrl ? (
                  <div className="flex-1 flex flex-col">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Certificate Preview</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewCOI(selectedVendor)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                        >
                          Open Full
                        </button>
                        <button
                          onClick={() => handleDownloadCOI(selectedVendor)}
                          className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 font-medium"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <iframe
                        src={`${coiPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="w-full h-full"
                        title="COI Preview"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-8">
                      <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 font-medium">No COI Document</p>
                      <p className="text-sm text-gray-400 mt-1">Upload a certificate to view it here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Details */}
              <div className="w-1/2 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex space-x-1 p-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                  <button
                    onClick={() => setVendorDetailsTab('details')}
                    className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      vendorDetailsTab === 'details'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText size={14} className="inline mr-1.5 mb-0.5" />
                    Details
                  </button>
                  <button
                    onClick={() => setVendorDetailsTab('history')}
                    className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      vendorDetailsTab === 'history'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <History size={14} className="inline mr-1.5 mb-0.5" />
                    History
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Details Tab Content */}
                  {vendorDetailsTab === 'details' && (
                    <div className="space-y-4">
                      {/* Status Grid */}
                      <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Status</p>
                          <div className="mt-1">{getStatusBadge(selectedVendor.status, selectedVendor.expirationDate)}</div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 font-medium">Expiration</p>
                          <p className="font-semibold text-gray-900 text-sm mt-1">{formatDate(selectedVendor.expirationDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium">Last Contacted</p>
                          <p className={`font-semibold text-sm mt-1 ${selectedVendor.lastContactedAt ? 'text-gray-900' : 'text-amber-600'}`}>
                            {selectedVendor.lastContactedAt ? formatRelativeDate(selectedVendor.lastContactedAt) : 'Never'}
                          </p>
                        </div>
                      </div>

                      {/* Assigned Properties - Read Only */}
                      {properties.length > 0 && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                          <div className="flex items-center space-x-2">
                            <Building2 size={16} className="text-gray-600" />
                            <h4 className="font-semibold text-gray-900 text-sm">Assigned Properties</h4>
                          </div>
                          <div className="mt-2">
                            {(() => {
                              // Get property IDs from multiple possible sources
                              const propertyIds = selectedVendor.property_ids || selectedVendor.propertyIds ||
                                (selectedVendor.propertyId ? [selectedVendor.propertyId] : []);

                              if (propertyIds.length === 0) {
                                return <span className="text-sm text-gray-400 italic">Not assigned to any property</span>;
                              }

                              return (
                                <div className="flex flex-wrap gap-1.5">
                                  {propertyIds.map(propId => {
                                    const prop = properties.find(p => p.id === propId);
                                    return prop ? (
                                      <span
                                        key={propId}
                                        className="inline-flex items-center px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                                      >
                                        {prop.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Coverage Details */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm mb-2">Coverage Details</h4>
                        <div className="space-y-1.5">
                          {[
                            { key: 'generalLiability', label: 'General Liability', coverage: selectedVendor.coverage.generalLiability },
                            { key: 'autoLiability', label: 'Auto Liability', coverage: selectedVendor.coverage.autoLiability },
                            { key: 'workersComp', label: 'Workers Compensation', coverage: selectedVendor.coverage.workersComp },
                            { key: 'employersLiability', label: 'Employers Liability', coverage: selectedVendor.coverage.employersLiability },
                          ].map(({ key, label, coverage }) => {
                            const amount = coverage?.amount;
                            const isExpired = coverage?.expired;
                            const isExpiringSoon = coverage?.expiringSoon;
                            const hasAmount = amount && amount !== 'N/A' && amount !== 0;

                            let statusIcon, statusColor, statusBg, statusText;
                            if (!hasAmount) {
                              statusIcon = <XCircle size={14} className="text-gray-400" />;
                              statusColor = 'text-gray-400';
                              statusBg = 'bg-gray-50';
                              statusText = 'Not provided';
                            } else if (isExpired) {
                              statusIcon = <XCircle size={14} className="text-red-600" />;
                              statusColor = 'text-red-600';
                              statusBg = 'bg-red-50';
                              statusText = 'Expired';
                            } else if (isExpiringSoon) {
                              statusIcon = <AlertCircle size={14} className="text-amber-600" />;
                              statusColor = 'text-amber-600';
                              statusBg = 'bg-amber-50';
                              statusText = 'Expiring Soon';
                            } else {
                              statusIcon = <CheckCircle size={14} className="text-emerald-600" />;
                              statusColor = 'text-emerald-600';
                              statusBg = 'bg-emerald-50';
                              statusText = 'Compliant';
                            }

                            return (
                              <div key={key} className={`flex items-center justify-between p-2.5 rounded-lg ${statusBg}`}>
                                <div className="flex items-center space-x-2">
                                  {statusIcon}
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{label}</p>
                                    <p className={`text-xs ${statusColor}`}>{statusText}</p>
                                  </div>
                                </div>
                                <p className="font-semibold text-gray-900 text-sm">
                                  {key === 'workersComp' ? (amount || 'N/A') : formatCurrency(amount)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Additional Insured Status */}
                      {selectedVendor.additionalInsured && (
                        <div className={`p-3 rounded-xl border ${
                          selectedVendor.hasAdditionalInsured
                            ? 'bg-emerald-50 border-emerald-200'
                            : selectedVendor.missingAdditionalInsured
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-start space-x-2">
                            {selectedVendor.hasAdditionalInsured && (
                              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                            )}
                            {selectedVendor.missingAdditionalInsured && (
                              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">Additional Insured</p>
                              <p className={`text-sm mt-1 ${
                                selectedVendor.hasAdditionalInsured ? 'text-emerald-700' :
                                selectedVendor.missingAdditionalInsured ? 'text-red-700' : 'text-gray-600'
                              }`}>
                                {selectedVendor.additionalInsured}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Issues */}
                      {selectedVendor.issues.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                          <h4 className="font-bold text-red-900 text-sm mb-2">Issues</h4>
                          <div className="space-y-1.5">
                            {selectedVendor.issues.map((issue, idx) => (
                              <div key={idx} className={`flex items-start space-x-2 text-sm ${
                                issue.type === 'critical' ? 'text-red-700' : 'text-orange-700'
                              }`}>
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <span>{issue.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact Information */}
                      {(selectedVendor.contactName || selectedVendor.contactEmail || selectedVendor.contactPhone) && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                          <h4 className="font-bold text-gray-900 text-sm mb-2">Contact Information</h4>
                          <div className="space-y-1.5">
                            {selectedVendor.contactName && (
                              <div className="flex items-center space-x-2 text-sm">
                                <User size={14} className="text-gray-500" />
                                <span className="text-gray-700">{selectedVendor.contactName}</span>
                              </div>
                            )}
                            {selectedVendor.contactEmail && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Mail size={14} className="text-gray-500" />
                                <span className="text-gray-700">{selectedVendor.contactEmail}</span>
                              </div>
                            )}
                            {selectedVendor.contactPhone && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Phone size={14} className="text-gray-500" />
                                <span className="text-gray-700">{selectedVendor.contactPhone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* History Tab Content */}
                  {vendorDetailsTab === 'history' && (
                    <div className="space-y-3">
                      {loadingActivity ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                          <p className="text-gray-500 mt-2">Loading history...</p>
                        </div>
                      ) : vendorActivity.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                          <Clock size={40} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-500 font-medium">No activity recorded yet</p>
                          <p className="text-sm text-gray-400 mt-1">Activity will appear here when emails are sent or COIs are uploaded</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {vendorActivity.map((activity) => {
                            const actionType = activity.action || activity.activity_type;
                            const description = activity.details?.reason || activity.details?.description || activity.description || '';
                            return (
                              <div
                                key={activity.id}
                                className={`p-3 rounded-xl border ${
                                  actionType === 'coi_uploaded'
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : actionType === 'email_sent' || actionType === 'auto_follow_up_sent'
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-start space-x-3">
                                  <div className={`p-2 rounded-lg ${
                                    actionType === 'coi_uploaded'
                                      ? 'bg-emerald-100'
                                      : actionType === 'email_sent' || actionType === 'auto_follow_up_sent'
                                      ? 'bg-blue-100'
                                      : 'bg-gray-100'
                                  }`}>
                                    {actionType === 'coi_uploaded' ? (
                                      <Upload size={14} className="text-emerald-600" />
                                    ) : actionType === 'email_sent' || actionType === 'auto_follow_up_sent' ? (
                                      <Mail size={14} className="text-blue-600" />
                                    ) : (
                                      <Clock size={14} className="text-gray-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm">
                                      {actionType === 'coi_uploaded'
                                        ? 'COI Uploaded'
                                        : actionType === 'email_sent'
                                        ? 'Request Email Sent'
                                        : actionType === 'auto_follow_up_sent'
                                        ? 'Auto Follow-Up Sent'
                                        : actionType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Activity'}
                                    </p>
                                    {description && <p className="text-sm text-gray-600 mt-0.5">{description}</p>}
                                    {activity.details?.email && (
                                      <p className="text-xs text-gray-500 mt-0.5">To: {activity.details.email}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(activity.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-4 mt-4 border-t border-gray-200">
                    {(selectedVendor.status === 'expired' || selectedVendor.status === 'non-compliant' || selectedVendor.status === 'expiring') && (
                      <button
                        onClick={() => {
                          const vendor = selectedVendor;
                          setSelectedVendor(null);
                          handleRequestCOI(vendor);
                        }}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center justify-center space-x-2 transition-all text-sm"
                      >
                        <Send size={14} />
                        <span>Request New COI</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedVendor(null)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-all text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Tenants Tab Content */}
      {activeTab === 'tenants' && (
        <TenantsView
          properties={properties}
          userRequirements={userRequirements}
          selectedProperty={selectedProperty}
          onSelectProperty={setSelectedProperty}
          loadingProperties={loadingProperties}
        />
      )}
      </div>

      {/* Upload Modal */}
      <SmartUploadModal
        isOpen={showSmartUpload}
        onClose={() => setShowSmartUpload(false)}
        onUploadComplete={(result) => {
          setShowSmartUpload(false);
          if (result.type === 'vendor') {
            refreshVendors();
          } else {
            refreshTenants();
          }
        }}
        properties={properties}
        selectedProperty={selectedProperty}
        userRequirements={userRequirements}
      />

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onManageProperties={() => {
            setShowSettings(false);
            setShowProperties(true);
          }}
          propertyCount={properties.length}
        />
      )}

      {/* Notification Settings Modal */}
      {showNotifications && (
        <NotificationSettings onClose={() => setShowNotifications(false)} />
      )}

      {/* Activity Log Modal */}
      <ActivityLog
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
      />

      {/* Properties Modal */}
      {showProperties && (
        <Properties
          isOpen={showProperties}
          onClose={() => {
            setShowProperties(false);
            loadProperties(); // Refresh properties list when closing
          }}
          onPropertyChange={loadProperties}
        />
      )}


      {/* Onboarding Tutorial */}
      {onboardingChecked && showOnboarding && (
        <OnboardingTutorial
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Bulk Property Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                <Building2 size={24} className="text-purple-600" />
                <span>Assign Property</span>
              </h3>
              <button
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setBulkAssignPropertyId('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-sm text-purple-800">
                <strong>{selectedVendorIds.size}</strong> vendor{selectedVendorIds.size !== 1 ? 's' : ''} selected
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assign to Property
              </label>
              <select
                value={bulkAssignPropertyId}
                onChange={(e) => setBulkAssignPropertyId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
              >
                <option value="">No Property (Unassign)</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}{property.address ? ` - ${property.address}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {bulkAssignPropertyId
                  ? 'Selected vendors will use this property\'s insurance requirements'
                  : 'Selected vendors will be unassigned from any property'}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBulkPropertyAssign}
                disabled={bulkAssigning}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
              >
                {bulkAssigning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <Building2 size={16} />
                    <span>Assign Property</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setBulkAssignPropertyId('');
                }}
                disabled={bulkAssigning}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal {...alertModal} onClose={hideAlert} />
    </div>
  );
}

export default ComplyApp;
