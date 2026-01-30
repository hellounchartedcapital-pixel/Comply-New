import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, CheckCircle, XCircle, AlertCircle, Clock,
  Mail, Phone, Calendar, Building2, Edit2, Trash2, X, Send,
  ExternalLink, Shield
} from 'lucide-react';
import { useTenants } from './useTenants';
import { supabase } from './supabaseClient';

// Status badge component
function StatusBadge({ status }) {
  const configs = {
    compliant: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, label: 'Compliant' },
    'non-compliant': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Non-Compliant' },
    expiring: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle, label: 'Expiring Soon' },
    expired: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Expired' },
    pending: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock, label: 'Pending' },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

// Tenant status badge
function TenantStatusBadge({ status }) {
  const configs = {
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
    moved_out: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Moved Out' },
    evicted: { bg: 'bg-red-100', text: 'text-red-700', label: 'Evicted' },
  };

  const config = configs[status] || configs.active;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// Add/Edit Tenant Modal
function TenantModal({ isOpen, onClose, onSave, tenant, properties, units }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property_id: '',
    unit_id: '',
    lease_start: '',
    lease_end: '',
    status: 'active',
    // General Liability
    required_liability_min: 100000,
    required_property_damage_min: 0,
    // Business Auto Liability
    required_auto_liability_min: 0,
    // Workers Compensation
    required_workers_comp: false,
    workers_comp_exempt: false,
    // Employer's Liability
    required_employers_liability_min: 0,
    // Additional Insured
    requires_additional_insured: true,
    additional_insured_text: '',
    // Certificate Holder
    certificate_holder_name: '',
    certificate_holder_address: '',
    // Other requirements
    cancellation_notice_days: 30,
    requires_declarations_page: true,
    requires_endorsement_pages: true,
  });
  const [saving, setSaving] = useState(false);
  const [filteredUnits, setFilteredUnits] = useState([]);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        property_id: tenant.property_id || '',
        unit_id: tenant.unit_id || '',
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
        unit_id: '',
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

  useEffect(() => {
    if (formData.property_id) {
      setFilteredUnits(units.filter(u => u.property_id === formData.property_id));
    } else {
      setFilteredUnits([]);
    }
  }, [formData.property_id, units]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving tenant:', err);
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
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value, unit_id: '' })}
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
                    Unit
                  </label>
                  <select
                    value={formData.unit_id}
                    onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    disabled={!formData.property_id}
                  >
                    <option value="">Select unit...</option>
                    {filteredUnits.map(u => (
                      <option key={u.id} value={u.id}>{u.unit_number}</option>
                    ))}
                  </select>
                  {formData.property_id && filteredUnits.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No units found. Add units to this property first.</p>
                  )}
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
                Insurance Requirements (Per Lease)
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
                      <option value={0}>Per Lease</option>
                      <option value={100000}>$100,000</option>
                      <option value={300000}>$300,000</option>
                      <option value={500000}>$500,000</option>
                      <option value={1000000}>$1,000,000</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employer's Liability
                    </label>
                    <select
                      value={formData.required_employers_liability_min}
                      onChange={(e) => setFormData({ ...formData, required_employers_liability_min: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value={0}>Per Lease</option>
                      <option value={100000}>$100,000</option>
                      <option value={500000}>$500,000</option>
                      <option value={1000000}>$1,000,000</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Damage
                    </label>
                    <select
                      value={formData.required_property_damage_min}
                      onChange={(e) => setFormData({ ...formData, required_property_damage_min: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value={0}>Not Required</option>
                      <option value={25000}>$25,000</option>
                      <option value={50000}>$50,000</option>
                      <option value={100000}>$100,000</option>
                    </select>
                  </div>
                </div>

                {/* Workers Compensation */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.required_workers_comp}
                        onChange={(e) => setFormData({ ...formData, required_workers_comp: e.target.checked, workers_comp_exempt: false })}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">Workers' Compensation Required</span>
                    </label>
                    {formData.required_workers_comp && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.workers_comp_exempt}
                          onChange={(e) => setFormData({ ...formData, workers_comp_exempt: e.target.checked })}
                          className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-600">Exemption Allowed</span>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">* Tenant must provide proof of insurance OR proof of exemption</p>
                </div>
              </div>

              {/* Additional Insured */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Additional Insured</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requires_additional_insured}
                      onChange={(e) => setFormData({ ...formData, requires_additional_insured: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Require owner as additional insured</span>
                  </label>
                  {formData.requires_additional_insured && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Insured Entities
                      </label>
                      <textarea
                        value={formData.additional_insured_text}
                        onChange={(e) => setFormData({ ...formData, additional_insured_text: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        placeholder="A. Property Owner LLC&#10;B. Management Company LLC"
                      />
                      <p className="text-xs text-gray-500 mt-1">List each entity on a separate line</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate Holder */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Certificate Holder</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certificate Holder Name
                    </label>
                    <input
                      type="text"
                      value={formData.certificate_holder_name}
                      onChange={(e) => setFormData({ ...formData, certificate_holder_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certificate Holder Address
                    </label>
                    <input
                      type="text"
                      value={formData.certificate_holder_address}
                      onChange={(e) => setFormData({ ...formData, certificate_holder_address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Other Requirements */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Other Requirements</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Cancellation Notice
                    </label>
                    <select
                      value={formData.cancellation_notice_days}
                      onChange={(e) => setFormData({ ...formData, cancellation_notice_days: parseInt(e.target.value) })}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    >
                      <option value={10}>10 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                    </select>
                    <span className="text-sm text-gray-500">minimum notice required</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requires_declarations_page}
                        onChange={(e) => setFormData({ ...formData, requires_declarations_page: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">Require Declarations Page</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requires_endorsement_pages}
                        onChange={(e) => setFormData({ ...formData, requires_endorsement_pages: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">Require Endorsement Pages</span>
                    </label>
                  </div>
                </div>
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
export function TenantsView({ properties }) {
  const { tenants, loading, stats, addTenant, updateTenant, deleteTenant } = useTenants();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);

  // Load units
  useEffect(() => {
    const loadUnits = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('units')
        .select('*')
        .eq('user_id', user.id);

      setUnits(data || []);
    };
    loadUnits();
  }, []);

  // Filter tenants
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = !searchQuery ||
      tenant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.property?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.unit?.unit_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || tenant.insurance_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSave = async (formData) => {
    if (editingTenant) {
      await updateTenant(editingTenant.id, formData);
    } else {
      await addTenant(formData);
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

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Tenants</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-emerald-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.compliant}</p>
              <p className="text-xs text-gray-500">Compliant</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.nonCompliant + stats.expired}</p>
              <p className="text-xs text-gray-500">Non-Compliant</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.expiring}</p>
              <p className="text-xs text-gray-500">Expiring</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenants..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="compliant">Compliant</option>
            <option value="non-compliant">Non-Compliant</option>
            <option value="expiring">Expiring</option>
            <option value="expired">Expired</option>
            <option value="pending">Pending</option>
          </select>
          <button
            onClick={() => { setEditingTenant(null); setShowModal(true); }}
            className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Tenant</span>
          </button>
        </div>
      </div>

      {/* Tenants List */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading tenants...</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {tenants.length === 0 ? 'No tenants yet' : 'No matching tenants'}
          </h3>
          <p className="text-gray-500 mb-4">
            {tenants.length === 0
              ? 'Add your first tenant to start tracking their insurance compliance.'
              : 'Try adjusting your search or filters.'}
          </p>
          {tenants.length === 0 && (
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Property / Unit</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lease</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Insurance Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Policy Expires</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTenant(tenant)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          {tenant.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={12} />
                              {tenant.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">{tenant.property?.name || 'No property'}</p>
                          {tenant.unit && (
                            <p className="text-xs text-gray-500">Unit {tenant.unit.unit_number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {tenant.lease_start && tenant.lease_end ? (
                          <>
                            <p className="text-gray-900">{formatDate(tenant.lease_start)}</p>
                            <p className="text-gray-500">to {formatDate(tenant.lease_end)}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">No lease dates</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tenant.insurance_status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {tenant.policy_expiration_date ? formatDate(tenant.policy_expiration_date) : 'No policy'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => copyUploadLink(tenant)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Copy upload link"
                        >
                          {copySuccess === tenant.id ? (
                            <CheckCircle size={18} className="text-emerald-600" />
                          ) : (
                            <ExternalLink size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => { setEditingTenant(tenant); setShowModal(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit tenant"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(tenant)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete tenant"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <TenantModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTenant(null); }}
        onSave={handleSave}
        tenant={editingTenant}
        properties={properties}
        units={units}
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
                <StatusBadge status={selectedTenant.insurance_status} />
                <TenantStatusBadge status={selectedTenant.status} />
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
                  {selectedTenant.required_property_damage_min > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Property Damage</span>
                      <span className="font-medium text-gray-900">{formatCurrency(selectedTenant.required_property_damage_min)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Additional Insured</span>
                    <span className={`font-medium ${selectedTenant.requires_additional_insured ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {selectedTenant.requires_additional_insured ? 'Required' : 'Not Required'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Policy */}
              {selectedTenant.carrier && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Current Policy</h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carrier</span>
                      <span className="font-medium text-gray-900">{selectedTenant.carrier}</span>
                    </div>
                    {selectedTenant.policy_number && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Policy #</span>
                        <span className="font-medium text-gray-900">{selectedTenant.policy_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Liability Coverage</span>
                      <span className="font-medium text-gray-900">{formatCurrency(selectedTenant.liability_coverage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedTenant.policy_expiration_date)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Issues */}
              {selectedTenant.issues && selectedTenant.issues.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Compliance Issues</h3>
                  <div className="space-y-2">
                    {selectedTenant.issues.map((issue, i) => (
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
                  <button
                    className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    Send Insurance Request
                  </button>
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
    </div>
  );
}

export default TenantsView;
