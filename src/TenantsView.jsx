import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, CheckCircle, XCircle, AlertCircle, Clock,
  Mail, Phone, Calendar, Building2, Edit2, X, Send,
  ExternalLink, Shield, Loader2
} from 'lucide-react';
import { useTenants } from './useTenants';
import { supabase } from './supabaseClient';
import { formatCurrency, formatDate, formatRelativeDate, getStatusConfig } from './utils/complianceUtils';
import { AlertModal, useAlertModal } from './AlertModal';
import { PropertySelector } from './PropertySelector';
import logger from './logger';

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

// Status badge component (matches vendor style)
function getStatusBadge(status) {
  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`} role="status">
      {config.label}
    </span>
  );
}

// Add/Edit Tenant Modal
function TenantModal({ isOpen, onClose, onSave, tenant, properties }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property_id: '',
    unit_number: '', // Changed from unit_id to unit_number
    lease_start: '',
    lease_end: '',
    status: 'active',
    required_liability_min: 100000,
    required_property_damage_min: 0,
    required_auto_liability_min: 0,
    required_workers_comp: false,
    workers_comp_exempt: false,
    required_employers_liability_min: 0,
    requires_additional_insured: true,
    additional_insured_text: '',
    certificate_holder_name: '',
    certificate_holder_address: '',
    cancellation_notice_days: 30,
    requires_declarations_page: true,
    requires_endorsement_pages: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        property_id: tenant.property_id || '',
        unit_number: tenant.unit?.unit_number || '',
        lease_start: tenant.lease_start || '',
        lease_end: tenant.lease_end || '',
        status: tenant.status || 'active',
        required_liability_min: tenant.required_liability_min || 100000,
        required_property_damage_min: tenant.required_property_damage_min || 0,
        required_auto_liability_min: tenant.required_auto_liability_min || 0,
        required_workers_comp: tenant.required_workers_comp || false,
        workers_comp_exempt: tenant.workers_comp_exempt || false,
        required_employers_liability_min: tenant.required_employers_liability_min || 0,
        requires_additional_insured: tenant.requires_additional_insured !== false,
        additional_insured_text: tenant.additional_insured_text || '',
        certificate_holder_name: tenant.certificate_holder_name || '',
        certificate_holder_address: tenant.certificate_holder_address || '',
        cancellation_notice_days: tenant.cancellation_notice_days || 30,
        requires_declarations_page: tenant.requires_declarations_page !== false,
        requires_endorsement_pages: tenant.requires_endorsement_pages !== false,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        property_id: '',
        unit_number: '',
        lease_start: '',
        lease_end: '',
        status: 'active',
        required_liability_min: 100000,
        required_property_damage_min: 0,
        required_auto_liability_min: 0,
        required_workers_comp: false,
        workers_comp_exempt: false,
        required_employers_liability_min: 0,
        requires_additional_insured: true,
        additional_insured_text: '',
        certificate_holder_name: '',
        certificate_holder_address: '',
        cancellation_notice_days: 30,
        requires_declarations_page: true,
        requires_endorsement_pages: true,
      });
    }
  }, [tenant, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      logger.error('Error saving tenant', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {tenant ? 'Edit Tenant' : 'Add New Tenant'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                Tenant Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Property & Unit */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-emerald-600" />
                Property & Unit
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select property...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Number
                  </label>
                  <input
                    type="text"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., 101, A, 2B"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Move-in</option>
                    <option value="moved_out">Moved Out</option>
                    <option value="evicted">Evicted</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lease Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-emerald-600" />
                Lease Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.lease_start}
                    onChange={(e) => setFormData({ ...formData, lease_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease End Date
                  </label>
                  <input
                    type="date"
                    value={formData.lease_end}
                    onChange={(e) => setFormData({ ...formData, lease_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Insurance Requirements */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield size={16} className="text-emerald-600" />
                Insurance Requirements
              </h3>

              {/* Coverage Limits */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Required Coverage Limits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      General Liability
                    </label>
                    <select
                      value={formData.required_liability_min}
                      onChange={(e) => setFormData({ ...formData, required_liability_min: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value={0}>Per Lease</option>
                      <option value={100000}>$100,000</option>
                      <option value={300000}>$300,000</option>
                      <option value={500000}>$500,000</option>
                      <option value={1000000}>$1,000,000</option>
                      <option value={2000000}>$2,000,000</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Auto Liability
                    </label>
                    <select
                      value={formData.required_auto_liability_min}
                      onChange={(e) => setFormData({ ...formData, required_auto_liability_min: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value={0}>Not Required</option>
                      <option value={100000}>$100,000</option>
                      <option value={300000}>$300,000</option>
                      <option value={500000}>$500,000</option>
                      <option value={1000000}>$1,000,000</option>
                    </select>
                  </div>
                </div>

                {/* Workers Compensation */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.required_workers_comp}
                      onChange={(e) => setFormData({ ...formData, required_workers_comp: e.target.checked, workers_comp_exempt: false })}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Workers' Compensation Required</span>
                  </label>
                </div>
              </div>

              {/* Additional Insured */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_additional_insured}
                    onChange={(e) => setFormData({ ...formData, requires_additional_insured: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Require owner as additional insured</span>
                </label>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.name.trim()}
            className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>{tenant ? 'Update Tenant' : 'Add Tenant'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main TenantsView component
export function TenantsView({ properties, userRequirements, selectedProperty, onSelectProperty, loadingProperties }) {
  const { tenants, loading, stats, addTenant, updateTenant, deleteTenant, refreshTenants } = useTenants();
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const [bulkRequesting, setBulkRequesting] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

  // Calculate tenants that need attention (non-compliant with email)
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

  const handleSave = async (formData) => {
    // Handle unit creation/lookup
    let unitId = null;
    if (formData.unit_number && formData.unit_number.trim() && formData.property_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if unit already exists
        const { data: existingUnit } = await supabase
          .from('units')
          .select('id')
          .eq('property_id', formData.property_id)
          .eq('user_id', user.id)
          .eq('unit_number', formData.unit_number.trim())
          .single();

        if (existingUnit) {
          unitId = existingUnit.id;
        } else {
          // Create new unit
          const { data: newUnit } = await supabase
            .from('units')
            .insert({
              user_id: user.id,
              property_id: formData.property_id,
              unit_number: formData.unit_number.trim()
            })
            .select('id')
            .single();

          if (newUnit) {
            unitId = newUnit.id;
          }
        }
      }
    }

    const saveData = { ...formData, unit_id: unitId };
    delete saveData.unit_number;

    if (editingTenant) {
      await updateTenant(editingTenant.id, saveData);
    } else {
      await addTenant(saveData);
    }
    setEditingTenant(null);
  };

  const handleDelete = async (id) => {
    await deleteTenant(id);
    setDeleteConfirm(null);
    setSelectedTenant(null);
  };

  const copyUploadLink = async (tenant) => {
    const link = `${window.location.origin}?tenant_upload=${tenant.upload_token}`;
    await navigator.clipboard.writeText(link);
    setCopySuccess(tenant.id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleSendRequest = async (tenant) => {
    if (!tenant.email) return;
    setSendingRequest(tenant.id);
    setRequestSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate upload token if needed
      let uploadToken = tenant.upload_token;
      if (!uploadToken) {
        uploadToken = crypto.randomUUID();
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);

        await supabase
          .from('tenants')
          .update({
            upload_token: uploadToken,
            upload_token_expires_at: tokenExpiresAt.toISOString()
          })
          .eq('id', tenant.id);
      }

      const appUrl = window.location.origin;
      const companyName = userRequirements?.company_name || 'Our Company';

      // Get tenant's property for requirements
      const tenantProperty = properties?.find(p => p.id === tenant.property_id);

      // Build requirements from tenant or property settings
      const requirements = {
        generalLiability: tenant.required_liability_min || tenantProperty?.general_liability || 100000,
        autoLiability: tenant.required_auto_liability_min || null,
        workersComp: tenant.required_workers_comp || false,
        employersLiability: tenant.required_employers_liability_min || null,
        additionalInsured: tenant.requires_additional_insured !== false,
        waiverOfSubrogation: false,
      };

      // Determine issues based on status
      const issues = [];
      if (tenant.insurance_status === 'expired') {
        issues.push('Certificate has expired');
      } else if (tenant.insurance_status === 'non-compliant') {
        issues.push('Certificate does not meet requirements');
      } else if (tenant.insurance_status === 'pending') {
        issues.push('No certificate on file');
      }

      // Call the edge function
      const { data: result, error: fnError } = await supabase.functions.invoke('send-coi-request', {
        body: {
          to: tenant.email,
          vendorName: tenant.name, // Reuse vendor template for now
          vendorStatus: tenant.insurance_status,
          issues: issues,
          companyName: companyName,
          replyTo: user.email,
          uploadToken: uploadToken,
          appUrl: appUrl,
          requirements: requirements,
          propertyName: tenantProperty?.name || null,
          isTenant: true, // Flag for tenant-specific handling
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to send email');
      }

      if (result && !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Update last contacted timestamp
      await supabase
        .from('tenants')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', tenant.id);

      // Log activity
      await supabase.from('tenant_activity').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        activity_type: 'email_sent',
        description: `COI request email sent to ${tenant.email}`,
        metadata: { email: tenant.email, status: tenant.insurance_status }
      });

      setRequestSuccess(tenant.id);
      setTimeout(() => setRequestSuccess(null), 3000);
      refreshTenants();

    } catch (error) {
      logger.error('Failed to send tenant COI request', error);
      showAlert({
        type: 'error',
        title: 'Request Failed',
        message: 'Failed to send the COI request email.',
        details: error.message
      });
    } finally {
      setSendingRequest(null);
    }
  };

  // Bulk send COI requests to all tenants needing attention
  const handleBulkRequest = async () => {
    if (tenantsNeedingAttention.length === 0) return;

    const confirmed = window.confirm(
      `Send COI requests to ${tenantsNeedingAttention.length} tenants?\n\nThis will email all tenants who need updated insurance certificates and have an email address on file.`
    );

    if (!confirmed) return;

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
          // Generate upload token
          const uploadToken = crypto.randomUUID();
          const tokenExpiresAt = new Date();
          tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);

          await supabase
            .from('tenants')
            .update({
              upload_token: uploadToken,
              upload_token_expires_at: tokenExpiresAt.toISOString()
            })
            .eq('id', tenant.id);

          // Get tenant's property
          const tenantProperty = properties?.find(p => p.id === tenant.property_id);

          // Build requirements
          const requirements = {
            generalLiability: tenant.required_liability_min || tenantProperty?.general_liability || 100000,
            autoLiability: tenant.required_auto_liability_min || null,
            workersComp: tenant.required_workers_comp || false,
            employersLiability: tenant.required_employers_liability_min || null,
            additionalInsured: tenant.requires_additional_insured !== false,
          };

          // Determine issues
          const issues = [];
          if (tenant.insurance_status === 'expired') {
            issues.push('Certificate has expired');
          } else if (tenant.insurance_status === 'non-compliant') {
            issues.push('Certificate does not meet requirements');
          } else if (tenant.insurance_status === 'pending') {
            issues.push('No certificate on file');
          }

          // Send email
          const { data: result, error: fnError } = await supabase.functions.invoke('send-coi-request', {
            body: {
              to: tenant.email,
              vendorName: tenant.name,
              vendorStatus: tenant.insurance_status,
              issues: issues,
              companyName: companyName,
              replyTo: user.email,
              uploadToken: uploadToken,
              appUrl: appUrl,
              requirements: requirements,
              propertyName: tenantProperty?.name || null,
              isTenant: true,
            },
          });

          if (fnError || (result && !result.success)) {
            failCount++;
            continue;
          }

          // Update last contacted timestamp
          await supabase
            .from('tenants')
            .update({ last_contacted_at: new Date().toISOString() })
            .eq('id', tenant.id);

          // Log activity
          await supabase.from('tenant_activity').insert({
            tenant_id: tenant.id,
            user_id: user.id,
            activity_type: 'email_sent',
            description: `COI request email sent to ${tenant.email} (bulk)`,
            metadata: { email: tenant.email, status: tenant.insurance_status, bulk: true }
          });

          successCount++;
        } catch (err) {
          logger.error(`Failed to send to ${tenant.email}`, err);
          failCount++;
        }
      }

      // Log bulk request completion
      await supabase.from('tenant_activity').insert({
        tenant_id: null,
        user_id: user.id,
        activity_type: 'bulk_request',
        description: `Bulk COI request completed: ${successCount} sent, ${failCount} failed`,
        metadata: { success: successCount, failed: failCount, total: tenantsNeedingAttention.length }
      });

      setBulkResults({ success: successCount, failed: failCount });
      setTimeout(() => setBulkResults(null), 5000);
      refreshTenants();

    } catch (error) {
      logger.error('Bulk request failed', error);
      showAlert({
        type: 'error',
        title: 'Bulk Request Failed',
        message: 'Failed to send bulk COI requests.',
        details: error.message
      });
    } finally {
      setBulkRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Property Selector for Tenants */}
      {properties.length > 0 && (
        <div className="flex items-center justify-between">
          <PropertySelector
            properties={properties}
            selectedProperty={selectedProperty}
            onSelectProperty={onSelectProperty}
            loading={loadingProperties}
          />
          {selectedProperty && (
            <p className="text-sm text-gray-500">
              Showing tenants for <span className="font-medium text-gray-700">{selectedProperty.name}</span>
            </p>
          )}
        </div>
      )}

      {/* Stats Cards - Same style as vendors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${statusFilter === 'all' ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-200'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Tenants</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Users className="text-gray-500" size={24} />
            </div>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('expired')}
          className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${statusFilter === 'expired' ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-200'}`}
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
          onClick={() => setStatusFilter('non-compliant')}
          className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${statusFilter === 'non-compliant' ? 'border-orange-500 ring-2 ring-orange-500' : 'border-gray-200'}`}
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
          onClick={() => setStatusFilter('compliant')}
          className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${statusFilter === 'compliant' ? 'border-emerald-500 ring-2 ring-emerald-500' : 'border-gray-200'}`}
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

      {/* Filters - Same style as vendors */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search tenants..."
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

          {/* Add Tenant Button */}
          <button
            onClick={() => { setEditingTenant(null); setShowModal(true); }}
            className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium flex items-center gap-2"
            aria-label="Add new tenant"
          >
            <Plus size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Add Tenant</span>
          </button>

          {/* Bulk Request Button */}
          {tenantsNeedingAttention.length > 0 && (
            <button
              onClick={handleBulkRequest}
              disabled={bulkRequesting}
              className="px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-semibold flex items-center gap-2 disabled:opacity-50 transition-all"
              aria-label={`Send COI requests to ${tenantsNeedingAttention.length} tenants`}
            >
              {bulkRequesting ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : (
                <>
                  <Send size={18} aria-hidden="true" />
                  <span className="hidden sm:inline">Request COIs ({tenantsNeedingAttention.length})</span>
                  <span className="sm:hidden">{tenantsNeedingAttention.length}</span>
                </>
              )}
            </button>
          )}

          {/* Bulk Results Feedback */}
          {bulkResults && (
            <div className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-medium flex items-center gap-2" role="status">
              <CheckCircle size={18} aria-hidden="true" />
              <span>Sent: {bulkResults.success}{bulkResults.failed > 0 && `, Failed: ${bulkResults.failed}`}</span>
            </div>
          )}

          {/* Clear */}
          {(searchQuery || statusFilter !== 'all' || sortBy !== 'name') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSortBy('name');
              }}
              className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl font-medium transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>

        {filteredTenants.length > 0 && (
          <p className="text-sm text-gray-500 mt-4">
            Showing {filteredTenants.length} of {tenants.length} tenants
          </p>
        )}
      </div>

      {/* Tenants List - Card style like vendors */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
            <p className="text-gray-600">Loading tenants...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTenants.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No tenants found'
                    : 'No tenants yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Add your first tenant to start tracking their insurance compliance.'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <button
                    onClick={() => { setEditingTenant(null); setShowModal(true); }}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium inline-flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Tenant
                  </button>
                )}
              </div>
            ) : (
              filteredTenants.map((tenant) => (
                <div key={tenant.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(tenant.insurance_status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                          <h3 className="text-base font-semibold text-gray-900 truncate">{tenant.name}</h3>
                          {getStatusBadge(tenant.insurance_status)}
                        </div>

                        {/* Property & Unit */}
                        {(tenant.property || tenant.unit) && (
                          <p className="text-sm text-gray-500 mb-2 flex items-center gap-1.5">
                            <Building2 size={14} />
                            {tenant.property?.name || 'No property'}
                            {tenant.unit && ` • Unit ${tenant.unit.unit_number}`}
                          </p>
                        )}

                        {/* Issues */}
                        {tenant.compliance_issues && tenant.compliance_issues.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            {tenant.compliance_issues.map((issue, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-sm text-orange-700">
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <span className="break-words">{typeof issue === 'string' ? issue : issue.message}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Coverage Tags */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                          <div className="bg-gray-100 px-2 py-1 rounded-lg">
                            <span className="font-medium">Liability:</span> {formatCurrency(tenant.policy_liability_amount || tenant.required_liability_min)}
                          </div>
                          {tenant.requires_additional_insured && (
                            <div className="bg-gray-100 px-2 py-1 rounded-lg">
                              <span className="font-medium">Add'l Insured:</span> {tenant.has_additional_insured ? 'Yes' : 'Required'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start space-x-2 sm:space-x-0 sm:space-y-2 sm:ml-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {/* Expiration Date */}
                      <div className="flex items-center text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                        <Calendar size={14} className="mr-1.5" />
                        {tenant.policy_expiration_date ? formatDate(tenant.policy_expiration_date) : 'No policy'}
                      </div>

                      {/* Last Contacted */}
                      {tenant.last_contacted_at && (
                        <div className="flex items-center text-xs text-gray-500" title={`Last contacted: ${formatDate(tenant.last_contacted_at)}`}>
                          <Mail size={12} className="mr-1" />
                          <span>Contacted {formatRelativeDate(tenant.last_contacted_at)}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => { setEditingTenant(tenant); setShowModal(true); }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setDeleteConfirm(tenant)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedTenant(tenant)}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold whitespace-nowrap"
                      >
                        View Details
                      </button>

                      {/* Request COI Button */}
                      {(tenant.insurance_status === 'expired' || tenant.insurance_status === 'non-compliant' || tenant.insurance_status === 'expiring' || tenant.insurance_status === 'pending') && tenant.email && (
                        requestSuccess === tenant.id ? (
                          <span className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap flex items-center space-x-1.5">
                            <CheckCircle size={12} />
                            <span>Sent!</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(tenant)}
                            disabled={sendingRequest === tenant.id}
                            className="text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg hover:shadow-md font-semibold whitespace-nowrap flex items-center space-x-1.5 transition-all disabled:opacity-50"
                          >
                            {sendingRequest === tenant.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )}
                            <span className="hidden sm:inline">Request COI</span>
                            <span className="sm:hidden">Request</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <TenantModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTenant(null); }}
        onSave={handleSave}
        tenant={editingTenant}
        properties={properties}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Tenant?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Detail Sidebar */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedTenant(null)}>
          <div
            className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">{selectedTenant.name}</h2>
              <button onClick={() => setSelectedTenant(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedTenant.insurance_status)}
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Contact Information</h3>
                <div className="space-y-2">
                  {selectedTenant.email && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <Mail size={16} className="text-gray-400" />
                      {selectedTenant.email}
                    </p>
                  )}
                  {selectedTenant.phone && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <Phone size={16} className="text-gray-400" />
                      {selectedTenant.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Property & Unit */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Property & Unit</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-900">{selectedTenant.property?.name || 'No property assigned'}</p>
                  {selectedTenant.unit && (
                    <p className="text-sm text-gray-500">Unit {selectedTenant.unit.unit_number}</p>
                  )}
                </div>
              </div>

              {/* Lease Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Lease Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedTenant.lease_start)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">End Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedTenant.lease_end)}</p>
                  </div>
                </div>
              </div>

              {/* Insurance Requirements */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Insurance Requirements</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Min. Liability</span>
                    <span className="font-medium text-gray-900">{formatCurrency(selectedTenant.required_liability_min)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Additional Insured</span>
                    <span className={`font-medium ${selectedTenant.requires_additional_insured ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {selectedTenant.requires_additional_insured ? 'Required' : 'Not Required'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Policy */}
              {selectedTenant.policy_expiration_date && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Current Policy</h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Liability Coverage</span>
                      <span className="font-medium text-gray-900">{formatCurrency(selectedTenant.policy_liability_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedTenant.policy_expiration_date)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Issues */}
              {selectedTenant.compliance_issues && selectedTenant.compliance_issues.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Compliance Issues</h3>
                  <div className="space-y-2">
                    {selectedTenant.compliance_issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                        <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-red-700">{typeof issue === 'string' ? issue : issue.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => copyUploadLink(selectedTenant)}
                  className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  {copySuccess === selectedTenant.id ? 'Link Copied!' : 'Copy Upload Link'}
                </button>
                {selectedTenant.email && (
                  requestSuccess === selectedTenant.id ? (
                    <div className="w-full px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium flex items-center justify-center gap-2">
                      <CheckCircle size={18} />
                      Request Sent!
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(selectedTenant)}
                      disabled={sendingRequest === selectedTenant.id}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {sendingRequest === selectedTenant.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      Send Insurance Request
                    </button>
                  )
                )}
                <button
                  onClick={() => { setEditingTenant(selectedTenant); setShowModal(true); setSelectedTenant(null); }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} />
                  Edit Tenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal {...alertModal} onClose={hideAlert} />
    </div>
  );
}

export default TenantsView;
