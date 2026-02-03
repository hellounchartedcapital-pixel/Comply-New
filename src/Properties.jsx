import React, { useState, useEffect } from 'react';
import { X, Plus, Building2, MapPin, Edit2, Trash2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

export function Properties({ isOpen, onClose, onPropertyChange }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    company_name: '',
    general_liability: 1000000,
    gl_aggregate: 2000000,
    auto_liability: 1000000,
    auto_liability_required: false,
    workers_comp_required: true,
    employers_liability: 500000,
    require_additional_insured: true,
    require_waiver_of_subrogation: false
  });

  useEffect(() => {
    if (isOpen) {
      loadProperties();
    }
  }, [isOpen]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      company_name: '',
      general_liability: 1000000,
      gl_aggregate: 2000000,
      auto_liability: 1000000,
      auto_liability_required: false,
      workers_comp_required: true,
      employers_liability: 500000,
      require_additional_insured: true,
      require_waiver_of_subrogation: false
    });
  };

  const handleAddProperty = async () => {
    if (!formData.name.trim()) {
      setError('Property name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('properties')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          company_name: formData.company_name.trim() || null,
          general_liability: formData.general_liability,
          gl_aggregate: formData.gl_aggregate,
          auto_liability: formData.auto_liability,
          auto_liability_required: formData.auto_liability_required,
          workers_comp_required: formData.workers_comp_required,
          employers_liability: formData.employers_liability,
          require_additional_insured: formData.require_additional_insured,
          require_waiver_of_subrogation: formData.require_waiver_of_subrogation
        })
        .select()
        .single();

      if (error) throw error;

      setProperties([...properties, data]);
      setShowAddForm(false);
      resetForm();
      setSuccess('Property added successfully');
      setTimeout(() => setSuccess(null), 3000);
      if (onPropertyChange) onPropertyChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditProperty = (property) => {
    setEditingProperty(property.id);
    setFormData({
      name: property.name || '',
      address: property.address || '',
      company_name: property.company_name || '',
      general_liability: property.general_liability || 1000000,
      gl_aggregate: property.gl_aggregate || 2000000,
      auto_liability: property.auto_liability || 1000000,
      auto_liability_required: property.auto_liability_required || false,
      workers_comp_required: property.workers_comp_required !== false,
      employers_liability: property.employers_liability || 500000,
      require_additional_insured: property.require_additional_insured !== false,
      require_waiver_of_subrogation: property.require_waiver_of_subrogation || false
    });
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim()) {
      setError('Property name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          company_name: formData.company_name.trim() || null,
          general_liability: formData.general_liability,
          gl_aggregate: formData.gl_aggregate,
          auto_liability: formData.auto_liability,
          auto_liability_required: formData.auto_liability_required,
          workers_comp_required: formData.workers_comp_required,
          employers_liability: formData.employers_liability,
          require_additional_insured: formData.require_additional_insured,
          require_waiver_of_subrogation: formData.require_waiver_of_subrogation
        })
        .eq('id', editingProperty);

      if (error) throw error;

      // Recheck compliance for all vendors assigned to this property
      let recheckFailed = false;
      try {
        await supabase.functions.invoke('recheck-compliance', {
          body: {
            propertyId: editingProperty,
            requirements: {
              general_liability: formData.general_liability,
              auto_liability: formData.auto_liability,
              auto_liability_required: formData.auto_liability_required,
              workers_comp_required: formData.workers_comp_required,
              employers_liability: formData.employers_liability,
              company_name: formData.company_name.trim() || null,
              require_additional_insured: formData.require_additional_insured,
              require_waiver_of_subrogation: formData.require_waiver_of_subrogation
            }
          }
        });
      } catch (recheckErr) {
        logger.error('Error rechecking compliance', recheckErr);
        recheckFailed = true;
        // Don't fail the save if recheck fails
      }

      setProperties(properties.map(p =>
        p.id === editingProperty ? { ...p, ...formData } : p
      ));
      setEditingProperty(null);
      resetForm();

      // Show appropriate message based on whether recheck succeeded
      if (recheckFailed) {
        setSuccess('Property updated. Note: Automatic compliance recheck could not be completed - vendor statuses may need manual review.');
      } else {
        setSuccess('Property updated and vendor compliance rechecked');
      }
      setTimeout(() => setSuccess(null), 5000);
      if (onPropertyChange) onPropertyChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property? Vendors assigned to this property will be unassigned.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      setProperties(properties.filter(p => p.id !== propertyId));
      setSuccess('Property deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
      if (onPropertyChange) onPropertyChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatAmount = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="text-emerald-600" size={24} />
              Manage Properties
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Create properties with custom insurance requirements
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="text-emerald-500 flex-shrink-0" size={18} />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <p className="text-gray-500 mt-2">Loading properties...</p>
            </div>
          ) : (
            <>
              {/* Add Property Button */}
              {!showAddForm && !editingProperty && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-emerald-600"
                >
                  <Plus size={20} />
                  <span className="font-medium">Add New Property</span>
                </button>
              )}

              {/* Add Property Form */}
              {showAddForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Add New Property</h3>
                  <PropertyForm
                    formData={formData}
                    setFormData={setFormData}
                    onSave={handleAddProperty}
                    onCancel={() => { setShowAddForm(false); resetForm(); }}
                    saving={saving}
                    formatAmount={formatAmount}
                  />
                </div>
              )}

              {/* Properties List */}
              {properties.length === 0 && !showAddForm ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No properties yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add your first property to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {properties.map((property) => (
                    <div
                      key={property.id}
                      className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                    >
                      {editingProperty === property.id ? (
                        <PropertyForm
                          formData={formData}
                          setFormData={setFormData}
                          onSave={handleSaveEdit}
                          onCancel={() => { setEditingProperty(null); resetForm(); }}
                          saving={saving}
                          formatAmount={formatAmount}
                        />
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Building2 size={18} className="text-emerald-600" />
                              {property.name}
                            </h4>
                            {property.address && (
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin size={14} />
                                {property.address}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                GL: {formatAmount(property.general_liability)}
                              </span>
                              {property.auto_liability_required && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                  Auto: {formatAmount(property.auto_liability)}
                                </span>
                              )}
                              {property.require_additional_insured && (
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                  Add'l Insured Required
                                </span>
                              )}
                              {property.company_name && (
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                  {property.company_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleEditProperty(property)}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit property"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteProperty(property.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete property"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Each property can have its own insurance requirements and vendors
          </p>
        </div>
      </div>
    </div>
  );
}

// Property Form Component
function PropertyForm({ formData, setFormData, onSave, onCancel, saving, formatAmount }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="123 Main Street"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="123 Main St, City, State 12345"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Insured Name
        </label>
        <input
          type="text"
          value={formData.company_name}
          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="Property Owner LLC"
        />
        <p className="text-xs text-gray-500 mt-1">The entity that should be listed as Additional Insured on COIs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            General Liability (Each Occurrence)
          </label>
          <select
            value={formData.general_liability}
            onChange={(e) => setFormData({ ...formData, general_liability: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value={500000}>$500K</option>
            <option value={1000000}>$1M</option>
            <option value={2000000}>$2M</option>
            <option value={5000000}>$5M</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GL Aggregate
          </label>
          <select
            value={formData.gl_aggregate}
            onChange={(e) => setFormData({ ...formData, gl_aggregate: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value={1000000}>$1M</option>
            <option value={2000000}>$2M</option>
            <option value={4000000}>$4M</option>
            <option value={10000000}>$10M</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Auto Liability
          </label>
          <select
            value={formData.auto_liability}
            onChange={(e) => setFormData({ ...formData, auto_liability: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value={500000}>$500K</option>
            <option value={1000000}>$1M</option>
            <option value={2000000}>$2M</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.auto_liability_required}
            onChange={(e) => setFormData({ ...formData, auto_liability_required: e.target.checked })}
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700">Require Auto Liability</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.workers_comp_required}
            onChange={(e) => setFormData({ ...formData, workers_comp_required: e.target.checked })}
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700">Require Workers Comp</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.require_additional_insured}
            onChange={(e) => setFormData({ ...formData, require_additional_insured: e.target.checked })}
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700">Require Additional Insured</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.require_waiver_of_subrogation}
            onChange={(e) => setFormData({ ...formData, require_waiver_of_subrogation: e.target.checked })}
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700">Require Waiver of Subrogation</span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Property
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default Properties;
