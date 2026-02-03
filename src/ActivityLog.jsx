// ActivityLog.jsx - Global activity log showing all email sends and COI uploads

import React, { useState, useEffect } from 'react';
import { X, Mail, Upload, Clock, FileCheck, Users, Search, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { formatRelativeDate } from './utils/complianceUtils';
import logger from './logger';

export function ActivityLog({ isOpen, onClose }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'emails', 'uploads'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadActivities();
    }
  }, [isOpen]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch vendor activity
      const { data: vendorActivity, error: vendorError } = await supabase
        .from('vendor_activity')
        .select(`
          id,
          vendor_id,
          action,
          details,
          created_at,
          vendors (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (vendorError) {
        logger.error('Error loading vendor activity', vendorError);
      }

      // Fetch tenant activity
      const { data: tenantActivity, error: tenantError } = await supabase
        .from('tenant_activity')
        .select(`
          id,
          tenant_id,
          activity_type,
          description,
          metadata,
          created_at,
          tenants (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (tenantError) {
        logger.error('Error loading tenant activity', tenantError);
      }

      // Combine and normalize activities
      const combined = [
        ...(vendorActivity || []).map(a => ({
          id: a.id,
          type: 'vendor',
          entityId: a.vendor_id,
          entityName: a.vendors?.name || 'Unknown Vendor',
          action: a.action,
          description: a.details?.reason || a.details?.description || '',
          email: a.details?.email,
          createdAt: a.created_at
        })),
        ...(tenantActivity || []).map(a => ({
          id: a.id,
          type: 'tenant',
          entityId: a.tenant_id,
          entityName: a.tenants?.name || 'Unknown Tenant',
          action: a.activity_type,
          description: a.description || '',
          email: a.metadata?.email,
          createdAt: a.created_at
        }))
      ];

      // Sort by date
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setActivities(combined);
    } catch (err) {
      logger.error('Error loading activities', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action) => {
    if (action === 'email_sent' || action === 'coi_request') {
      return <Mail size={16} className="text-blue-500" />;
    }
    if (action === 'coi_uploaded' || action === 'policy_uploaded') {
      return <Upload size={16} className="text-emerald-500" />;
    }
    return <Clock size={16} className="text-gray-400" />;
  };

  const getActivityLabel = (action) => {
    const labels = {
      'email_sent': 'Email Sent',
      'coi_request': 'COI Requested',
      'coi_uploaded': 'COI Uploaded',
      'policy_uploaded': 'Policy Uploaded',
      'created': 'Created',
      'updated': 'Updated',
      'deleted': 'Deleted'
    };
    return labels[action] || action;
  };

  const filteredActivities = activities.filter(a => {
    // Type filter
    if (filter === 'emails' && !['email_sent', 'coi_request'].includes(a.action)) {
      return false;
    }
    if (filter === 'uploads' && !['coi_uploaded', 'policy_uploaded'].includes(a.action)) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        a.entityName.toLowerCase().includes(query) ||
        (a.email && a.email.toLowerCase().includes(query)) ||
        a.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Clock size={24} className="text-emerald-600" />
              <span>Activity Log</span>
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 text-sm"
                />
              </div>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 text-sm font-medium"
            >
              <option value="all">All Activity</option>
              <option value="emails">Emails Only</option>
              <option value="uploads">Uploads Only</option>
            </select>
          </div>
        </div>

        {/* Activity List */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-3" />
              <p className="text-gray-500">Loading activity...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <Clock size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No activity found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery || filter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Activity will appear here when you send emails or upload COIs'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredActivities.map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      {getActivityIcon(activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">
                          {activity.entityName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          activity.type === 'vendor'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {activity.type === 'vendor' ? (
                            <span className="flex items-center space-x-1">
                              <FileCheck size={10} />
                              <span>Vendor</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1">
                              <Users size={10} />
                              <span>Tenant</span>
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{getActivityLabel(activity.action)}</span>
                        {activity.email && (
                          <span className="text-gray-500"> to {activity.email}</span>
                        )}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{activity.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeDate(activity.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Showing {filteredActivities.length} of {activities.length} activities
          </p>
        </div>
      </div>
    </div>
  );
}

export default ActivityLog;
