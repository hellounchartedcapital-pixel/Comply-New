import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, CheckCircle, XCircle, AlertCircle, Clock,
  Mail, Phone, Calendar, Building2, X, Send,
  Loader2, FileText, History, Upload, Shield, ChevronDown, ChevronUp,
  Eye
} from 'lucide-react';
import { useTenants } from './useTenants';
import { supabase } from './supabaseClient';
import { formatCurrency, formatDate, formatRelativeDate, getStatusConfig, getDaysUntil } from './utils/complianceUtils';
import { getSourceInfo, getComplianceFieldStatusInfo } from './utils/tenantComplianceUtils';
import { AlertModal, useAlertModal } from './AlertModal';
import { PropertySelector } from './PropertySelector';
import { AddTenantWorkflow } from './AddTenantWorkflow';
import { TenantCOIUpload } from './TenantCOIUpload';
import { BuildingTenantDefaults } from './BuildingTenantDefaults';
import logger from './logger';
import { showSuccess } from './toast';

// Status icon component (matches vendor style)
function getStatusIcon(status) {
  const config = getStatusConfig(status);
  const icons = { CheckCircle, XCircle, AlertCircle, Clock };
  const Icon = icons[config.icon] || Clock;

  return (
    <div className={`w-10 h-10 ${config.iconBg} rounded-xl flex items-center justify-center`} role="img" aria-label={config.label}>
      <Icon size={20} className={config.iconColor} aria-hidden="true" />
    </div>
  );
}

// Status badge component with dynamic days calculation
function getStatusBadge(status, expirationDate) {
  const config = getStatusConfig(status);
  const days = getDaysUntil(expirationDate);

  let label;
  if (status === 'expired' && days !== null && days < 0) {
    label = `Expired ${Math.abs(days)} days`;
  } else if (status === 'expiring' && days !== null && days >= 0) {
    label = `Expiring in ${days} days`;
  } else {
    label = config.label;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`} role="status">
      {label}
    </span>
  );
}

// Lease renewal warning badge
function LeaseRenewalBadge({ leaseEnd, leaseRenewalDate }) {
  const date = leaseRenewalDate || leaseEnd;
  if (!date) return null;
  const days = getDaysUntil(date);
  if (days === null || days > 90) return null;

  if (days < 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
        Lease expired
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
        Lease renewal in {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
      Lease renewal in {days}d
    </span>
  );
}

// Requirement source badge (subtle)
function SourceBadge({ source }) {
  if (!source) return null;
  const info = getSourceInfo(source);
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${info.bg} ${info.color}`}>
      {info.label}
    </span>
  );
}

// Main TenantsView component
export function TenantsView({ properties, userRequirements, selectedProperty, onSelectProperty, loadingProperties }) {
  const { tenants, loading, stats, addTenant, updateTenant, deleteTenant, refreshTenants } = useTenants(selectedProperty?.id);
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const [bulkRequesting, setBulkRequesting] = useState(false);
  const [bulkRequestConfirm, setBulkRequestConfirm] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [tenantDetailsTab, setTenantDetailsTab] = useState('details');
  const [coiPreviewUrl, setCoiPreviewUrl] = useState(null);
  const [tenantActivity, setTenantActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // New workflow state
  const [showAddWorkflow, setShowAddWorkflow] = useState(false);
  const [showCOIUpload, setShowCOIUpload] = useState(false);
  const [coiUploadTenant, setCOIUploadTenant] = useState(null);
  const [showBuildingDefaults, setShowBuildingDefaults] = useState(false);
  const [requirementProfiles, setRequirementProfiles] = useState({});
  const [expandedTenantId, setExpandedTenantId] = useState(null);

  // Load requirement profiles for all tenants
  const loadRequirementProfiles = useCallback(async () => {
    const tenantIds = tenants.filter(t => t.has_requirement_profile).map(t => t.id);
    if (tenantIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('tenant_requirement_profiles')
        .select('*')
        .in('tenant_id', tenantIds);

      if (error) throw error;

      const profileMap = {};
      (data || []).forEach(p => { profileMap[p.tenant_id] = p; });
      setRequirementProfiles(profileMap);
    } catch (err) {
      logger.error('Error loading requirement profiles', err);
    }
  }, [tenants]);

  useEffect(() => {
    loadRequirementProfiles();
  }, [loadRequirementProfiles]);

  // Tenants needing attention
  const tenantsNeedingAttention = tenants.filter(t =>
    ['expired', 'non-compliant', 'expiring', 'pending'].includes(t.insurance_status) && t.email
  );

  // Filter and sort tenants
  const filteredTenants = tenants
    .filter(tenant => {
      const matchesSearch = !searchQuery ||
        tenant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.property?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.unit?.unit_number?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || tenant.insurance_status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'expiration') {
        const dateA = a.policy_expiration_date ? new Date(a.policy_expiration_date) : new Date('9999-12-31');
        const dateB = b.policy_expiration_date ? new Date(b.policy_expiration_date) : new Date('9999-12-31');
        return dateA - dateB;
      } else if (sortBy === 'status') {
        const order = { expired: 0, 'non-compliant': 1, expiring: 2, pending: 3, compliant: 4 };
        return (order[a.insurance_status] || 5) - (order[b.insurance_status] || 5);
      }
      return 0;
    });

  // COI document handling
  const getCOIDocumentUrl = async (documentPath) => {
    if (!documentPath) return null;
    const { data } = supabase.storage.from('coi-documents').getPublicUrl(documentPath);
    return data?.publicUrl;
  };

  useEffect(() => {
    const loadCOIPreview = async () => {
      const docPath = selectedTenant?.coi_document_path || selectedTenant?.policy_document_path;
      if (docPath) {
        const url = await getCOIDocumentUrl(docPath);
        setCoiPreviewUrl(url);
      } else {
        setCoiPreviewUrl(null);
      }
    };
    loadCOIPreview();
  }, [selectedTenant]);

  // Load tenant activity
  useEffect(() => {
    const loadTenantActivity = async () => {
      if (selectedTenant && tenantDetailsTab === 'history') {
        setLoadingActivity(true);
        try {
          const { data, error } = await supabase
            .from('tenant_activity')
            .select('*')
            .eq('tenant_id', selectedTenant.id)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          setTenantActivity(data || []);
        } catch (err) {
          logger.error('Error loading tenant activity:', err);
          setTenantActivity([]);
        } finally {
          setLoadingActivity(false);
        }
      }
    };
    loadTenantActivity();
  }, [selectedTenant, tenantDetailsTab]);

  useEffect(() => {
    if (!selectedTenant) {
      setTenantDetailsTab('details');
      setTenantActivity([]);
      setCoiPreviewUrl(null);
    }
  }, [selectedTenant]);

  // Handle adding a new tenant with requirement profile (new workflow)
  const handleSaveNewTenant = async (tenantData, profileData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create tenant
      const tenant = await addTenant(tenantData);

      // Create requirement profile
      if (profileData) {
        const { error: profileError } = await supabase
          .from('tenant_requirement_profiles')
          .insert({
            ...profileData,
            user_id: user.id,
            tenant_id: tenant.id,
          });

        if (profileError) {
          logger.error('Error creating requirement profile', profileError);
        } else {
          // Update tenant to link to profile
          await updateTenant(tenant.id, {
            has_requirement_profile: true,
          });
        }
      }

      // Log activity
      await supabase.from('tenant_activity').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        activity_type: 'vendor_created',
        description: `Tenant added via ${profileData?.creation_method || 'manual'} workflow`,
        metadata: { creation_method: profileData?.creation_method },
      });

      showSuccess('Tenant added successfully');
      refreshTenants();
      loadRequirementProfiles();
    } catch (err) {
      logger.error('Error in handleSaveNewTenant', err);
      throw err;
    }
  };

  // Handle COI upload complete
  const handleCOIUploadComplete = () => {
    refreshTenants();
    loadRequirementProfiles();
  };

  // Handle send COI request
  const handleSendRequest = async (tenant) => {
    if (!tenant.email) return;
    setSendingRequest(tenant.id);
    setRequestSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let uploadToken = tenant.upload_token;
      if (!uploadToken) {
        uploadToken = crypto.randomUUID();
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);
        await supabase.from('tenants').update({
          upload_token: uploadToken,
          upload_token_expires_at: tokenExpiresAt.toISOString(),
        }).eq('id', tenant.id);
      }

      const appUrl = window.location.origin;
      const companyName = userRequirements?.company_name || 'Our Company';
      const tenantProperty = properties?.find(p => p.id === tenant.property_id);
      const profile = requirementProfiles[tenant.id];

      const requirements = {
        generalLiability: profile?.gl_occurrence_limit || tenant.required_general_liability || 1000000,
        autoLiability: profile?.commercial_auto_csl || tenant.required_auto_liability || null,
        workersComp: profile?.workers_comp_statutory || tenant.required_workers_comp || false,
        employersLiability: profile?.workers_comp_employers_liability_limit || tenant.required_employers_liability || null,
        additionalInsured: (profile?.additional_insured_entities?.length > 0) || tenant.requires_additional_insured || false,
        waiverOfSubrogation: profile?.waiver_of_subrogation_required || false,
      };

      const issues = [];
      if (tenant.insurance_status === 'expired') issues.push('Certificate has expired');
      else if (tenant.insurance_status === 'non-compliant') issues.push('Certificate does not meet requirements');
      else if (tenant.insurance_status === 'pending') issues.push('No certificate on file');

      const { data: result, error: fnError } = await supabase.functions.invoke('send-coi-request', {
        body: {
          to: tenant.email,
          vendorName: tenant.name,
          vendorStatus: tenant.insurance_status,
          issues,
          companyName,
          replyTo: user.email,
          uploadToken,
          appUrl,
          requirements,
          propertyName: tenantProperty?.name || null,
          isTenant: true,
        },
      });

      if (fnError) throw new Error(fnError.message || 'Failed to send email');
      if (result && !result.success) throw new Error(result.error || 'Failed to send email');

      await supabase.from('tenants').update({ last_contacted_at: new Date().toISOString() }).eq('id', tenant.id);
      await supabase.from('tenant_activity').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        activity_type: 'email_sent',
        description: `COI request email sent to ${tenant.email}`,
        metadata: { email: tenant.email, status: tenant.insurance_status },
      });

      setRequestSuccess(tenant.id);
      setTimeout(() => setRequestSuccess(null), 3000);
      refreshTenants();
    } catch (error) {
      logger.error('Failed to send tenant COI request', error);
      showAlert({ type: 'error', title: 'Request Failed', message: 'Failed to send the COI request email.', details: error.message });
    } finally {
      setSendingRequest(null);
    }
  };

  // Bulk request
  const handleBulkRequest = () => {
    if (tenantsNeedingAttention.length === 0) return;
    setBulkRequestConfirm(true);
  };

  const executeBulkRequest = async () => {
    setBulkRequestConfirm(false);
    setBulkRequesting(true);
    setBulkResults(null);
    let successCount = 0;
    let failCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const companyName = userRequirements?.company_name || 'Our Company';
      const appUrl = window.location.origin;

      for (const tenant of tenantsNeedingAttention) {
        try {
          const uploadToken = crypto.randomUUID();
          const tokenExpiresAt = new Date();
          tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);

          await supabase.from('tenants').update({
            upload_token: uploadToken,
            upload_token_expires_at: tokenExpiresAt.toISOString(),
          }).eq('id', tenant.id);

          const tenantProperty = properties?.find(p => p.id === tenant.property_id);
          const profile = requirementProfiles[tenant.id];

          const requirements = {
            generalLiability: profile?.gl_occurrence_limit || tenant.required_general_liability || 1000000,
            autoLiability: profile?.commercial_auto_csl || null,
            workersComp: profile?.workers_comp_statutory || false,
            employersLiability: profile?.workers_comp_employers_liability_limit || null,
            additionalInsured: (profile?.additional_insured_entities?.length > 0) || false,
            waiverOfSubrogation: profile?.waiver_of_subrogation_required || false,
          };

          const issues = [];
          if (tenant.insurance_status === 'expired') issues.push('Certificate has expired');
          else if (tenant.insurance_status === 'non-compliant') issues.push('Certificate does not meet requirements');
          else if (tenant.insurance_status === 'pending') issues.push('No certificate on file');

          const { data: result, error: fnError } = await supabase.functions.invoke('send-coi-request', {
            body: {
              to: tenant.email,
              vendorName: tenant.name,
              vendorStatus: tenant.insurance_status,
              issues,
              companyName,
              replyTo: user.email,
              uploadToken,
              appUrl,
              requirements,
              propertyName: tenantProperty?.name || null,
              isTenant: true,
            },
          });

          if (fnError || (result && !result.success)) { failCount++; continue; }

          await supabase.from('tenants').update({ last_contacted_at: new Date().toISOString() }).eq('id', tenant.id);
          await supabase.from('tenant_activity').insert({
            tenant_id: tenant.id,
            user_id: user.id,
            activity_type: 'email_sent',
            description: `COI request email sent to ${tenant.email} (bulk)`,
            metadata: { email: tenant.email, status: tenant.insurance_status, bulk: true },
          });

          successCount++;
        } catch (err) {
          logger.error(`Failed to send to ${tenant.email}`, err);
          failCount++;
        }
      }

      setBulkResults({ success: successCount, failed: failCount });
      setTimeout(() => setBulkResults(null), 5000);
      refreshTenants();
    } catch (error) {
      logger.error('Bulk request failed', error);
      showAlert({ type: 'error', title: 'Bulk Request Failed', message: 'Failed to send bulk COI requests.', details: error.message });
    } finally {
      setBulkRequesting(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteTenant(id);
    setDeleteConfirm(null);
    setSelectedTenant(null);
  };

  // COI upload for a specific tenant
  const openCOIUpload = (tenant) => {
    setCOIUploadTenant(tenant);
    setShowCOIUpload(true);
  };

  return (
    <div className="space-y-6">
      {/* Property Selector */}
      {properties.length > 0 && (
        <div className="flex items-center justify-between">
          <PropertySelector
            properties={properties}
            selectedProperty={selectedProperty}
            onSelectProperty={onSelectProperty}
            loading={loadingProperties}
          />
          <div className="flex items-center gap-2">
            {selectedProperty && (
              <button
                onClick={() => setShowBuildingDefaults(true)}
                className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 font-medium"
              >
                <Shield size={14} />
                Tenant Defaults
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'Total Tenants', count: stats.total, color: 'gray', icon: Users },
          { key: 'expired', label: 'Expired', count: stats.expired, color: 'red', icon: XCircle },
          { key: 'non-compliant', label: 'Non-Compliant', count: stats.nonCompliant, color: 'orange', icon: AlertCircle },
          { key: 'expiring', label: 'Expiring', count: stats.expiring, color: 'amber', icon: AlertCircle },
          { key: 'compliant', label: 'Compliant', count: stats.compliant, color: 'emerald', icon: CheckCircle },
        ].map(({ key, label, count, color, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`bg-white rounded-2xl shadow-sm border p-4 hover:shadow-md transition-all text-left ${
              statusFilter === key ? `border-${color}-500 ring-2 ring-${color}-500` : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${key === 'all' ? 'text-gray-900' : `text-${color}-600`}`}>{count}</p>
              </div>
              <div className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                <Icon className={`text-${color}-500`} size={20} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
              />
            </div>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-medium text-gray-700"
          >
            <option value="name">Sort: Name</option>
            <option value="expiration">Sort: Expiration</option>
            <option value="status">Sort: Status</option>
          </select>

          <button
            onClick={() => setShowAddWorkflow(true)}
            className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Tenant</span>
          </button>

          {tenantsNeedingAttention.length > 0 && (
            <button
              onClick={handleBulkRequest}
              disabled={bulkRequesting}
              className="px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {bulkRequesting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span className="hidden sm:inline">Request All ({tenantsNeedingAttention.length})</span>
            </button>
          )}
        </div>

        {bulkResults && (
          <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700">
            Sent {bulkResults.success} request{bulkResults.success !== 1 ? 's' : ''}{bulkResults.failed > 0 ? `, ${bulkResults.failed} failed` : ''}
          </div>
        )}
      </div>

      {/* Tenant List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-emerald-500" size={24} />
            <span className="ml-2 text-gray-500">Loading tenants...</span>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">
              {tenants.length === 0 ? 'No tenants yet' : 'No tenants match your filters'}
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              {tenants.length === 0 ? 'Click "Add Tenant" to get started.' : 'Try adjusting your search or filter criteria.'}
            </p>
            {tenants.length === 0 && (
              <button
                onClick={() => setShowAddWorkflow(true)}
                className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Add Your First Tenant
              </button>
            )}
          </div>
        ) : (
          filteredTenants.map(tenant => {
            const profile = requirementProfiles[tenant.id];
            const isExpanded = expandedTenantId === tenant.id;
            const isSelected = selectedTenant?.id === tenant.id;

            return (
              <div
                key={tenant.id}
                className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md ${
                  isSelected ? 'border-emerald-500 ring-2 ring-emerald-500' : 'border-gray-200'
                }`}
              >
                {/* Tenant Row */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedTenant(isSelected ? null : tenant)}
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(tenant.insurance_status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{tenant.name}</h3>
                        {getStatusBadge(tenant.insurance_status, tenant.coi_expiration_date || tenant.policy_expiration_date)}
                        <LeaseRenewalBadge leaseEnd={tenant.lease_end} leaseRenewalDate={tenant.lease_renewal_date} />
                        {tenant.has_requirement_profile && profile && (
                          <SourceBadge source={profile.creation_method} />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {tenant.property?.name && (
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            {tenant.property.name}
                            {tenant.unit?.unit_number && ` - ${tenant.unit.unit_number}`}
                          </span>
                        )}
                        {tenant.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {tenant.email}
                          </span>
                        )}
                        {(tenant.coi_expiration_date || tenant.policy_expiration_date) && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Exp: {formatDate(tenant.coi_expiration_date || tenant.policy_expiration_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Upload COI */}
                      <button
                        onClick={(e) => { e.stopPropagation(); openCOIUpload(tenant); }}
                        className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                        title="Upload COI"
                      >
                        <Upload size={16} />
                      </button>

                      {/* Request COI */}
                      {tenant.email && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSendRequest(tenant); }}
                          disabled={sendingRequest === tenant.id}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 disabled:opacity-50"
                          title="Request COI"
                        >
                          {sendingRequest === tenant.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : requestSuccess === tenant.id ? (
                            <CheckCircle size={16} className="text-emerald-500" />
                          ) : (
                            <Send size={16} />
                          )}
                        </button>
                      )}

                      {/* Expand toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedTenantId(isExpanded ? null : tenant.id); }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Compliance Breakdown */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {tenant.compliance_details?.fields?.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Compliance Breakdown</p>
                        {tenant.compliance_details.fields.map((field, idx) => {
                          const statusInfo = getComplianceFieldStatusInfo(field.status);
                          return (
                            <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  field.status === 'compliant' ? 'bg-emerald-500' :
                                  field.status === 'non_compliant' ? 'bg-red-500' :
                                  field.status === 'expiring_soon' ? 'bg-amber-500' :
                                  field.status === 'expired' ? 'bg-red-700' :
                                  'bg-gray-400'
                                }`}></span>
                                <span className="text-sm text-gray-700">{field.label || field.fieldName}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>Req: {typeof field.required === 'number' ? formatCurrency(field.required) : String(field.required || 'N/A')}</span>
                                <span>Actual: {typeof field.actual === 'number' ? formatCurrency(field.actual) : String(field.actual || 'N/A')}</span>
                                <span className={`px-1.5 py-0.5 rounded ${statusInfo.bg} ${statusInfo.color}`}>{statusInfo.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : tenant.has_requirement_profile ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">No COI uploaded yet.</p>
                        <button
                          onClick={() => openCOIUpload(tenant)}
                          className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 mx-auto"
                        >
                          <Upload size={14} />
                          Upload COI
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">No requirement profile set.</p>
                        <p className="text-xs text-gray-400 mt-1">Add this tenant again with requirements to enable compliance tracking.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detail Panel (right side / modal for selected tenant) */}
      {selectedTenant && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col animate-fade-in-up">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedTenant.name}</h2>
              <p className="text-sm text-gray-500">
                {selectedTenant.property?.name}{selectedTenant.unit?.unit_number ? ` - ${selectedTenant.unit.unit_number}` : ''}
              </p>
            </div>
            <button onClick={() => setSelectedTenant(null)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {['details', 'requirements', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setTenantDetailsTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  tenantDetailsTab === tab
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'details' ? 'Details' : tab === 'requirements' ? 'Requirements' : 'History'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Details Tab */}
            {tenantDetailsTab === 'details' && (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedTenant.insurance_status)}
                  <div>
                    {getStatusBadge(selectedTenant.insurance_status, selectedTenant.coi_expiration_date || selectedTenant.policy_expiration_date)}
                    {selectedTenant.coi_insurance_company && (
                      <p className="text-xs text-gray-500 mt-1">Insured by: {selectedTenant.coi_insurance_company}</p>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900">Contact</h4>
                  {selectedTenant.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={14} className="text-gray-400" />
                      {selectedTenant.email}
                    </div>
                  )}
                  {selectedTenant.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} className="text-gray-400" />
                      {selectedTenant.phone}
                    </div>
                  )}
                </div>

                {/* Lease Info */}
                {(selectedTenant.lease_start || selectedTenant.lease_end) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900">Lease</h4>
                    <div className="flex gap-4 text-sm text-gray-600">
                      {selectedTenant.lease_start && (
                        <span>Start: {formatDate(selectedTenant.lease_start)}</span>
                      )}
                      {selectedTenant.lease_end && (
                        <span>End: {formatDate(selectedTenant.lease_end)}</span>
                      )}
                    </div>
                    <LeaseRenewalBadge leaseEnd={selectedTenant.lease_end} leaseRenewalDate={selectedTenant.lease_renewal_date} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => openCOIUpload(selectedTenant)}
                    className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Upload size={14} />
                    Upload COI
                  </button>
                  {selectedTenant.email && (
                    <button
                      onClick={() => handleSendRequest(selectedTenant)}
                      disabled={sendingRequest === selectedTenant.id}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Send size={14} />
                      Request COI
                    </button>
                  )}
                </div>

                {/* COI Document */}
                {(selectedTenant.coi_document_path || selectedTenant.policy_document_path) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900">Document</h4>
                    <div className="flex gap-2">
                      {coiPreviewUrl && (
                        <a
                          href={coiPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium flex items-center gap-1"
                        >
                          <Eye size={12} />
                          View COI
                        </a>
                      )}
                    </div>
                    {selectedTenant.coi_uploaded_at && (
                      <p className="text-xs text-gray-500">Uploaded: {formatRelativeDate(selectedTenant.coi_uploaded_at)}</p>
                    )}
                  </div>
                )}

                {/* Delete */}
                <div className="pt-4 border-t border-gray-200">
                  {deleteConfirm === selectedTenant.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600">Delete this tenant?</span>
                      <button onClick={() => handleDelete(selectedTenant.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">Yes</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(selectedTenant.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Delete tenant
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Requirements Tab */}
            {tenantDetailsTab === 'requirements' && (
              <div className="space-y-4">
                {requirementProfiles[selectedTenant.id] ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={16} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-gray-900">Requirement Profile</span>
                      <SourceBadge source={requirementProfiles[selectedTenant.id].creation_method} />
                    </div>

                    {[
                      { key: 'gl_occurrence_limit', label: 'GL Per Occurrence' },
                      { key: 'gl_aggregate_limit', label: 'GL Aggregate' },
                      { key: 'property_contents_limit', label: 'Property / Contents' },
                      { key: 'umbrella_limit', label: 'Umbrella / Excess' },
                      { key: 'workers_comp_statutory', label: 'Workers\' Comp', type: 'boolean' },
                      { key: 'workers_comp_employers_liability_limit', label: 'Employers Liability' },
                      { key: 'commercial_auto_csl', label: 'Commercial Auto' },
                      { key: 'professional_liability_limit', label: 'Professional Liability' },
                      { key: 'waiver_of_subrogation_required', label: 'Waiver of Subrogation', type: 'boolean' },
                      { key: 'cancellation_notice_days', label: 'Cancellation Notice', type: 'days' },
                    ].map(({ key, label, type }) => {
                      const profile = requirementProfiles[selectedTenant.id];
                      const val = profile[key];
                      const source = profile[`${key}_source`];

                      if (val == null || val === 0 || val === false) return null;

                      return (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{label}</span>
                            {source && <SourceBadge source={source} />}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {type === 'boolean' ? 'Required' :
                             type === 'days' ? `${val} days` :
                             formatCurrency(val)}
                          </span>
                        </div>
                      );
                    }).filter(Boolean)}

                    {/* Certificate Holder */}
                    {requirementProfiles[selectedTenant.id].certificate_holder_name && (
                      <div className="pt-2">
                        <p className="text-xs font-medium text-gray-500">Certificate Holder</p>
                        <p className="text-sm text-gray-900">{requirementProfiles[selectedTenant.id].certificate_holder_name}</p>
                      </div>
                    )}

                    {/* Lease doc reference */}
                    {requirementProfiles[selectedTenant.id].lease_document_path && (
                      <div className="pt-2">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <FileText size={12} />
                          Lease document on file
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Shield size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No requirement profile set</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Requirement profiles are created when adding a tenant via the new workflow.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {tenantDetailsTab === 'history' && (
              <div className="space-y-3">
                {loadingActivity ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-emerald-500" size={20} />
                  </div>
                ) : tenantActivity.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No activity recorded yet.</p>
                ) : (
                  tenantActivity.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        {activity.activity_type === 'coi_uploaded' ? <Upload size={14} className="text-emerald-600" /> :
                         activity.activity_type === 'email_sent' ? <Mail size={14} className="text-blue-600" /> :
                         <History size={14} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(activity.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddTenantWorkflow
        isOpen={showAddWorkflow}
        onClose={() => setShowAddWorkflow(false)}
        onSave={handleSaveNewTenant}
        properties={properties}
        selectedProperty={selectedProperty}
      />

      {showCOIUpload && coiUploadTenant && (
        <TenantCOIUpload
          isOpen={showCOIUpload}
          onClose={() => { setShowCOIUpload(false); setCOIUploadTenant(null); }}
          tenant={coiUploadTenant}
          requirementProfile={requirementProfiles[coiUploadTenant.id]}
          onUploadComplete={handleCOIUploadComplete}
        />
      )}

      {showBuildingDefaults && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowBuildingDefaults(false); }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <BuildingTenantDefaults
              propertyId={selectedProperty.id}
              propertyName={selectedProperty.name}
              onClose={() => setShowBuildingDefaults(false)}
              onSaved={() => setShowBuildingDefaults(false)}
            />
          </div>
        </div>
      )}

      {/* Bulk Request Confirmation Modal */}
      {bulkRequestConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setBulkRequestConfirm(false); }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Send Bulk COI Requests</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will send COI request emails to {tenantsNeedingAttention.length} tenant{tenantsNeedingAttention.length !== 1 ? 's' : ''} who need updated certificates.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkRequestConfirm(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
              <button onClick={executeBulkRequest} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">Send Requests</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertModal {...alertModal} onClose={hideAlert} />
    </div>
  );
}

export default TenantsView;
