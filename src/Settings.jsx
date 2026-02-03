import React, { useState, useEffect } from 'react';
import { Save, X, CheckCircle, AlertCircle, Info, Mail, Bell, Clock, Building2, Users, Shield, ChevronRight } from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

export function Settings({ onClose, onManageProperties, propertyCount = 0 }) {
  const [settings, setSettings] = useState({
    // Company/Account Info
    companyName: '',

    // Auto Follow-Up Settings
    autoFollowUpEnabled: false,
    followUpDays: [30, 14, 7], // Days before expiration to send reminders
    followUpOnExpired: true, // Send follow-up when expired
    followUpOnNonCompliant: true, // Send follow-up when non-compliant
    followUpFrequencyDays: 7, // Minimum days between follow-ups to same vendor

    // Default Tenant Insurance Requirements
    tenantDefaultLiabilityMin: 100000,
    tenantDefaultAutoLiabilityMin: 0,
    tenantDefaultWorkersComp: false,
    tenantDefaultEmployersLiabilityMin: 0,
    tenantDefaultRequiresAdditionalInsured: true,
    tenantDefaultAdditionalInsuredText: '',
    tenantDefaultCertificateHolderName: '',
    tenantDefaultCertificateHolderAddress: '',
    tenantDefaultCancellationNoticeDays: 30,
    tenantDefaultRequiresDeclarationsPage: true,
    tenantDefaultRequiresEndorsementPages: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          companyName: data.company_name || '',
          // Auto Follow-Up Settings
          autoFollowUpEnabled: data.auto_follow_up_enabled || false,
          followUpDays: data.follow_up_days || [30, 14, 7],
          followUpOnExpired: data.follow_up_on_expired !== false,
          followUpOnNonCompliant: data.follow_up_on_non_compliant !== false,
          followUpFrequencyDays: data.follow_up_frequency_days || 7,
          // Default Tenant Insurance Requirements
          tenantDefaultLiabilityMin: data.tenant_default_liability_min || 100000,
          tenantDefaultAutoLiabilityMin: data.tenant_default_auto_liability_min || 0,
          tenantDefaultWorkersComp: data.tenant_default_workers_comp || false,
          tenantDefaultEmployersLiabilityMin: data.tenant_default_employers_liability_min || 0,
          tenantDefaultRequiresAdditionalInsured: data.tenant_default_requires_additional_insured !== false,
          tenantDefaultAdditionalInsuredText: data.tenant_default_additional_insured_text || '',
          tenantDefaultCertificateHolderName: data.tenant_default_certificate_holder_name || '',
          tenantDefaultCertificateHolderAddress: data.tenant_default_certificate_holder_address || '',
          tenantDefaultCancellationNoticeDays: data.tenant_default_cancellation_notice_days || 30,
          tenantDefaultRequiresDeclarationsPage: data.tenant_default_requires_declarations_page !== false,
          tenantDefaultRequiresEndorsementPages: data.tenant_default_requires_endorsement_pages !== false
        });
      }
    } catch (err) {
      logger.error('Error loading settings', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const settingsData = {
        user_id: user.id,
        company_name: settings.companyName,
        // Auto Follow-Up Settings
        auto_follow_up_enabled: settings.autoFollowUpEnabled,
        follow_up_days: settings.followUpDays,
        follow_up_on_expired: settings.followUpOnExpired,
        follow_up_on_non_compliant: settings.followUpOnNonCompliant,
        follow_up_frequency_days: settings.followUpFrequencyDays,
        // Default Tenant Insurance Requirements
        tenant_default_liability_min: settings.tenantDefaultLiabilityMin,
        tenant_default_auto_liability_min: settings.tenantDefaultAutoLiabilityMin,
        tenant_default_workers_comp: settings.tenantDefaultWorkersComp,
        tenant_default_employers_liability_min: settings.tenantDefaultEmployersLiabilityMin,
        tenant_default_requires_additional_insured: settings.tenantDefaultRequiresAdditionalInsured,
        tenant_default_additional_insured_text: settings.tenantDefaultAdditionalInsuredText,
        tenant_default_certificate_holder_name: settings.tenantDefaultCertificateHolderName,
        tenant_default_certificate_holder_address: settings.tenantDefaultCertificateHolderAddress,
        tenant_default_cancellation_notice_days: settings.tenantDefaultCancellationNoticeDays,
        tenant_default_requires_declarations_page: settings.tenantDefaultRequiresDeclarationsPage,
        tenant_default_requires_endorsement_pages: settings.tenantDefaultRequiresEndorsementPages
      };

      const { error } = await supabase
        .from('settings')
        .upsert(settingsData, { onConflict: 'user_id' });

      if (error) throw error;

      setSaving(false);
      setSaveSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      logger.error('Error saving settings', err);
      setError('Failed to save settings: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6 sm:p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-500 mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Account Settings</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage your account and notification preferences</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Success Message */}
          {saveSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={20} />
              <p className="text-green-800 font-medium">Settings saved successfully!</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Company Info Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
                <p className="text-sm text-gray-500">Your organization details</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">Company Name</h4>
                <p className="text-sm text-gray-500">Used as default for new properties</p>
              </div>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Acme Property Management LLC"
              />
            </div>

            {/* Manage Properties Button */}
            <button
              onClick={() => {
                if (onManageProperties) {
                  onManageProperties();
                }
              }}
              className="w-full p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center justify-between transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">Manage Properties</h4>
                  <p className="text-sm text-gray-500">
                    {propertyCount === 0
                      ? 'Add your first property to set requirements'
                      : `${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} configured`}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-purple-400" />
            </button>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-start space-x-2">
              <Info size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">
                Insurance requirements are managed per-property. Each property can have different coverage requirements.
              </p>
            </div>
          </div>

          {/* Auto Follow-Up Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Automated Vendor Follow-Ups</h3>
                <p className="text-sm text-gray-500">Automatically contact vendors about compliance issues</p>
              </div>
            </div>

            {/* Enable Auto Follow-Up */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Enable Automated Follow-Ups</h4>
                  <p className="text-sm text-gray-500">Send automatic emails to vendors with compliance issues</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoFollowUpEnabled}
                    onChange={(e) => setSettings({...settings, autoFollowUpEnabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {settings.autoFollowUpEnabled && (
              <div className="space-y-4">
                {/* When to Send */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Bell size={18} className="text-gray-600" />
                    <h4 className="font-medium text-gray-900">Expiration Reminders</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Send reminders before certificates expire:</p>
                  <div className="flex flex-wrap gap-2">
                    {[30, 14, 7, 3, 1].map((days) => (
                      <button
                        key={days}
                        onClick={() => {
                          const current = settings.followUpDays || [];
                          if (current.includes(days)) {
                            setSettings({...settings, followUpDays: current.filter(d => d !== days)});
                          } else {
                            setSettings({...settings, followUpDays: [...current, days].sort((a, b) => b - a)});
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          (settings.followUpDays || []).includes(days)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Follow Up Triggers */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Expired Certificates</h4>
                        <p className="text-xs text-gray-500">Contact when COI has expired</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.followUpOnExpired}
                          onChange={(e) => setSettings({...settings, followUpOnExpired: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Non-Compliant Coverage</h4>
                        <p className="text-xs text-gray-500">Contact about coverage gaps</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.followUpOnNonCompliant}
                          onChange={(e) => setSettings({...settings, followUpOnNonCompliant: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Frequency Limit */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock size={18} className="text-gray-600" />
                    <h4 className="font-medium text-gray-900">Follow-Up Frequency</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Minimum days between emails to the same vendor:</p>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={settings.followUpFrequencyDays}
                      onChange={(e) => setSettings({...settings, followUpFrequencyDays: parseInt(e.target.value)})}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-900 min-w-[60px]">
                      {settings.followUpFrequencyDays} days
                    </span>
                  </div>
                </div>

                {/* Info about vendor emails */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2">
                  <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Follow-ups are only sent to vendors with an email address on file. Add vendor emails when uploading COIs to enable automatic follow-ups.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Default Tenant Insurance Requirements Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Default Tenant Insurance Requirements</h3>
                <p className="text-sm text-gray-500">Applied when uploading tenant insurance documents</p>
              </div>
            </div>

            {/* Coverage Requirements */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <Shield size={18} className="text-blue-600" />
                <h4 className="font-medium text-gray-900">Coverage Minimums</h4>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Liability</label>
                  <select
                    value={settings.tenantDefaultLiabilityMin}
                    onChange={(e) => setSettings({...settings, tenantDefaultLiabilityMin: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={50000}>$50,000</option>
                    <option value={100000}>$100,000</option>
                    <option value={200000}>$200,000</option>
                    <option value={300000}>$300,000</option>
                    <option value={500000}>$500,000</option>
                    <option value={1000000}>$1,000,000</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auto Liability</label>
                  <select
                    value={settings.tenantDefaultAutoLiabilityMin}
                    onChange={(e) => setSettings({...settings, tenantDefaultAutoLiabilityMin: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Not Required</option>
                    <option value={100000}>$100,000</option>
                    <option value={300000}>$300,000</option>
                    <option value={500000}>$500,000</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Insured */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Additional Insured Requirement</h4>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.tenantDefaultRequiresAdditionalInsured}
                    onChange={(e) => setSettings({...settings, tenantDefaultRequiresAdditionalInsured: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
              {settings.tenantDefaultRequiresAdditionalInsured && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Insured Entities</label>
                  <textarea
                    value={settings.tenantDefaultAdditionalInsuredText}
                    onChange={(e) => setSettings({...settings, tenantDefaultAdditionalInsuredText: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="A. Property Owner LLC&#10;B. Management Company LLC"
                  />
                  <p className="text-xs text-gray-500 mt-1">List each entity on a separate line</p>
                </div>
              )}
            </div>

            {/* Certificate Holder */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Default Certificate Holder</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={settings.tenantDefaultCertificateHolderName}
                    onChange={(e) => setSettings({...settings, tenantDefaultCertificateHolderName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Property Management LLC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={settings.tenantDefaultCertificateHolderAddress}
                    onChange={(e) => setSettings({...settings, tenantDefaultCertificateHolderAddress: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 123 Main St, City, State 12345"
                  />
                </div>
              </div>
            </div>

            {/* Other Requirements */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Document Requirements</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Cancellation Notice</p>
                    <p className="text-xs text-gray-500">Minimum days notice required</p>
                  </div>
                  <select
                    value={settings.tenantDefaultCancellationNoticeDays}
                    onChange={(e) => setSettings({...settings, tenantDefaultCancellationNoticeDays: parseInt(e.target.value)})}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value={10}>10 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Require Declarations Page</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tenantDefaultRequiresDeclarationsPage}
                      onChange={(e) => setSettings({...settings, tenantDefaultRequiresDeclarationsPage: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Require Endorsement Pages</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tenantDefaultRequiresEndorsementPages}
                      onChange={(e) => setSettings({...settings, tenantDefaultRequiresEndorsementPages: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2 mt-4">
              <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                These defaults are applied when you upload a tenant's insurance. You can adjust requirements for individual tenants if their lease terms differ.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-medium flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
