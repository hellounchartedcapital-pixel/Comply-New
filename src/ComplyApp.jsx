import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Calendar, X, Search, Download, Settings as SettingsIcon, Eye } from 'lucide-react';
import { useVendors } from './useVendors';
import { UploadModal } from './UploadModal';
import { Settings } from './Settings';
import { supabase } from './supabaseClient';
import { extractCOIFromPDF } from './extractCOI';
import { Logo } from './Logo';

// Initial vendor data
const initialVendors = [
  {
    id: 1,
    name: "American Direct Procurement, LLC",
    dba: "Avalon Communications Services",
    status: "expired",
    expirationDate: "2025-06-13",
    daysOverdue: 210,
    issues: [
      { type: "critical", message: "All policies expired 6/13/2025 (210 days overdue)" },
      { type: "error", message: "Missing property physical address on COI" }
    ],
    coverage: {
      generalLiability: { amount: 1000000, compliant: true },
      autoLiability: { amount: 1000000, compliant: true },
      workersComp: { amount: "Statutory", compliant: true },
      employersLiability: { amount: 1000000, compliant: true }
    }
  },
  {
    id: 2,
    name: "Faith Enterprises Incorporated",
    status: "non-compliant",
    expirationDate: "2026-10-01",
    daysOverdue: 0,
    issues: [
      { type: "error", message: "General Liability below requirement: $500,000 (requires $1.0M)" }
    ],
    coverage: {
      generalLiability: { amount: 500000, compliant: false },
      autoLiability: { amount: 1000000, compliant: true },
      workersComp: { amount: "Statutory", compliant: true },
      employersLiability: { amount: 1000000, compliant: true }
    }
  },
  {
    id: 3,
    name: "Captivate Holdings, LLC",
    status: "expired",
    expirationDate: "2025-09-25",
    daysOverdue: 106,
    issues: [
      { type: "critical", message: "All policies expired 9/25/2025 (106 days overdue)" }
    ],
    coverage: {
      generalLiability: { amount: 1000000, compliant: true },
      autoLiability: { amount: 1000000, compliant: false },
      workersComp: { amount: "Statutory", compliant: true },
      employersLiability: { amount: 1000000, compliant: true }
    }
  }
];

function ComplyApp({ user, onSignOut }) {
  // Use database hook instead of local state
  const { vendors: dbVendors, loading, error, addVendor, updateVendor, deleteVendor, refreshVendors } = useVendors();
  
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
    rawData: v.raw_data
  }));
  
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [editingVendor, setEditingVendor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userRequirements, setUserRequirements] = useState(null);

  // Load user requirements on mount
  React.useEffect(() => {
    loadUserRequirements();
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
          custom_coverages: customCoverages
        });
      }
    } catch (err) {
      console.error('Error loading user requirements:', err);
    }
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

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
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
              >
                <SettingsIcon size={16} />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Vendors</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="text-gray-400" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expired</p>
                <p className="text-3xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <XCircle className="text-red-400" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Non-Compliant</p>
                <p className="text-3xl font-bold text-orange-600">{stats.nonCompliant}</p>
              </div>
              <AlertCircle className="text-orange-400" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Compliant</p>
                <p className="text-3xl font-bold text-green-600">{stats.compliant}</p>
              </div>
              <CheckCircle className="text-green-400" size={32} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              <option value="all">All Status</option>
              <option value="expired">Expired</option>
              <option value="non-compliant">Non-Compliant</option>
              <option value="expiring">Expiring Soon</option>
              <option value="compliant">Compliant</option>
            </select>

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

            {/* Export */}
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>

            {/* Clear */}
            {(searchQuery || statusFilter !== 'all' || sortBy !== 'name') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
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
                  {searchQuery || statusFilter !== 'all' 
                    ? 'No vendors found'
                    : 'Welcome to Comply!'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first vendor'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
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
                <div key={vendor.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {getStatusIcon(vendor.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-base font-semibold text-gray-900">{vendor.name}</h3>
                          {getStatusBadge(vendor.status, vendor.daysOverdue)}
                        </div>
                        {vendor.dba && (
                          <p className="text-sm text-gray-500 mb-2">DBA: {vendor.dba}</p>
                        )}
                        
                        {vendor.issues.length > 0 && (
                          <div className="space-y-2 mt-3">
                            {vendor.issues.map((issue, idx) => (
                              <div key={idx} className={`flex items-start space-x-2 text-sm ${
                                issue.type === 'critical' ? 'text-red-700' : 'text-orange-700'
                              }`}>
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <span>{issue.message}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-center space-x-6 text-xs text-gray-600">
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
                    
                    <div className="ml-4 flex flex-col items-end space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={14} className="mr-1" />
                        Exp: {new Date(vendor.expirationDate).toLocaleDateString()}
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
                        onClick={() => setSelectedVendor(vendor)}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
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

      {/* Vendor Details Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold">{selectedVendor.name}</h3>
                {selectedVendor.dba && <p className="text-gray-500">DBA: {selectedVendor.dba}</p>}
              </div>
              <button onClick={() => setSelectedVendor(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Status</h4>
                {getStatusBadge(selectedVendor.status, selectedVendor.daysOverdue)}
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Expiration</h4>
                <p>{new Date(selectedVendor.expirationDate).toLocaleDateString()}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Standard Coverage</h4>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {(!selectedVendor.coverage.generalLiability.compliant || selectedVendor.coverage.generalLiability.expired) && (
                        <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">General Liability:</p>
                        <p className="text-sm text-gray-600">{formatCurrency(selectedVendor.coverage.generalLiability.amount)}</p>
                        {selectedVendor.coverage.generalLiability.expirationDate && (
                          <p className={`text-xs ${selectedVendor.coverage.generalLiability.expired ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            Exp: {new Date(selectedVendor.coverage.generalLiability.expirationDate).toLocaleDateString()}
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
                      <div>
                        <p className="font-medium">Auto Liability:</p>
                        <p className="text-sm text-gray-600">{formatCurrency(selectedVendor.coverage.autoLiability.amount)}</p>
                        {selectedVendor.coverage.autoLiability.expirationDate && (
                          <p className={`text-xs ${selectedVendor.coverage.autoLiability.expired ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            Exp: {new Date(selectedVendor.coverage.autoLiability.expirationDate).toLocaleDateString()}
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
                      <div>
                        <p className="font-medium">Workers Comp:</p>
                        <p className="text-sm text-gray-600">{selectedVendor.coverage.workersComp.amount}</p>
                        {selectedVendor.coverage.workersComp.expirationDate && (
                          <p className={`text-xs ${selectedVendor.coverage.workersComp.expired ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            Exp: {new Date(selectedVendor.coverage.workersComp.expirationDate).toLocaleDateString()}
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
                      <div>
                        <p className="font-medium">Employers Liability:</p>
                        <p className="text-sm text-gray-600">{formatCurrency(selectedVendor.coverage.employersLiability.amount)}</p>
                        {selectedVendor.coverage.employersLiability.expirationDate && (
                          <p className={`text-xs ${selectedVendor.coverage.employersLiability.expired ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            Exp: {new Date(selectedVendor.coverage.employersLiability.expirationDate).toLocaleDateString()}
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
                        <div className="flex-1">
                          <p className="font-medium">{cov.type}:</p>
                          <p className="text-sm text-gray-600">{formatCurrency(cov.amount || 0)}</p>
                          {cov.expirationDate && (
                            <p className={`text-xs ${cov.expired ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                              Exp: {new Date(cov.expirationDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
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
            
            <button
              onClick={() => setSelectedVendor(null)}
              className="w-full mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Close
            </button>
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
    </div>
  );
}

export default ComplyApp;
