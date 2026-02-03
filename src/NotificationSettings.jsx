import React, { useState, useEffect } from 'react';
import { Bell, Mail, X } from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

export function NotificationSettings({ onClose }) {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    notifyExpiring: true,
    notifyExpired: true,
    notifyNonCompliant: true,
    daysBeforeExpiration: 30,
    notificationEmail: '',
    notificationFrequency: 'daily' // daily, weekly, immediate
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error loading notification settings', error);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          emailNotifications: data.email_notifications ?? true,
          notifyExpiring: data.notify_expiring ?? true,
          notifyExpired: data.notify_expired ?? true,
          notifyNonCompliant: data.notify_non_compliant ?? true,
          daysBeforeExpiration: data.days_before_expiration ?? 30,
          notificationEmail: data.notification_email || user.email || '',
          notificationFrequency: data.notification_frequency || 'daily'
        });
      } else {
        // Set default email from user
        setSettings(prev => ({
          ...prev,
          notificationEmail: user.email || ''
        }));
      }
    } catch (err) {
      logger.error('Error loading notification settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('You must be logged in to save settings');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          email_notifications: settings.emailNotifications,
          notify_expiring: settings.notifyExpiring,
          notify_expired: settings.notifyExpired,
          notify_non_compliant: settings.notifyNonCompliant,
          days_before_expiration: settings.daysBeforeExpiration,
          notification_email: settings.notificationEmail,
          notification_frequency: settings.notificationFrequency,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setMessage('Notification settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      logger.error('Error saving notification settings', err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notification settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Bell className="text-green-600" size={24} />
            <h2 className="text-2xl font-bold">Notification Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          {/* Enable Email Notifications */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="emailNotifications"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
              className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <div className="flex-1">
              <label htmlFor="emailNotifications" className="font-semibold text-gray-900 cursor-pointer">
                Enable Email Notifications
              </label>
              <p className="text-sm text-gray-600">
                Receive email alerts about your vendors' insurance compliance status
              </p>
            </div>
          </div>

          {/* Notification Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail size={16} className="inline mr-2" />
              Notification Email Address
            </label>
            <input
              type="email"
              value={settings.notificationEmail}
              onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="your.email@company.com"
              disabled={!settings.emailNotifications}
            />
          </div>

          {/* Notification Types */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Notify me about:</h3>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="notifyExpiring"
                  checked={settings.notifyExpiring}
                  onChange={(e) => setSettings({ ...settings, notifyExpiring: e.target.checked })}
                  className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  disabled={!settings.emailNotifications}
                />
                <div className="flex-1">
                  <label htmlFor="notifyExpiring" className="font-medium text-gray-900 cursor-pointer">
                    Policies Expiring Soon
                  </label>
                  <p className="text-sm text-gray-600">
                    Get alerts when vendor policies are approaching expiration
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="notifyExpired"
                  checked={settings.notifyExpired}
                  onChange={(e) => setSettings({ ...settings, notifyExpired: e.target.checked })}
                  className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  disabled={!settings.emailNotifications}
                />
                <div className="flex-1">
                  <label htmlFor="notifyExpired" className="font-medium text-gray-900 cursor-pointer">
                    Expired Policies
                  </label>
                  <p className="text-sm text-gray-600">
                    Get alerts when vendor policies have expired
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="notifyNonCompliant"
                  checked={settings.notifyNonCompliant}
                  onChange={(e) => setSettings({ ...settings, notifyNonCompliant: e.target.checked })}
                  className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  disabled={!settings.emailNotifications}
                />
                <div className="flex-1">
                  <label htmlFor="notifyNonCompliant" className="font-medium text-gray-900 cursor-pointer">
                    Non-Compliant Coverage
                  </label>
                  <p className="text-sm text-gray-600">
                    Get alerts when vendors don't meet coverage requirements
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Days Before Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert me when policies expire within
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="90"
                value={settings.daysBeforeExpiration}
                onChange={(e) => setSettings({ ...settings, daysBeforeExpiration: parseInt(e.target.value) || 30 })}
                className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={!settings.emailNotifications}
              />
              <span className="text-gray-700">days</span>
            </div>
          </div>

          {/* Notification Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Frequency
            </label>
            <select
              value={settings.notificationFrequency}
              onChange={(e) => setSettings({ ...settings, notificationFrequency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={!settings.emailNotifications}
            >
              <option value="immediate">Immediate (as soon as issues are detected)</option>
              <option value="daily">Daily Digest (once per day)</option>
              <option value="weekly">Weekly Summary (once per week)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
