import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Calendar, X, Search, Download, Settings as SettingsIcon, Eye, Bell, BarChart3, FileDown, Phone, Mail, User, Send, Clock, History } from 'lucide-react';
import { useVendors } from './useVendors';
import { UploadModal } from './UploadModal';
import { Settings } from './Settings';
import { NotificationSettings } from './NotificationSettings';
import { Analytics } from './Analytics';
import { OnboardingTutorial } from './OnboardingTutorial';
import { supabase } from './supabaseClient';
import { extractCOIFromPDF } from './extractCOI';
import { exportPDFReport } from './exportPDFReport';
import { Logo } from './Logo';

function ComplyApp({ user, onSignOut }) {
  // Use database hook instead of local state
  const { vendors: dbVendors, loading, loadingMore, error, hasMore, totalCount, addVendor, updateVendor, deleteVendor, loadMore, refreshVendors } = useVendors();
  
  // Convert database format (snake_case) to app format (camelCase)
  const vendors = dbVendors.map(v => ({
    id: v.id,
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
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [userRequirements, setUserRequirements] = useState(null);
  const [requestCOIVendor, setRequestCOIVendor] = useState(null);
  const [requestCOIEmail, setRequestCOIEmail] = useState('');
  const [vendorDetailsTab, setVendorDetailsTab] = useState('details');
  const [vendorActivity, setVendorActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Load user requirements and check onboarding status on mount
  React.useEffect(() => {
    loadUserRequirements();
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
    return <CheckCircle className="text-green-500" size={20} />;
  };

  const getStatusBadge = (status, daysOverdue) => {
    const styles = {
      expired: 'bg-red-100 text-red-800',
      'non-compliant': 'bg-orange-100 text-orange-800',
      expiring: 'bg-yellow-100 text-yellow-800',
      compliant: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
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
      alert('No document available for this vendor');
      return;
    }

    const url = await getCOIDocumentUrl(vendor.rawData.documentPath);
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Unable to retrieve document');
    }
  };

  // Download COI
  const handleDownloadCOI = async (vendor) => {
    if (!vendor.rawData?.documentPath) {
      alert('No document available for this vendor');
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
      alert('Failed to download document');
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
    } else {
      alert('Error updating vendor: ' + result.error);
    }
  };

  // Delete vendor
  const handleDelete = (vendor) => {
    setDeleteConfirm(vendor);
  };

  const confirmDelete = async () => {
    const result = await deleteVendor(deleteConfirm.id);
    if (result.success) {
      setDeleteConfirm(null);
      if (selectedVendor?.id === deleteConfirm.id) {
        setSelectedVendor(null);
      }
    } else {
      alert('Error deleting vendor: ' + result.error);
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
      alert('Please enter an email address');
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
          alert('Error saving contact email: ' + result.error);
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

      alert('Email sent successfully to ' + requestCOIEmail);

      setRequestCOIVendor(null);
      setRequestCOIEmail('');
      refreshVendors();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email: ' + error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle file upload with AI extraction
  const handleFileUpload = async (file, progressCallback) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Extract data using AI
      if (progressCallback) progressCallback('🤖 AI extracting data...');
      console.log('Extracting COI data with AI...');
      const extractionResult = await extractCOIFromPDF(file, userRequirements);
      
      if (!extractionResult.success) {
        throw new Error(extractionResult.error);
      }

      const vendorData = extractionResult.data;
      console.log('Extracted vendor data:', vendorData);

      // Step 2: Upload file to Storage
      if (progressCallback) progressCallback('☁️ Uploading to cloud...');
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('coi-documents')
        .upload(fileName, file);

      if (storageError) throw storageError;

      // Step 3: Create vendor in database
      if (progressCallback) progressCallback('💾 Saving vendor...');
      const result = await addVendor({
        ...vendorData,
        rawData: {
          ...vendorData.rawData,
          documentPath: fileName,
          documentUrl: storageData.path
        }
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Step 4: Refresh vendor list
      if (progressCallback) progressCallback('✅ Complete!');
      await refreshVendors();

      // Success!
      alert(`✅ Success! Created vendor: ${vendorData.name}\n\nStatus: ${vendorData.status.toUpperCase()}\nExpires: ${vendorData.expirationDate}\n\nThe vendor has been added to your dashboard.`);
      
    } catch (error) {
      console.error('Upload error:', error);
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
    a.download = `comply-vendor-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Export to PDF
  const exportToPDF = () => {
    exportPDFReport(filteredVendors, { email: user?.email });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo size="default" showTagline={true} />
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">Signed in</p>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                title="Settings"
                data-onboarding="settings-button"
              >
                <SettingsIcon size={16} />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={() => setShowNotifications(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                title="Notifications"
                data-onboarding="notifications-button"
              >
                <Bell size={16} />
                <span className="hidden sm:inline">Notifications</span>
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
                data-onboarding="upload-button"
              >
                <Upload size={16} />
                <span>Upload COI</span>
              </button>
              <button
                onClick={onSignOut}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Vendors</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="text-gray-400" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Expired</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <XCircle className="text-red-400" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Non-Compliant</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.nonCompliant}</p>
              </div>
              <AlertCircle className="text-orange-400" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Compliant</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.compliant}</p>
              </div>
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </div>
        </div>

        {/* Analytics Button */}
        <div className="mb-4 sm:mb-6" data-onboarding="analytics-button">
          <button
            onClick={() => setShowAnalytics(true)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-3 sm:p-4 hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center space-x-2 sm:space-x-3 shadow-lg hover:shadow-xl"
          >
            <BarChart3 size={20} className="sm:hidden" />
            <BarChart3 size={24} className="hidden sm:block" />
            <span className="text-base sm:text-lg font-semibold">View Detailed Analytics & Insights</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          {/* Quick Filter Buttons */}
          <div className="mb-4 sm:mb-6" data-onboarding="quick-filters">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Quick Filters</h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => setQuickFilter('all')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  quickFilter === 'all'
                    ? 'bg-gray-800 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({vendors.length})
              </button>
              <button
                onClick={() => setQuickFilter('expired')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  quickFilter === 'expired'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <XCircle size={14} className="inline mr-1 mb-0.5" />
                Expired ({vendors.filter(v => v.status === 'expired').length})
              </button>
              <button
                onClick={() => setQuickFilter('expiring')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  quickFilter === 'expiring'
                    ? 'bg-yellow-600 text-white shadow-md'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                <AlertCircle size={14} className="inline mr-1 mb-0.5" />
                <span className="hidden sm:inline">Expiring Soon</span>
                <span className="sm:hidden">Expiring</span>
                ({vendors.filter(v => v.status === 'expiring').length})
              </button>
              <button
                onClick={() => setQuickFilter('non-compliant')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  quickFilter === 'non-compliant'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                <AlertCircle size={14} className="inline mr-1 mb-0.5" />
                Non-Compliant ({vendors.filter(v => v.status === 'non-compliant').length})
              </button>
              <button
                onClick={() => setQuickFilter('compliant')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  quickFilter === 'compliant'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                <CheckCircle size={14} className="inline mr-1 mb-0.5" />
                Compliant ({vendors.filter(v => v.status === 'compliant').length})
              </button>
            </div>
          </div>

          {/* Search and Sort Controls */}
          <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-gray-200">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="expiration">Sort: Expiration Date</option>
              <option value="status">Sort: Status</option>
            </select>

            {/* Export Buttons */}
            <button
              onClick={exportToPDF}
              className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2 text-xs sm:text-sm"
              title="Export PDF Report"
            >
              <FileDown size={14} />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={exportToCSV}
              className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2 text-xs sm:text-sm"
              title="Export CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>

            {/* Clear */}
            {(searchQuery || quickFilter !== 'all' || sortBy !== 'name') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setQuickFilter('all');
                  setSortBy('name');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
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
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
              <p className="text-gray-600">Loading vendors...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading vendors</h3>
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
            {filteredVendors.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
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
                  <div className="max-w-md mx-auto text-left bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">Quick Start:</h4>
                    <ol className="space-y-2 text-sm text-blue-800">
                      <li>1. Click <strong>"Settings"</strong> to customize your requirements</li>
                      <li>2. Add vendors manually via Supabase Table Editor</li>
                      <li>3. Click <strong>"Upload COI"</strong> to test file storage</li>
                      <li>4. <strong>Phase 4</strong> will add AI extraction to auto-populate vendors from PDFs!</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              filteredVendors.map((vendor) => (
                <div key={vendor.id} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(vendor.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{vendor.name}</h3>
                          {getStatusBadge(vendor.status, vendor.daysOverdue)}
                        </div>
                        {vendor.dba && (
                          <p className="text-xs sm:text-sm text-gray-500 mb-2 truncate">DBA: {vendor.dba}</p>
                        )}

                        {vendor.issues.length > 0 && (
                          <div className="space-y-2 mt-2 sm:mt-3">
                            {vendor.issues.map((issue, idx) => (
                              <div key={idx} className={`flex items-start space-x-2 text-xs sm:text-sm ${
                                issue.type === 'critical' ? 'text-red-700' : 'text-orange-700'
                              }`}>
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <span className="break-words">{issue.message}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">GL:</span> {formatCurrency(vendor.coverage.generalLiability.amount)}
                          </div>
                          <div>
                            <span className="font-medium">Auto:</span> {formatCurrency(vendor.coverage.autoLiability.amount)}
                          </div>
                          <div>
                            <span className="font-medium">WC:</span> {vendor.coverage.workersComp.amount}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start space-x-2 sm:space-x-0 sm:space-y-2 sm:ml-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                      <div className="flex items-center text-xs sm:text-sm text-gray-500">
                        <Calendar size={12} className="mr-1 sm:hidden" />
                        <Calendar size={14} className="mr-1 hidden sm:inline" />
                        <span className="hidden sm:inline">Exp: </span>{formatDate(vendor.expirationDate)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleDelete(vendor)}
                          className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                      <button
                        onClick={() => handleSelectVendor(vendor)}
                        className="text-xs sm:text-sm text-green-600 hover:text-green-700 font-medium whitespace-nowrap"
                      >
                        View Details
                      </button>
                      {(vendor.status === 'expired' || vendor.status === 'non-compliant' || vendor.status === 'expiring') && (
                        <button
                          onClick={() => handleRequestCOI(vendor)}
                          className="text-xs sm:text-sm bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 font-medium whitespace-nowrap flex items-center space-x-1"
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
              <div className="p-4 border-t border-gray-200 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Vendor</h3>
              <button onClick={() => setEditingVendor(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={editingVendor.name}
                  onChange={(e) => setEditingVendor({...editingVendor, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DBA</label>
                <input
                  type="text"
                  value={editingVendor.dba || ''}
                  onChange={(e) => setEditingVendor({...editingVendor, dba: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={editingVendor.expirationDate}
                  onChange={(e) => setEditingVendor({...editingVendor, expirationDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact Information (Optional)</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={editingVendor.contactName || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, contactName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingVendor.contactEmail || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, contactEmail: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="contact@vendor.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editingVendor.contactPhone || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, contactPhone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={editingVendor.contactNotes || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, contactNotes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
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
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingVendor(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Confirm Delete</h3>
              <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request COI Modal */}
      {requestCOIVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Send size={20} className="text-orange-500" />
                <span>Request New COI</span>
              </h3>
              <button onClick={() => { setRequestCOIVendor(null); setRequestCOIEmail(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Vendor</p>
              <p className="font-semibold text-gray-900">{requestCOIVendor.name}</p>
              <div className="mt-2">
                {getStatusBadge(requestCOIVendor.status, requestCOIVendor.daysOverdue)}
              </div>
            </div>

            {requestCOIVendor.issues.length > 0 && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm font-medium text-orange-800 mb-2">Issues to address:</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {!requestCOIVendor.contactEmail && (
                <p className="text-xs text-gray-500 mt-1">
                  This email will be saved to the vendor's contact info
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={sendCOIRequest}
                disabled={!requestCOIEmail || sendingEmail}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-4 sm:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">{selectedVendor.name}</h3>
                {selectedVendor.dba && <p className="text-gray-500">DBA: {selectedVendor.dba}</p>}
              </div>
              <button onClick={() => setSelectedVendor(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mb-6 border-b border-gray-200">
              <button
                onClick={() => setVendorDetailsTab('details')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  vendorDetailsTab === 'details'
                    ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText size={16} className="inline mr-2 mb-0.5" />
                Details
              </button>
              <button
                onClick={() => setVendorDetailsTab('history')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  vendorDetailsTab === 'history'
                    ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <History size={16} className="inline mr-2 mb-0.5" />
                History
              </button>
            </div>

            {/* Details Tab Content */}
            {vendorDetailsTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Status</h4>
                {getStatusBadge(selectedVendor.status, selectedVendor.daysOverdue)}
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Expiration</h4>
                <p>{formatDate(selectedVendor.expirationDate)}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Standard Coverage</h4>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {(!selectedVendor.coverage.generalLiability.compliant || selectedVendor.coverage.generalLiability.expired) && (
                        <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                      )}
                      {(!selectedVendor.coverage.generalLiability.expired && selectedVendor.coverage.generalLiability.expiringSoon) && (
                        <AlertCircle size={16} className="text-yellow-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">General Liability:</p>
                        <p className="text-sm text-gray-600">{formatCurrency(selectedVendor.coverage.generalLiability.amount)}</p>
                        {selectedVendor.coverage.generalLiability.expirationDate && (
                          <p className={`text-xs ${
                            selectedVendor.coverage.generalLiability.expired
                              ? 'text-red-600 font-semibold'
                              : selectedVendor.coverage.generalLiability.expiringSoon
                              ? 'text-yellow-600 font-semibold'
                              : 'text-gray-500'
                          }`}>
                            Exp: {formatDate(selectedVendor.coverage.generalLiability.expirationDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {(!selectedVendor.coverage.autoLiability.compliant || selectedVendor.coverage.autoLiability.expired) && (
                        <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                      )}
                      {(!selectedVendor.coverage.autoLiability.expired && selectedVendor.coverage.autoLiability.expiringSoon) && (
                        <AlertCircle size={16} className="text-yellow-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">Auto Liability:</p>
                        <p className="text-sm text-gray-600">{formatCurrency(selectedVendor.coverage.autoLiability.amount)}</p>
                        {selectedVendor.coverage.autoLiability.expirationDate && (
                          <p className={`text-xs ${
                            selectedVendor.coverage.autoLiability.expired
                              ? 'text-red-600 font-semibold'
                              : selectedVendor.coverage.autoLiability.expiringSoon
                              ? 'text-yellow-600 font-semibold'
                              : 'text-gray-500'
                          }`}>
                            Exp: {formatDate(selectedVendor.coverage.autoLiability.expirationDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {(!selectedVendor.coverage.workersComp.compliant || selectedVendor.coverage.workersComp.expired) && (
                        <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                      )}
                      {(!selectedVendor.coverage.workersComp.expired && selectedVendor.coverage.workersComp.expiringSoon) && (
                        <AlertCircle size={16} className="text-yellow-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">Workers Comp:</p>
                        <p className="text-sm text-gray-600">{selectedVendor.coverage.workersComp.amount}</p>
                        {selectedVendor.coverage.workersComp.expirationDate && (
                          <p className={`text-xs ${
                            selectedVendor.coverage.workersComp.expired
                              ? 'text-red-600 font-semibold'
                              : selectedVendor.coverage.workersComp.expiringSoon
                              ? 'text-yellow-600 font-semibold'
                              : 'text-gray-500'
                          }`}>
                            Exp: {formatDate(selectedVendor.coverage.workersComp.expirationDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {(!selectedVendor.coverage.employersLiability.compliant || selectedVendor.coverage.employersLiability.expired) && (
                        <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                      )}
                      {(!selectedVendor.coverage.employersLiability.expired && selectedVendor.coverage.employersLiability.expiringSoon) && (
                        <AlertCircle size={16} className="text-yellow-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">Employers Liability:</p>
                        <p className="text-sm text-gray-600">{formatCurrency(selectedVendor.coverage.employersLiability.amount)}</p>
                        {selectedVendor.coverage.employersLiability.expirationDate && (
                          <p className={`text-xs ${
                            selectedVendor.coverage.employersLiability.expired
                              ? 'text-red-600 font-semibold'
                              : selectedVendor.coverage.employersLiability.expiringSoon
                              ? 'text-yellow-600 font-semibold'
                              : 'text-gray-500'
                          }`}>
                            Exp: {formatDate(selectedVendor.coverage.employersLiability.expirationDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedVendor.additionalCoverages && selectedVendor.additionalCoverages.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Additional Coverage</h4>
                  <div className="space-y-3">
                    {selectedVendor.additionalCoverages.map((cov, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        {cov.expired && (
                          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-1" />
                        )}
                        {(!cov.expired && cov.expiringSoon) && (
                          <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-1" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{cov.type}:</p>
                          <p className="text-sm text-gray-600">{formatCurrency(cov.amount || 0)}</p>
                          {cov.expirationDate && (
                            <p className={`text-xs ${
                              cov.expired
                                ? 'text-red-600 font-semibold'
                                : cov.expiringSoon
                                ? 'text-yellow-600 font-semibold'
                                : 'text-gray-500'
                            }`}>
                              Exp: {formatDate(cov.expirationDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Insured Status */}
              {selectedVendor.additionalInsured && (
                <div>
                  <h4 className="font-semibold mb-2">Additional Insured</h4>
                  <div className={`p-4 rounded-lg border ${
                    selectedVendor.hasAdditionalInsured
                      ? 'bg-green-50 border-green-200'
                      : selectedVendor.missingAdditionalInsured
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {selectedVendor.hasAdditionalInsured && (
                        <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                      {selectedVendor.missingAdditionalInsured && (
                        <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          selectedVendor.hasAdditionalInsured
                            ? 'text-green-900'
                            : selectedVendor.missingAdditionalInsured
                            ? 'text-red-900'
                            : 'text-gray-900'
                        }`}>
                          {selectedVendor.additionalInsured}
                        </p>
                        {selectedVendor.hasAdditionalInsured && (
                          <p className="text-xs text-green-700 mt-1">
                            ✓ Your company is properly listed as Additional Insured
                          </p>
                        )}
                        {selectedVendor.missingAdditionalInsured && (
                          <p className="text-xs text-red-700 mt-1">
                            ✗ Your company is NOT listed as Additional Insured
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Waiver of Subrogation Status */}
              {selectedVendor.waiverOfSubrogation && (
                <div>
                  <h4 className="font-semibold mb-2">Waiver of Subrogation</h4>
                  <div className={`p-4 rounded-lg border ${
                    selectedVendor.hasWaiverOfSubrogation
                      ? 'bg-green-50 border-green-200'
                      : selectedVendor.missingWaiverOfSubrogation
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {selectedVendor.hasWaiverOfSubrogation && (
                        <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                      {selectedVendor.missingWaiverOfSubrogation && (
                        <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          selectedVendor.hasWaiverOfSubrogation
                            ? 'text-green-900'
                            : selectedVendor.missingWaiverOfSubrogation
                            ? 'text-red-900'
                            : 'text-gray-900'
                        }`}>
                          {selectedVendor.waiverOfSubrogation}
                        </p>
                        {selectedVendor.hasWaiverOfSubrogation && (
                          <p className="text-xs text-green-700 mt-1">
                            ✓ Waiver of Subrogation is included
                          </p>
                        )}
                        {selectedVendor.missingWaiverOfSubrogation && (
                          <p className="text-xs text-red-700 mt-1">
                            ✗ Waiver of Subrogation is NOT included
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedVendor.issues.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Issues</h4>
                  <div className="space-y-2">
                    {selectedVendor.issues.map((issue, idx) => (
                      <div key={idx} className={`flex items-start space-x-2 ${
                        issue.type === 'critical' ? 'text-red-700' : 'text-orange-700'
                      }`}>
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{issue.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(selectedVendor.contactName || selectedVendor.contactEmail || selectedVendor.contactPhone) && (
                <div>
                  <h4 className="font-semibold mb-3">Contact Information</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    {selectedVendor.contactName && (
                      <div className="flex items-center space-x-3">
                        <User size={18} className="text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-600">Contact Person</p>
                          <p className="font-medium text-gray-900">{selectedVendor.contactName}</p>
                        </div>
                      </div>
                    )}

                    {selectedVendor.contactEmail && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Mail size={18} className="text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-600">Email</p>
                            <p className="font-medium text-gray-900">{selectedVendor.contactEmail}</p>
                          </div>
                        </div>
                        <a
                          href={`mailto:${selectedVendor.contactEmail}`}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 flex items-center space-x-1"
                          title="Send email"
                        >
                          <Mail size={14} />
                          <span>Email</span>
                        </a>
                      </div>
                    )}

                    {selectedVendor.contactPhone && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Phone size={18} className="text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-600">Phone</p>
                            <p className="font-medium text-gray-900">{selectedVendor.contactPhone}</p>
                          </div>
                        </div>
                        <a
                          href={`tel:${selectedVendor.contactPhone}`}
                          className="px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 flex items-center space-x-1"
                          title="Call"
                        >
                          <Phone size={14} />
                          <span>Call</span>
                        </a>
                      </div>
                    )}

                    {selectedVendor.contactNotes && (
                      <div className="pt-3 border-t border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Notes</p>
                        <p className="text-sm text-gray-700">{selectedVendor.contactNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COI Document Actions */}
              <div>
                <h4 className="font-semibold mb-2">Certificate of Insurance</h4>
                {selectedVendor.rawData?.documentPath ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleViewCOI(selectedVendor)}
                      className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Eye size={20} />
                      <span>View COI</span>
                    </button>
                    <button
                      onClick={() => handleDownloadCOI(selectedVendor)}
                      className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Download size={20} />
                      <span>Download COI</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <FileText className="inline mr-2" size={16} />
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
                <h4 className="font-semibold text-gray-900">Activity History</h4>

                {loadingActivity ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    <p className="text-gray-500 mt-2">Loading history...</p>
                  </div>
                ) : vendorActivity.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <Clock size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No activity recorded yet</p>
                    <p className="text-sm text-gray-400 mt-1">Activity will appear here when emails are sent or COIs are uploaded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vendorActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className={`p-4 rounded-lg border ${
                          activity.activity_type === 'coi_uploaded'
                            ? 'bg-green-50 border-green-200'
                            : activity.activity_type === 'email_sent'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${
                            activity.activity_type === 'coi_uploaded'
                              ? 'bg-green-100'
                              : activity.activity_type === 'email_sent'
                              ? 'bg-blue-100'
                              : 'bg-gray-100'
                          }`}>
                            {activity.activity_type === 'coi_uploaded' ? (
                              <Upload size={16} className="text-green-600" />
                            ) : activity.activity_type === 'email_sent' ? (
                              <Mail size={16} className="text-blue-600" />
                            ) : (
                              <Clock size={16} className="text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${
                              activity.activity_type === 'coi_uploaded'
                                ? 'text-green-900'
                                : activity.activity_type === 'email_sent'
                                ? 'text-blue-900'
                                : 'text-gray-900'
                            }`}>
                              {activity.activity_type === 'coi_uploaded'
                                ? 'COI Uploaded'
                                : activity.activity_type === 'email_sent'
                                ? 'Request Email Sent'
                                : activity.activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(activity.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
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
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center space-x-2"
                >
                  <Send size={16} />
                  <span>Request New COI</span>
                </button>
              )}
              <button
                onClick={() => setSelectedVendor(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
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

      {/* Analytics Modal */}
      {showAnalytics && (
        <Analytics vendors={vendors} onClose={() => setShowAnalytics(false)} />
      )}

      {/* Onboarding Tutorial */}
      {onboardingChecked && showOnboarding && (
        <OnboardingTutorial
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
  );
}

export default ComplyApp;
