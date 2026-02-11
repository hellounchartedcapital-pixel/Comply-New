// BuildingTenantDefaults.jsx - Manage building-level default tenant insurance requirements
import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Save, Loader2, Plus, X, Shield, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { formatCurrency } from './utils/complianceUtils';
import logger from './logger';

const COVERAGE_OPTIONS = [
  { value: 0, label: 'Not Required' },
  { value: 100000, label: '$100,000' },
  { value: 300000, label: '$300,000' },
  { value: 500000, label: '$500,000' },
  { value: 1000000, label: '$1,000,000' },
  { value: 2000000, label: '$2,000,000' },
  { value: 5000000, label: '$5,000,000' },
  { value: 10000000, label: '$10,000,000' },
];

export function BuildingTenantDefaults({ propertyId, propertyName, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    additional: false,
    endorsements: false,
    certificate: false,
  });

  const [formData, setFormData] = useState({
    gl_occurrence_limit: 1000000,
    gl_aggregate_limit: 2000000,
    property_contents_limit: 0,
    umbrella_limit: 0,
    workers_comp_statutory: false,
    workers_comp_employers_liability_limit: 0,
    commercial_auto_csl: 0,
    professional_liability_limit: 0,
    business_interruption_required: false,
    business_interruption_duration: '',
    custom_coverages: [],
    additional_insured_entities: [],
    additional_insured_language: '',
    loss_payee_entities: [],
    waiver_of_subrogation_required: false,
    waiver_of_subrogation_coverages: [],
    certificate_holder_name: '',
    certificate_holder_address: '',
    cancellation_notice_days: 30,
    special_endorsements: [],
  });

  const [newCustomCoverage, setNewCustomCoverage] = useState({ name: '', limit: 0 });
  const [newEndorsement, setNewEndorsement] = useState('');
  const [newAdditionalInsured, setNewAdditionalInsured] = useState('');

  const loadDefaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('building_tenant_defaults')
        .select('*')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        throw fetchError;
      }

      if (data) {
        setFormData({
          gl_occurrence_limit: data.gl_occurrence_limit || 0,
          gl_aggregate_limit: data.gl_aggregate_limit || 0,
          property_contents_limit: data.property_contents_limit || 0,
          umbrella_limit: data.umbrella_limit || 0,
          workers_comp_statutory: data.workers_comp_statutory || false,
          workers_comp_employers_liability_limit: data.workers_comp_employers_liability_limit || 0,
          commercial_auto_csl: data.commercial_auto_csl || 0,
          professional_liability_limit: data.professional_liability_limit || 0,
          business_interruption_required: data.business_interruption_required || false,
          business_interruption_duration: data.business_interruption_duration || '',
          custom_coverages: data.custom_coverages || [],
          additional_insured_entities: data.additional_insured_entities || [],
          additional_insured_language: data.additional_insured_language || '',
          loss_payee_entities: data.loss_payee_entities || [],
          waiver_of_subrogation_required: data.waiver_of_subrogation_required || false,
          waiver_of_subrogation_coverages: data.waiver_of_subrogation_coverages || [],
          certificate_holder_name: data.certificate_holder_name || '',
          certificate_holder_address: data.certificate_holder_address || '',
          cancellation_notice_days: data.cancellation_notice_days || 30,
          special_endorsements: data.special_endorsements || [],
        });
      }
    } catch (err) {
      logger.error('Error loading building tenant defaults', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        user_id: user.id,
        property_id: propertyId,
        ...formData,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('building_tenant_defaults')
        .upsert(payload, { onConflict: 'property_id' });

      if (upsertError) throw upsertError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (onSaved) onSaved();
    } catch (err) {
      logger.error('Error saving building tenant defaults', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addCustomCoverage = () => {
    if (!newCustomCoverage.name.trim()) return;
    setFormData(prev => ({
      ...prev,
      custom_coverages: [...prev.custom_coverages, { name: newCustomCoverage.name.trim(), limit: newCustomCoverage.limit }],
    }));
    setNewCustomCoverage({ name: '', limit: 0 });
  };

  const removeCustomCoverage = (index) => {
    setFormData(prev => ({
      ...prev,
      custom_coverages: prev.custom_coverages.filter((_, i) => i !== index),
    }));
  };

  const addEndorsement = () => {
    if (!newEndorsement.trim()) return;
    setFormData(prev => ({
      ...prev,
      special_endorsements: [...prev.special_endorsements, newEndorsement.trim()],
    }));
    setNewEndorsement('');
  };

  const removeEndorsement = (index) => {
    setFormData(prev => ({
      ...prev,
      special_endorsements: prev.special_endorsements.filter((_, i) => i !== index),
    }));
  };

  const addAdditionalInsured = () => {
    if (!newAdditionalInsured.trim()) return;
    setFormData(prev => ({
      ...prev,
      additional_insured_entities: [...prev.additional_insured_entities, newAdditionalInsured.trim()],
    }));
    setNewAdditionalInsured('');
  };

  const removeAdditionalInsured = (index) => {
    setFormData(prev => ({
      ...prev,
      additional_insured_entities: prev.additional_insured_entities.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-emerald-500" size={24} />
        <span className="ml-2 text-gray-500">Loading defaults...</span>
      </div>
    );
  }

  const SectionHeader = ({ title, section, icon: Icon }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-3 text-left"
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-emerald-600" />
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      {expandedSections[section] ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shield size={20} className="text-emerald-600" />
            Tenant Insurance Defaults
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Set default requirements for new tenants at {propertyName || 'this property'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* General Coverage Requirements */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader title="Standard Coverage Requirements" section="general" icon={Shield} />
        {expandedSections.general && (
          <div className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GL Per Occurrence</label>
                <select
                  value={formData.gl_occurrence_limit}
                  onChange={(e) => setFormData({ ...formData, gl_occurrence_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  {COVERAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GL Aggregate</label>
                <select
                  value={formData.gl_aggregate_limit}
                  onChange={(e) => setFormData({ ...formData, gl_aggregate_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  {COVERAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property / Contents</label>
                <select
                  value={formData.property_contents_limit}
                  onChange={(e) => setFormData({ ...formData, property_contents_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  {COVERAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Umbrella / Excess</label>
                <select
                  value={formData.umbrella_limit}
                  onChange={(e) => setFormData({ ...formData, umbrella_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  {COVERAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commercial Auto (CSL)</label>
                <select
                  value={formData.commercial_auto_csl}
                  onChange={(e) => setFormData({ ...formData, commercial_auto_csl: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  {COVERAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Professional Liability / E&O</label>
                <select
                  value={formData.professional_liability_limit}
                  onChange={(e) => setFormData({ ...formData, professional_liability_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  {COVERAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employers Liability</label>
                <select
                  value={formData.workers_comp_employers_liability_limit}
                  onChange={(e) => setFormData({ ...formData, workers_comp_employers_liability_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  {COVERAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.workers_comp_statutory}
                    onChange={(e) => setFormData({ ...formData, workers_comp_statutory: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Workers' Comp Required (Statutory)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.business_interruption_required}
                  onChange={(e) => setFormData({ ...formData, business_interruption_required: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Business Interruption Required</span>
              </label>
              {formData.business_interruption_required && (
                <input
                  type="text"
                  value={formData.business_interruption_duration}
                  onChange={(e) => setFormData({ ...formData, business_interruption_duration: e.target.value })}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Duration (e.g., 12 months)"
                />
              )}
            </div>

            {/* Custom Coverages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom / Additional Coverages</label>
              {formData.custom_coverages.map((cc, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-700 flex-1">{cc.name}: {formatCurrency(cc.limit)}</span>
                  <button onClick={() => removeCustomCoverage(idx)} className="p-1 hover:bg-red-50 rounded">
                    <X size={14} className="text-red-500" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCustomCoverage.name}
                  onChange={(e) => setNewCustomCoverage({ ...newCustomCoverage, name: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  placeholder="Coverage name"
                />
                <select
                  value={newCustomCoverage.limit}
                  onChange={(e) => setNewCustomCoverage({ ...newCustomCoverage, limit: parseInt(e.target.value) })}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  {COVERAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button onClick={addCustomCoverage} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg" disabled={!newCustomCoverage.name.trim()}>
                  <Plus size={16} className="text-emerald-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Insured & Endorsements */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader title="Additional Insured & Endorsements" section="endorsements" icon={Shield} />
        {expandedSections.endorsements && (
          <div className="px-4 pb-4 space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.waiver_of_subrogation_required}
                  onChange={(e) => setFormData({ ...formData, waiver_of_subrogation_required: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Require Waiver of Subrogation</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Insured Entities</label>
              {formData.additional_insured_entities.map((entity, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-700 flex-1">{entity}</span>
                  <button onClick={() => removeAdditionalInsured(idx)} className="p-1 hover:bg-red-50 rounded">
                    <X size={14} className="text-red-500" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAdditionalInsured}
                  onChange={(e) => setNewAdditionalInsured(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  placeholder="Entity name"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAdditionalInsured())}
                />
                <button onClick={addAdditionalInsured} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg" disabled={!newAdditionalInsured.trim()}>
                  <Plus size={16} className="text-emerald-600" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Insured Language Required</label>
              <textarea
                value={formData.additional_insured_language}
                onChange={(e) => setFormData({ ...formData, additional_insured_language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="Specific language required on the certificate..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Endorsements</label>
              {formData.special_endorsements.map((end, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-700 flex-1">{end}</span>
                  <button onClick={() => removeEndorsement(idx)} className="p-1 hover:bg-red-50 rounded">
                    <X size={14} className="text-red-500" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newEndorsement}
                  onChange={(e) => setNewEndorsement(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  placeholder="Endorsement description"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEndorsement())}
                />
                <button onClick={addEndorsement} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg" disabled={!newEndorsement.trim()}>
                  <Plus size={16} className="text-emerald-600" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Notice (Days)</label>
              <input
                type="number"
                value={formData.cancellation_notice_days}
                onChange={(e) => setFormData({ ...formData, cancellation_notice_days: parseInt(e.target.value) || 30 })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                min={0}
              />
            </div>
          </div>
        )}
      </div>

      {/* Certificate Holder */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader title="Certificate Holder Information" section="certificate" icon={Building2} />
        {expandedSections.certificate && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Holder Name</label>
              <input
                type="text"
                value={formData.certificate_holder_name}
                onChange={(e) => setFormData({ ...formData, certificate_holder_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="Property Management Co, LLC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Holder Address</label>
              <textarea
                value={formData.certificate_holder_address}
                onChange={(e) => setFormData({ ...formData, certificate_holder_address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="123 Main St, Suite 100&#10;City, State ZIP"
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle size={16} />
              Saved
            </>
          ) : (
            <>
              <Save size={16} />
              Save Defaults
            </>
          )}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default BuildingTenantDefaults;
