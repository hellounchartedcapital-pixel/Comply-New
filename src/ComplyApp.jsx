import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Calendar, X, Search, Download, Settings as SettingsIcon, Eye, Bell, FileDown, Phone, Mail, User, Send, Clock, History, FileCheck, Sparkles, Building2, ChevronDown } from 'lucide-react';
import { useVendors } from './useVendors';
import { UploadModal } from './UploadModal';
import { Settings } from './Settings';
import { NotificationSettings } from './NotificationSettings';
import { OnboardingTutorial } from './OnboardingTutorial';
import { AlertModal, useAlertModal } from './AlertModal';
import { supabase } from './supabaseClient';
import { extractCOIFromPDF } from './extractCOI';
import { exportPDFReport } from './exportPDFReport';
import { Logo } from './Logo';
import Properties from './Properties';

function ComplyApp({ user, onSignOut }) {
  // Properties state
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showProperties, setShowProperties] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);

  // Use database hook instead of local state - filter by selected property
  const { vendors: dbVendors, loading, loadingMore, error, hasMore, totalCount, addVendor, updateVendor, deleteVendor, loadMore, refreshVendors } = useVendors(selectedProperty?.id);

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
    rawData: v.raw_data
  }));

  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all'); // Quick filter for button interface
  const [sortBy, setSortBy] = useState('name');
  const [editingVendor, setEditingVendor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [userRequirements, setUserRequirements] = useState(null);
  const [requestCOIVendor, setRequestCOIVendor] = useState(null);
  const [requestCOIEmail, setRequestCOIEmail] = useState('');
  const [vendorDetailsTab, setVendorDetailsTab] = useState('details');
  const [vendorActivity, setVendorActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [uploadingCOI, setUploadingCOI] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const { alertModal, showAlert, hideAlert } = useAlertModal();

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
        console.error('Error loading properties:', error);
        return;
      }

      setProperties(data || []);
      // If no property is selected and we have properties, select the first one
      // Or if "All Properties" mode (selectedProperty = null), keep it
    } catch (err) {
      console.error('Error loading properties:', err);
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
        console.error('Error loading requirements:', error);
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
                console.error('Failed to parse coverage:', e);
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
      console.error('Error loading user requirements:', err);
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
        console.error('Error checking onboarding status:', error);
        setOnboardingChecked(true);
        return;
      }

      // If no settings exist or onboarding not completed, show onboarding
      if (!data || !data.onboarding_completed) {
        setShowOnboarding(true);
      }

      setOnboardingChecked(true);
    } catch (err) {
      console.error('Error checking onboarding status:', err);
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
        console.error('Error saving onboarding status:', error);
      }

      setShowOnboarding(false);
    } catch (err) {
      console.error('Error completing onboarding:', err);
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

  const getStatusBadge = (status, daysOverdue) => {
    const styles = {
      expired: 'bg-red-100 text-red-700 border border-red-200',
      'non-compliant': 'bg-orange-100 text-orange-700 border border-orange-200',
      expiring: 'bg-amber-100 text-amber-700 border border-amber-200',
      compliant: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    };

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {status === 'expired' && daysOverdue > 0
          ? `Expired (${daysOverdue} days)`
          : status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  // Format date string (YYYY-MM-DD) to local date without timezone issues
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Parse as local date to avoid timezone shifting
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (typeof amount === 'string') return amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

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
      console.error('Error downloading COI:', err);
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
      }
      return 0;
    });

    return filtered;
  };

  const filteredVendors = filterAndSort(vendors);

  // Stats
  const stats = {
    total: vendors.length,
    expired: vendors.filter(v => v.status === 'expired').length,
    expiring: vendors.filter(v => v.status === 'expiring').length,
    nonCompliant: vendors.filter(v => v.status === 'non-compliant').length,
    compliant: vendors.filter(v => v.status === 'compliant').length
  };

  // Edit vendor
  const handleEdit = (vendor) => {
    setEditingVendor({...vendor});
  };

  const saveEdit = async () => {
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
  };

  // Delete vendor
  const handleDelete = (vendor) => {
    setDeleteConfirm(vendor);
  };

  const confirmDelete = async () => {
    const vendorName = deleteConfirm.name;
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
      console.error('Error loading activity:', err);
      setVendorActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Handle selecting a vendor (load details and activity)
  const handleSelectVendor = (vendor) => {
    setSelectedVendor(vendor);
    setVendorDetailsTab('details');
    loadVendorActivity(vendor.id);
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
      const issues = requestCOIVendor.issues.map(i => i.message);

      // Generate upload token if vendor doesn't have one
      let uploadToken = requestCOIVendor.rawData?.uploadToken;
      if (!uploadToken) {
        uploadToken = crypto.randomUUID();
        // Save the upload token to the vendor
        await supabase
          .from('vendors')
          .update({ upload_token: uploadToken })
          .eq('id', requestCOIVendor.id);
      }

      // Get the app URL (current origin)
      const appUrl = window.location.origin;

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
        console.error('Edge Function error:', fnError);
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
      console.error('Failed to send email:', error);
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

  // Handle file upload with AI extraction
  const handleFileUpload = async (file, progressCallback, vendorEmail = null) => {
    try {
      // Show full-screen loading overlay
      setUploadingCOI(true);
      setUploadStatus('Reading PDF...');
      setShowUploadModal(false); // Close the upload modal

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine which requirements to use (property-specific or global)
      const requirementsToUse = selectedProperty ? {
        general_liability: selectedProperty.general_liability || 1000000,
        gl_aggregate: selectedProperty.gl_aggregate || 2000000,
        auto_liability: selectedProperty.auto_liability || 1000000,
        auto_liability_required: selectedProperty.auto_liability_required || false,
        workers_comp: selectedProperty.workers_comp_required ? 'Statutory' : 'Not Required',
        employers_liability: selectedProperty.employers_liability || 500000,
        company_name: selectedProperty.company_name || userRequirements?.company_name || '',
        require_additional_insured: selectedProperty.require_additional_insured !== false,
        require_waiver_of_subrogation: selectedProperty.require_waiver_of_subrogation || false,
        custom_coverages: selectedProperty.custom_coverages || []
      } : userRequirements;

      // Step 1: Extract data using AI
      setUploadStatus('AI analyzing certificate...');
      if (progressCallback) progressCallback('AI extracting data...');
      console.log('Extracting COI data with AI...');
      const extractionResult = await extractCOIFromPDF(file, requirementsToUse);

      if (!extractionResult.success) {
        throw new Error(extractionResult.error);
      }

      const vendorData = extractionResult.data;
      console.log('Extracted vendor data:', vendorData);

      // Step 2: Upload file to Storage
      setUploadStatus('Uploading document...');
      if (progressCallback) progressCallback('Uploading to cloud...');
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('coi-documents')
        .upload(fileName, file);

      if (storageError) throw storageError;

      // Generate upload token for vendor portal
      const uploadToken = crypto.randomUUID();

      // Step 3: Create vendor in database
      setUploadStatus('Checking compliance...');
      if (progressCallback) progressCallback('Saving vendor...');
      const result = await addVendor({
        ...vendorData,
        propertyId: selectedProperty?.id || null, // Assign to selected property
        contactEmail: vendorEmail, // Add vendor email for automated follow-ups
        rawData: {
          ...vendorData.rawData,
          documentPath: fileName,
          documentUrl: storageData.path,
          uploadToken: uploadToken // Store upload token for vendor portal
        }
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Step 4: Refresh vendor list
      setUploadStatus('Finalizing...');
      if (progressCallback) progressCallback('Complete!');
      await refreshVendors();

      // Hide overlay
      setUploadingCOI(false);
      setUploadStatus('');

      // Success message with email info
      const emailNote = vendorEmail
        ? `\nContact Email: ${vendorEmail}\nAutomatic follow-ups enabled.`
        : '\nTip: Add a contact email to enable automatic follow-ups.';

      showAlert({
        type: 'success',
        title: 'COI Uploaded Successfully',
        message: `Vendor "${vendorData.name}" has been added to your dashboard.`,
        details: `Status: ${vendorData.status.toUpperCase()}\nExpiration Date: ${vendorData.expirationDate}${emailNote}`
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadingCOI(false);
      setUploadStatus('');
      throw new Error(error.message || 'Failed to upload and process COI');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Company Name', 'DBA', 'Status', 'Expiration Date', 'Days Overdue', 'General Liability', 'Auto Liability', 'Workers Comp', 'Employers Liability', 'Issues'];

    const rows = filteredVendors.map(v => [
      v.name,
      v.dba || '',
      v.status.toUpperCase(),
      new Date(v.expirationDate).toLocaleDateString(),
      v.daysOverdue || 0,
      formatCurrency(v.coverage.generalLiability.amount),
      formatCurrency(v.coverage.autoLiability.amount),
      v.coverage.workersComp.amount,
      formatCurrency(v.coverage.employersLiability.amount),
      v.issues.map(i => i.message).join('; ')
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartcoi-vendor-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
              {/* Property Selector */}
              {properties.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-sm font-medium text-gray-700"
                  >
                    <Building2 size={16} className="text-gray-500" />
                    <span className="max-w-[150px] truncate">
                      {selectedProperty ? selectedProperty.name : 'All Properties'}
                    </span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${showPropertyDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showPropertyDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowPropertyDropdown(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              setSelectedProperty(null);
                              setShowPropertyDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              !selectedProperty
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            All Properties
                          </button>
                          {properties.map((property) => (
                            <button
                              key={property.id}
                              onClick={() => {
                                setSelectedProperty(property);
                                setShowPropertyDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedProperty?.id === property.id
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <div className="truncate">{property.name}</div>
                              {property.address && (
                                <div className="text-xs text-gray-500 truncate">{property.address}</div>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 p-2">
                          <button
                            onClick={() => {
                              setShowPropertyDropdown(false);
                              setShowProperties(true);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center space-x-2"
                          >
                            <SettingsIcon size={14} />
                            <span>Manage Properties</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {properties.length === 0 && !loadingProperties && (
                <button
                  onClick={() => setShowProperties(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all text-sm font-medium text-emerald-700"
                >
                  <Building2 size={16} />
                  <span>Add Property</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">Signed in</p>
              </div>
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
                onClick={() => setShowUploadModal(true)}
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

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Section - Pie Chart & Upcoming Expirations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Compliance Overview</h3>
            <div className="flex items-center justify-center">
              <div className="relative">
                {/* SVG Pie Chart */}
                <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                  {stats.total === 0 ? (
                    <circle cx="90" cy="90" r="70" fill="none" stroke="#e5e7eb" strokeWidth="24" />
                  ) : (
                    <>
                      {/* Compliant slice (green) */}
                      <circle
                        cx="90" cy="90" r="70"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="24"
                        strokeDasharray={`${(stats.compliant / stats.total) * 439.82} 439.82`}
                        strokeDashoffset="0"
                      />
                      {/* Non-compliant slice (orange) */}
                      <circle
                        cx="90" cy="90" r="70"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="24"
                        strokeDasharray={`${(stats.nonCompliant / stats.total) * 439.82} 439.82`}
                        strokeDashoffset={`${-(stats.compliant / stats.total) * 439.82}`}
                      />
                      {/* Expired slice (red) */}
                      <circle
                        cx="90" cy="90" r="70"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="24"
                        strokeDasharray={`${(stats.expired / stats.total) * 439.82} 439.82`}
                        strokeDashoffset={`${-((stats.compliant + stats.nonCompliant) / stats.total) * 439.82}`}
                      />
                      {/* Expiring slice (amber) */}
                      <circle
                        cx="90" cy="90" r="70"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="24"
                        strokeDasharray={`${(stats.expiring / stats.total) * 439.82} 439.82`}
                        strokeDashoffset={`${-((stats.compliant + stats.nonCompliant + stats.expired) / stats.total) * 439.82}`}
                      />
                    </>
                  )}
                </svg>
                {/* Center text - Compliance Percentage */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {stats.total === 0 ? (
                    <>
                      <span className="text-3xl font-bold text-gray-400">0%</span>
                      <span className="text-xs text-gray-500 font-medium">Compliant</span>
                    </>
                  ) : (
                    <>
                      <span className={`text-3xl font-bold ${
                        Math.round((stats.compliant / stats.total) * 100) >= 80
                          ? 'text-emerald-600'
                          : Math.round((stats.compliant / stats.total) * 100) >= 50
                            ? 'text-amber-500'
                            : 'text-red-500'
                      }`}>
                        {Math.round((stats.compliant / stats.total) * 100)}%
                      </span>
                      <span className="text-xs text-gray-500 font-medium">Compliant</span>
                    </>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="ml-8 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{stats.compliant} Compliant</p>
                    <p className="text-xs text-gray-500">{stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0}%</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{stats.nonCompliant} Non-Compliant</p>
                    <p className="text-xs text-gray-500">{stats.total > 0 ? Math.round((stats.nonCompliant / stats.total) * 100) : 0}%</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{stats.expired} Expired</p>
                    <p className="text-xs text-gray-500">{stats.total > 0 ? Math.round((stats.expired / stats.total) * 100) : 0}%</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{stats.expiring} Expiring Soon</p>
                    <p className="text-xs text-gray-500">{stats.total > 0 ? Math.round((stats.expiring / stats.total) * 100) : 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Expirations Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Upcoming Expirations</h3>
              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">Next 30 Days</span>
            </div>
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {vendors
                .filter(v => {
                  const today = new Date();
                  const expDate = new Date(v.expirationDate);
                  const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
                  return daysUntil >= 0 && daysUntil <= 30;
                })
                .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))
                .slice(0, 5)
                .map((vendor) => {
                  const today = new Date();
                  const expDate = new Date(vendor.expirationDate);
                  const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={vendor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${daysUntil <= 7 ? 'bg-red-500' : daysUntil <= 14 ? 'bg-amber-500' : 'bg-yellow-400'}`}></div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">{vendor.name}</p>
                          <p className="text-xs text-gray-500">{formatDate(vendor.expirationDate)}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        daysUntil <= 7 ? 'bg-red-100 text-red-700' :
                        daysUntil <= 14 ? 'bg-amber-100 text-amber-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? '1 day' : `${daysUntil} days`}
                      </span>
                    </div>
                  );
                })}
              {vendors.filter(v => {
                const today = new Date();
                const expDate = new Date(v.expirationDate);
                const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
                return daysUntil >= 0 && daysUntil <= 30;
              }).length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
                  <p className="text-sm text-gray-500 font-medium">No expirations in the next 30 days</p>
                </div>
              )}
            </div>
          </div>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
                <div key={vendor.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(vendor.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                          <h3 className="text-base font-semibold text-gray-900 truncate">{vendor.name}</h3>
                          {getStatusBadge(vendor.status, vendor.daysOverdue)}
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

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                          <div className="bg-gray-100 px-2 py-1 rounded-lg">
                            <span className="font-medium">GL:</span> {formatCurrency(vendor.coverage.generalLiability.amount)}
                          </div>
                          <div className="bg-gray-100 px-2 py-1 rounded-lg">
                            <span className="font-medium">Auto:</span> {formatCurrency(vendor.coverage.autoLiability.amount)}
                          </div>
                          <div className="bg-gray-100 px-2 py-1 rounded-lg">
                            <span className="font-medium">WC:</span> {vendor.coverage.workersComp.amount}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start space-x-2 sm:space-x-0 sm:space-y-2 sm:ml-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="flex items-center text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                        <Calendar size={14} className="mr-1.5" />
                        {formatDate(vendor.expirationDate)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
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
                        onClick={() => handleSelectVendor(vendor)}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold whitespace-nowrap"
                      >
                        View Details
                      </button>
                      {(vendor.status === 'expired' || vendor.status === 'non-compliant' || vendor.status === 'expiring') && (
                        <button
                          onClick={() => handleRequestCOI(vendor)}
                          className="text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg hover:shadow-md font-semibold whitespace-nowrap flex items-center space-x-1.5 transition-all"
                        >
                          <Send size={12} />
                          <span className="hidden sm:inline">Request COI</span>
                          <span className="sm:hidden">Request</span>
                        </button>
                      )}
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
      </div>

      {/* Edit Modal */}
      {editingVendor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Edit Vendor</h3>
              <button onClick={() => setEditingVendor(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
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
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 font-semibold transition-all"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingVendor(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-600">Confirm Delete</h3>
              <button onClick={() => setDeleteConfirm(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-all"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
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
                {getStatusBadge(requestCOIVendor.status, requestCOIVendor.daysOverdue)}
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

            <div className="mb-6">
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

      {/* Vendor Details Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedVendor.name}</h3>
                {selectedVendor.dba && <p className="text-gray-500">DBA: {selectedVendor.dba}</p>}
              </div>
              <button onClick={() => setSelectedVendor(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setVendorDetailsTab('details')}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  vendorDetailsTab === 'details'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText size={16} className="inline mr-2 mb-0.5" />
                Details
              </button>
              <button
                onClick={() => setVendorDetailsTab('history')}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  vendorDetailsTab === 'history'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <History size={16} className="inline mr-2 mb-0.5" />
                History
              </button>
            </div>

            {/* Details Tab Content */}
            {vendorDetailsTab === 'details' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedVendor.status, selectedVendor.daysOverdue)}</div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">Expiration</p>
                  <p className="font-semibold text-gray-900 mt-1">{formatDate(selectedVendor.expirationDate)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-3">Standard Coverage</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium">General Liability</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(selectedVendor.coverage.generalLiability.amount)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium">Auto Liability</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(selectedVendor.coverage.autoLiability.amount)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium">Workers Comp</p>
                    <p className="font-semibold text-gray-900">{selectedVendor.coverage.workersComp.amount}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium">Employers Liability</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(selectedVendor.coverage.employersLiability.amount)}</p>
                  </div>
                </div>
              </div>

              {/* Additional Insured Status */}
              {selectedVendor.additionalInsured && (
                <div className={`p-4 rounded-xl border ${
                  selectedVendor.hasAdditionalInsured
                    ? 'bg-emerald-50 border-emerald-200'
                    : selectedVendor.missingAdditionalInsured
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start space-x-2">
                    {selectedVendor.hasAdditionalInsured && (
                      <CheckCircle size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    )}
                    {selectedVendor.missingAdditionalInsured && (
                      <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
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

              {selectedVendor.issues.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <h4 className="font-bold text-red-900 mb-2">Issues</h4>
                  <div className="space-y-2">
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
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <h4 className="font-bold text-blue-900 mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    {selectedVendor.contactName && (
                      <div className="flex items-center space-x-2 text-sm">
                        <User size={14} className="text-blue-600" />
                        <span className="text-gray-700">{selectedVendor.contactName}</span>
                      </div>
                    )}
                    {selectedVendor.contactEmail && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail size={14} className="text-blue-600" />
                        <span className="text-gray-700">{selectedVendor.contactEmail}</span>
                      </div>
                    )}
                    {selectedVendor.contactPhone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone size={14} className="text-blue-600" />
                        <span className="text-gray-700">{selectedVendor.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COI Document Actions */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Certificate of Insurance</h4>
                {selectedVendor.rawData?.documentPath ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleViewCOI(selectedVendor)}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold flex items-center justify-center space-x-2 transition-all"
                    >
                      <Eye size={18} />
                      <span>View COI</span>
                    </button>
                    <button
                      onClick={() => handleDownloadCOI(selectedVendor)}
                      className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold flex items-center justify-center space-x-2 transition-all"
                    >
                      <Download size={18} />
                      <span>Download COI</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-600 flex items-center">
                      <FileText className="mr-2" size={16} />
                      No document uploaded for this vendor
                    </p>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* History Tab Content */}
            {vendorDetailsTab === 'history' && (
              <div className="space-y-4">
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
                  <div className="space-y-3">
                    {vendorActivity.map((activity) => {
                      const actionType = activity.action || activity.activity_type;
                      const description = activity.details?.reason || activity.details?.description || activity.description || '';
                      return (
                      <div
                        key={activity.id}
                        className={`p-4 rounded-xl border ${
                          actionType === 'coi_uploaded'
                            ? 'bg-emerald-50 border-emerald-200'
                            : actionType === 'email_sent' || actionType === 'auto_follow_up_sent'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-xl ${
                            actionType === 'coi_uploaded'
                              ? 'bg-emerald-100'
                              : actionType === 'email_sent' || actionType === 'auto_follow_up_sent'
                              ? 'bg-blue-100'
                              : 'bg-gray-100'
                          }`}>
                            {actionType === 'coi_uploaded' ? (
                              <Upload size={16} className="text-emerald-600" />
                            ) : actionType === 'email_sent' || actionType === 'auto_follow_up_sent' ? (
                              <Mail size={16} className="text-blue-600" />
                            ) : (
                              <Clock size={16} className="text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {actionType === 'coi_uploaded'
                                ? 'COI Uploaded'
                                : actionType === 'email_sent'
                                ? 'Request Email Sent'
                                : actionType === 'auto_follow_up_sent'
                                ? 'Auto Follow-Up Sent'
                                : actionType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Activity'}
                            </p>
                            {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
                            {activity.details?.email && (
                              <p className="text-sm text-gray-500 mt-1">To: {activity.details.email}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(activity.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {(selectedVendor.status === 'expired' || selectedVendor.status === 'non-compliant' || selectedVendor.status === 'expiring') && (
                <button
                  onClick={() => {
                    setSelectedVendor(null);
                    handleRequestCOI(selectedVendor);
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center justify-center space-x-2 transition-all"
                >
                  <Send size={16} />
                  <span>Request New COI</span>
                </button>
              )}
              <button
                onClick={() => setSelectedVendor(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleFileUpload}
      />

      {/* Settings Modal */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {/* Notification Settings Modal */}
      {showNotifications && (
        <NotificationSettings onClose={() => setShowNotifications(false)} />
      )}

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

      {/* COI Upload Loading Overlay */}
      {uploadingCOI && (
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/95 via-gray-900/95 to-teal-900/95 flex items-center justify-center z-[60]">
          <div className="text-center max-w-md px-6">
            <div className="relative mb-8">
              <div className="absolute inset-0 w-24 h-24 mx-auto bg-emerald-500/30 rounded-full animate-ping"></div>
              <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <Sparkles className="w-12 h-12 text-white animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Processing COI
            </h2>
            <p className="text-emerald-200 text-lg mb-6">
              {uploadStatus || 'Analyzing your certificate...'}
            </p>
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-emerald-300/70 text-sm">
              Our AI is extracting coverage details and checking compliance...
            </p>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal {...alertModal} onClose={hideAlert} />
    </div>
  );
}

export default ComplyApp;
