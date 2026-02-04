import React, { useState, useEffect } from 'react';
import { Save, X, CheckCircle, AlertCircle, Info, Mail, Bell, Clock, Building2, ChevronRight } from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

export function Settings({ onClose, onManageProperties, propertyCount = 0 }) {
  const [settings, setSettings] = useState({
    // Company/Account Info
    companyName: '',

    // Upload Link Settings
    uploadTokenExpiryDays: 30, // Days until upload links expire (7-90)

    // Compliance Settings
    expiringThresholdDays: 30, // Days before expiration to mark as "expiring"

    // Auto Follow-Up Settings
    autoFollowUpEnabled: false,
    followUpDays: [30, 14, 7], // Days before expiration to send reminders
    followUpOnExpired: true, // Send follow-up when expired
    followUpOnNonCompliant: true, // Send follow-up when non-compliant
    followUpFrequencyDays: 7 // Minimum days between follow-ups to same vendor
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
          // Upload Link Settings
          uploadTokenExpiryDays: data.upload_token_expiry_days || 30,
          // Compliance Settings
          expiringThresholdDays: data.expiring_threshold_days || 30,
          // Auto Follow-Up Settings
          autoFollowUpEnabled: data.auto_follow_up_enabled || false,
          followUpDays: data.follow_up_days || [30, 14, 7],
          followUpOnExpired: data.follow_up_on_expired !== false,
          followUpOnNonCompliant: data.follow_up_on_non_compliant !== false,
          followUpFrequencyDays: data.follow_up_frequency_days || 7
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
        // Upload Link Settings
        upload_token_expiry_days: settings.uploadTokenExpiryDays,
        // Compliance Settings
        expiring_threshold_days: settings.expiringThresholdDays,
        // Auto Follow-Up Settings
        auto_follow_up_enabled: settings.autoFollowUpEnabled,
        follow_up_days: settings.followUpDays,
        follow_up_on_expired: settings.followUpOnExpired,
        follow_up_on_non_compliant: settings.followUpOnNonCompliant,
        follow_up_frequency_days: settings.followUpFrequencyDays
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
              className="w-full p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-between transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">Manage Properties</h4>
                  <p className="text-sm text-gray-500">
                    {propertyCount === 0
                      ? 'Add your first property to set vendor requirements'
                      : `${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} configured`}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-start space-x-2">
              <Info size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">
                Vendor insurance requirements are managed per-property. Tenant requirements are extracted from their leases.
              </p>
            </div>
          </div>

          {/* Upload Link Settings Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">COI Request Links</h3>
                <p className="text-sm text-gray-500">Settings for when you request updated COIs from vendors or tenants</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">Link Expiration</h4>
                <p className="text-sm text-gray-500">How long COI request links remain valid</p>
              </div>
              <select
                value={settings.uploadTokenExpiryDays}
                onChange={(e) => setSettings({...settings, uploadTokenExpiryDays: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days (default)</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                When you request an updated COI, the recipient will have this many days to upload before the link expires.
              </p>
            </div>
          </div>

          {/* Compliance Settings Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Compliance Thresholds</h3>
                <p className="text-sm text-gray-500">Configure when vendors and tenants are marked as "expiring"</p>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">Expiring Warning Threshold</h4>
                <p className="text-sm text-gray-500">How many days before expiration should certificates be marked as "expiring"?</p>
              </div>
              <select
                value={settings.expiringThresholdDays}
                onChange={(e) => setSettings({...settings, expiringThresholdDays: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={14}>14 days</option>
                <option value={30}>30 days (default)</option>
                <option value={45}>45 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Vendors and tenants with certificates expiring within this window will show an "Expiring" status.
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
                <h3 className="text-lg font-semibold text-gray-900">Automated Follow-Ups</h3>
                <p className="text-sm text-gray-500">Automatically contact vendors and tenants about compliance issues</p>
              </div>
            </div>

            {/* Enable Auto Follow-Up */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Enable Automated Follow-Ups</h4>
                  <p className="text-sm text-gray-500">Send automatic emails to vendors and tenants with compliance issues</p>
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
                  <p className="text-sm text-gray-500 mb-3">Minimum days between emails to the same recipient:</p>
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

                {/* Info about emails */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2">
                  <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Follow-ups are only sent to vendors and tenants with an email address on file.
                  </p>
                </div>
              </div>
            )}
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
