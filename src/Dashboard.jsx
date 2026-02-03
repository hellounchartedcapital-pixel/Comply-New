// Dashboard.jsx - Unified compliance dashboard for vendors and tenants
import React, { useMemo } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, Clock,
  FileText, Users, ChevronRight, TrendingUp, Upload, Plus, Sparkles
} from 'lucide-react';
import { formatDate } from './utils/complianceUtils';
import { PropertySelector } from './PropertySelector';

export function Dashboard({
  vendors = [],
  tenants = [],
  properties = [],
  selectedProperty,
  onSelectProperty,
  loadingProperties = false,
  onViewVendors,
  onViewTenants,
  onSelectVendor,
  onSelectTenant,
  onUploadCOI,
  onAddTenant
}) {
  // Combined stats
  const combinedStats = useMemo(() => {
    const vendorStats = {
      total: vendors.length,
      compliant: vendors.filter(v => v.status === 'compliant').length,
      nonCompliant: vendors.filter(v => v.status === 'non-compliant').length,
      expiring: vendors.filter(v => v.status === 'expiring').length,
      expired: vendors.filter(v => v.status === 'expired').length,
    };

    const tenantStats = {
      total: tenants.length,
      compliant: tenants.filter(t => t.insurance_status === 'compliant').length,
      nonCompliant: tenants.filter(t => t.insurance_status === 'non-compliant').length,
      expiring: tenants.filter(t => t.insurance_status === 'expiring').length,
      expired: tenants.filter(t => t.insurance_status === 'expired').length,
      pending: tenants.filter(t => t.insurance_status === 'pending').length,
    };

    return {
      total: vendorStats.total + tenantStats.total,
      compliant: vendorStats.compliant + tenantStats.compliant,
      nonCompliant: vendorStats.nonCompliant + tenantStats.nonCompliant,
      expiring: vendorStats.expiring + tenantStats.expiring,
      expired: vendorStats.expired + tenantStats.expired,
      pending: tenantStats.pending,
      vendors: vendorStats,
      tenants: tenantStats
    };
  }, [vendors, tenants]);

  // Items needing attention (expired + non-compliant + expiring)
  const needsAttention = useMemo(() => {
    const items = [];

    // Add vendors needing attention
    vendors.forEach(v => {
      if (['expired', 'non-compliant', 'expiring'].includes(v.status)) {
        const today = new Date();
        const expDate = v.expirationDate ? new Date(v.expirationDate) : null;
        const daysUntil = expDate ? Math.floor((expDate - today) / (1000 * 60 * 60 * 24)) : null;

        items.push({
          id: v.id,
          type: 'vendor',
          name: v.name,
          status: v.status,
          expirationDate: v.expirationDate,
          daysUntil,
          issues: v.issues || [],
          data: v
        });
      }
    });

    // Add tenants needing attention
    tenants.forEach(t => {
      if (['expired', 'non-compliant', 'expiring'].includes(t.insurance_status)) {
        const today = new Date();
        const expDate = t.policy_expiration_date ? new Date(t.policy_expiration_date) : null;
        const daysUntil = expDate ? Math.floor((expDate - today) / (1000 * 60 * 60 * 24)) : null;

        items.push({
          id: t.id,
          type: 'tenant',
          name: t.name,
          status: t.insurance_status,
          expirationDate: t.policy_expiration_date,
          daysUntil,
          property: t.property?.name,
          unit: t.unit?.unit_number,
          issues: t.compliance_issues || [],
          data: t
        });
      }
    });

    // Sort by urgency: expired first, then by days until expiration
    items.sort((a, b) => {
      const statusOrder = { expired: 0, 'non-compliant': 1, expiring: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (a.daysUntil === null) return 1;
      if (b.daysUntil === null) return -1;
      return a.daysUntil - b.daysUntil;
    });

    return items;
  }, [vendors, tenants]);

  // Upcoming expirations (next 30 days)
  const upcomingExpirations = useMemo(() => {
    const items = [];
    const today = new Date();

    vendors.forEach(v => {
      if (!v.expirationDate) return;
      const expDate = new Date(v.expirationDate);
      const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 30) {
        items.push({
          id: v.id,
          type: 'vendor',
          name: v.name,
          expirationDate: v.expirationDate,
          daysUntil,
          data: v
        });
      }
    });

    tenants.forEach(t => {
      if (!t.policy_expiration_date) return;
      const expDate = new Date(t.policy_expiration_date);
      const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 30) {
        items.push({
          id: t.id,
          type: 'tenant',
          name: t.name,
          expirationDate: t.policy_expiration_date,
          daysUntil,
          property: t.property?.name,
          unit: t.unit?.unit_number,
          data: t
        });
      }
    });

    items.sort((a, b) => a.daysUntil - b.daysUntil);
    return items.slice(0, 8);
  }, [vendors, tenants]);

  const compliancePercent = combinedStats.total > 0
    ? Math.round((combinedStats.compliant / combinedStats.total) * 100)
    : 0;

  const handleItemClick = (item) => {
    if (item.type === 'vendor' && onSelectVendor) {
      onSelectVendor(item.data);
    } else if (item.type === 'tenant' && onSelectTenant) {
      onSelectTenant(item.data);
    }
  };

  return (
    <div className="space-y-6" role="main" aria-label="Compliance Dashboard">
      {/* Property Selector */}
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
              Showing data for <span className="font-medium text-gray-700">{selectedProperty.name}</span>
            </p>
          )}
        </div>
      )}

      {/* Empty State - Show when no vendors AND no tenants */}
      {combinedStats.total === 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to SmartCOI!</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get started by uploading your first Certificate of Insurance or adding a tenant.
            SmartCOI will automatically track compliance and send reminders.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onUploadCOI && (
              <button
                onClick={onUploadCOI}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-semibold transition-colors"
              >
                <Upload size={20} />
                Upload COI
              </button>
            )}
            {onAddTenant && (
              <button
                onClick={onAddTenant}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
              >
                <Plus size={20} />
                Add Tenant
              </button>
            )}
          </div>
        </div>
      )}

      {/* Combined Stats Row */}
      <section aria-label="Compliance Statistics">
        <h2 className="sr-only">Compliance Statistics Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" role="list">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5" role="listitem" aria-label={`Total tracked: ${combinedStats.total}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Tracked</p>
                <p className="text-3xl font-bold text-gray-900 mt-1" aria-live="polite">{combinedStats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                <TrendingUp className="text-gray-500" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 status-compliant" role="listitem" aria-label={`Compliant: ${combinedStats.compliant}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Compliant</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1" aria-live="polite">{combinedStats.compliant}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                <CheckCircle className="text-emerald-500" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 status-expired" role="listitem" aria-label={`Expired: ${combinedStats.expired}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Expired</p>
                <p className="text-3xl font-bold text-red-600 mt-1" aria-live="polite">{combinedStats.expired}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                <XCircle className="text-red-500" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 status-non-compliant" role="listitem" aria-label={`Non-compliant: ${combinedStats.nonCompliant}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Non-Compliant</p>
                <p className="text-3xl font-bold text-orange-600 mt-1" aria-live="polite">{combinedStats.nonCompliant}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                <AlertCircle className="text-orange-500" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 status-expiring" role="listitem" aria-label={`Expiring soon: ${combinedStats.expiring}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Expiring Soon</p>
                <p className="text-3xl font-bold text-amber-600 mt-1" aria-live="polite">{combinedStats.expiring}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                <Clock className="text-amber-500" size={24} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Combined Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Overall Compliance</h3>
          <div className="flex items-center justify-center">
            <div className="relative">
              {/* SVG Pie Chart */}
              <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                {combinedStats.total === 0 ? (
                  <circle cx="90" cy="90" r="70" fill="none" stroke="#e5e7eb" strokeWidth="24" />
                ) : (
                  <>
                    {/* Compliant slice (green) */}
                    <circle
                      cx="90" cy="90" r="70"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="24"
                      strokeDasharray={`${(combinedStats.compliant / combinedStats.total) * 439.82} 439.82`}
                      strokeDashoffset="0"
                    />
                    {/* Non-compliant slice (orange) */}
                    <circle
                      cx="90" cy="90" r="70"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="24"
                      strokeDasharray={`${(combinedStats.nonCompliant / combinedStats.total) * 439.82} 439.82`}
                      strokeDashoffset={`${-(combinedStats.compliant / combinedStats.total) * 439.82}`}
                    />
                    {/* Expired slice (red) */}
                    <circle
                      cx="90" cy="90" r="70"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="24"
                      strokeDasharray={`${(combinedStats.expired / combinedStats.total) * 439.82} 439.82`}
                      strokeDashoffset={`${-((combinedStats.compliant + combinedStats.nonCompliant) / combinedStats.total) * 439.82}`}
                    />
                    {/* Expiring slice (amber) */}
                    <circle
                      cx="90" cy="90" r="70"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="24"
                      strokeDasharray={`${(combinedStats.expiring / combinedStats.total) * 439.82} 439.82`}
                      strokeDashoffset={`${-((combinedStats.compliant + combinedStats.nonCompliant + combinedStats.expired) / combinedStats.total) * 439.82}`}
                    />
                    {/* Pending slice (gray) */}
                    <circle
                      cx="90" cy="90" r="70"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="24"
                      strokeDasharray={`${(combinedStats.pending / combinedStats.total) * 439.82} 439.82`}
                      strokeDashoffset={`${-((combinedStats.compliant + combinedStats.nonCompliant + combinedStats.expired + combinedStats.expiring) / combinedStats.total) * 439.82}`}
                    />
                  </>
                )}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${
                  compliancePercent >= 80 ? 'text-emerald-600' :
                  compliancePercent >= 50 ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {compliancePercent}%
                </span>
                <span className="text-xs text-gray-500 font-medium">Compliant</span>
              </div>
            </div>

            {/* Legend */}
            <div className="ml-6 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-gray-700">{combinedStats.compliant} Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-700">{combinedStats.nonCompliant} Non-Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-700">{combinedStats.expired} Expired</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm text-gray-700">{combinedStats.expiring} Expiring</span>
              </div>
              {combinedStats.pending > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm text-gray-700">{combinedStats.pending} Pending</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Expirations */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Upcoming Expirations</h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">Next 30 Days</span>
          </div>
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {upcomingExpirations.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => handleItemClick(item)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.type === 'vendor' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {item.type === 'vendor'
                      ? <FileText size={16} className="text-blue-600" />
                      : <Users size={16} className="text-purple-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.type === 'vendor' ? 'Vendor' : `Tenant${item.property ? ` • ${item.property}` : ''}`}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  item.daysUntil <= 7 ? 'bg-red-100 text-red-700' :
                  item.daysUntil <= 14 ? 'bg-amber-100 text-amber-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {item.daysUntil === 0 ? 'Today' : item.daysUntil === 1 ? '1 day' : `${item.daysUntil} days`}
                </span>
              </div>
            ))}
            {upcomingExpirations.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
                <p className="text-sm text-gray-500 font-medium">No expirations in the next 30 days</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Needs Attention Section */}
      {needsAttention.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Needs Attention</h3>
            <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">
              {needsAttention.length} {needsAttention.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="space-y-2">
            {needsAttention.slice(0, 10).map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => handleItemClick(item)}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.status === 'expired' ? 'bg-red-100' :
                    item.status === 'non-compliant' ? 'bg-orange-100' : 'bg-amber-100'
                  }`}>
                    {item.status === 'expired'
                      ? <XCircle size={20} className="text-red-600" />
                      : item.status === 'non-compliant'
                        ? <AlertCircle size={20} className="text-orange-600" />
                        : <Clock size={20} className="text-amber-600" />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.type === 'vendor' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {item.type === 'vendor' ? 'Vendor' : 'Tenant'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {item.status === 'expired'
                        ? `Expired ${item.expirationDate ? formatDate(item.expirationDate) : ''}`
                        : item.status === 'non-compliant'
                          ? `${item.issues?.length || 0} compliance ${item.issues?.length === 1 ? 'issue' : 'issues'}`
                          : `Expires ${formatDate(item.expirationDate)}`
                      }
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onViewVendors}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <FileText size={24} className="text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Vendors</h4>
                <p className="text-sm text-gray-500">{combinedStats.vendors.total} vendors tracked</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </button>

        <button
          onClick={onViewTenants}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Users size={24} className="text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Tenants</h4>
                <p className="text-sm text-gray-500">{combinedStats.tenants.total} tenants tracked</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
          </div>
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
