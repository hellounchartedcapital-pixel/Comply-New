import React, { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Users, AlertCircle, CheckCircle, Calendar, DollarSign, BarChart3, XCircle } from 'lucide-react';

export function Analytics({ vendors, onClose }) {
  // Calculate analytics metrics
  const analytics = useMemo(() => {
    const total = vendors.length;
    const compliant = vendors.filter(v => v.status === 'compliant').length;
    const expired = vendors.filter(v => v.status === 'expired').length;
    const expiring = vendors.filter(v => v.status === 'expiring').length;
    const nonCompliant = vendors.filter(v => v.status === 'non-compliant').length;

    const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

    // Calculate average coverage amounts
    const avgGL = vendors.length > 0
      ? Math.round(vendors.reduce((sum, v) => sum + (v.coverage?.generalLiability?.amount || 0), 0) / vendors.length)
      : 0;

    const avgAuto = vendors.length > 0
      ? Math.round(vendors.reduce((sum, v) => sum + (v.coverage?.autoLiability?.amount || 0), 0) / vendors.length)
      : 0;

    // Calculate expiration timeline (next 90 days)
    const today = new Date();
    const expirationTimeline = [];
    for (let i = 0; i < 90; i += 30) {
      const start = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const end = new Date(today.getTime() + (i + 30) * 24 * 60 * 60 * 1000);

      const count = vendors.filter(v => {
        const expDate = new Date(v.expirationDate);
        return expDate >= start && expDate < end;
      }).length;

      expirationTimeline.push({
        label: `${i}-${i+30} days`,
        count
      });
    }

    // Risk score (0-100, lower is better)
    const riskScore = Math.round(
      (expired * 10 + nonCompliant * 7 + expiring * 3) / Math.max(total, 1)
    );

    return {
      total,
      compliant,
      expired,
      expiring,
      nonCompliant,
      complianceRate,
      avgGL,
      avgAuto,
      expirationTimeline,
      riskScore
    };
  }, [vendors]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Status distribution for pie chart
  const statusData = [
    { name: 'Compliant', value: analytics.compliant, color: '#10b981' },
    { name: 'Expiring Soon', value: analytics.expiring, color: '#f59e0b' },
    { name: 'Non-Compliant', value: analytics.nonCompliant, color: '#f97316' },
    { name: 'Expired', value: analytics.expired, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // Calculate pie chart angles
  const total = statusData.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  const pieSegments = statusData.map(item => {
    const percentage = (item.value / total) * 100;
    const startAngle = currentAngle;
    const endAngle = currentAngle + (percentage / 100) * 360;
    currentAngle = endAngle;

    return {
      ...item,
      percentage: Math.round(percentage),
      startAngle,
      endAngle
    };
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full p-4 sm:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <BarChart3 className="text-green-600" size={20} />
            <h2 className="text-xl sm:text-2xl font-bold">Analytics</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Compliance Rate */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 sm:p-6 border border-green-200">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-xs sm:text-sm font-medium text-green-800">Compliance</p>
              <CheckCircle className="text-green-600" size={16} />
            </div>
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <p className="text-2xl sm:text-3xl font-bold text-green-900">{analytics.complianceRate}%</p>
              <p className="text-xs sm:text-sm text-green-600">
                {analytics.compliant}/{analytics.total}
              </p>
            </div>
            <div className="mt-2 sm:mt-3 h-1.5 sm:h-2 bg-green-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all duration-500"
                style={{ width: `${analytics.complianceRate}%` }}
              />
            </div>
          </div>

          {/* Risk Score */}
          <div className={`rounded-lg p-3 sm:p-6 border ${
            analytics.riskScore < 20
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
              : analytics.riskScore < 50
              ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200'
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className={`text-xs sm:text-sm font-medium ${
                analytics.riskScore < 20 ? 'text-green-800'
                : analytics.riskScore < 50 ? 'text-yellow-800'
                : 'text-red-800'
              }`}>Risk Score</p>
              {analytics.riskScore < 50 ? (
                <TrendingDown className={analytics.riskScore < 20 ? 'text-green-600' : 'text-yellow-600'} size={16} />
              ) : (
                <TrendingUp className="text-red-600" size={16} />
              )}
            </div>
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <p className={`text-2xl sm:text-3xl font-bold ${
                analytics.riskScore < 20 ? 'text-green-900'
                : analytics.riskScore < 50 ? 'text-yellow-900'
                : 'text-red-900'
              }`}>{analytics.riskScore}</p>
              <p className={`text-xs sm:text-sm ${
                analytics.riskScore < 20 ? 'text-green-600'
                : analytics.riskScore < 50 ? 'text-yellow-600'
                : 'text-red-600'
              }`}>
                {analytics.riskScore < 20 ? 'Low' : analytics.riskScore < 50 ? 'Medium' : 'High'}
              </p>
            </div>
          </div>

          {/* Issues */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 sm:p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-xs sm:text-sm font-medium text-orange-800">Issues</p>
              <AlertCircle className="text-orange-600" size={16} />
            </div>
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <p className="text-2xl sm:text-3xl font-bold text-orange-900">
                {analytics.expired + analytics.nonCompliant + analytics.expiring}
              </p>
            </div>
            <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
              {analytics.expired > 0 && (
                <p className="text-red-600">• {analytics.expired} expired</p>
              )}
              {analytics.expiring > 0 && (
                <p className="text-yellow-600">• {analytics.expiring} expiring</p>
              )}
              {analytics.nonCompliant > 0 && (
                <p className="text-orange-600">• {analytics.nonCompliant} non-comp</p>
              )}
            </div>
          </div>

          {/* Total Vendors */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 sm:p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-xs sm:text-sm font-medium text-blue-800">Total</p>
              <Users className="text-blue-600" size={16} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-900">{analytics.total}</p>
            <p className="text-xs sm:text-sm text-blue-600 mt-1 sm:mt-2">Active</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Status Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Status Distribution</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center">
              <div className="relative" style={{ width: '150px', height: '150px' }}>
                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                  {pieSegments.map((segment, index) => {
                    const radius = 80;
                    const centerX = 100;
                    const centerY = 100;

                    const startX = centerX + radius * Math.cos((segment.startAngle * Math.PI) / 180);
                    const startY = centerY + radius * Math.sin((segment.startAngle * Math.PI) / 180);
                    const endX = centerX + radius * Math.cos((segment.endAngle * Math.PI) / 180);
                    const endY = centerY + radius * Math.sin((segment.endAngle * Math.PI) / 180);

                    const largeArc = segment.endAngle - segment.startAngle > 180 ? 1 : 0;

                    const pathData = [
                      `M ${centerX} ${centerY}`,
                      `L ${startX} ${startY}`,
                      `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
                      'Z'
                    ].join(' ');

                    return (
                      <path
                        key={index}
                        d={pathData}
                        fill={segment.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{analytics.total}</p>
                    <p className="text-xs text-gray-500">Vendors</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-6 space-y-2">
                {statusData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs sm:text-sm font-medium">{item.name}</span>
                    <span className="text-xs sm:text-sm text-gray-500">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Expiration Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Expiration Timeline (90 Days)</h3>
            <div className="space-y-3 sm:space-y-4">
              {analytics.expirationTimeline.map((period, index) => {
                const maxCount = Math.max(...analytics.expirationTimeline.map(p => p.count), 1);
                const percentage = (period.count / maxCount) * 100;

                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{period.label}</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900">{period.count}</span>
                    </div>
                    <div className="h-6 sm:h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className={`h-full rounded-lg transition-all duration-500 ${
                          index === 0 ? 'bg-red-500' : index === 1 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Average Coverage Amounts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <DollarSign size={20} className="mr-2 text-green-600" />
              Average Coverage Amounts
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">General Liability</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(analytics.avgGL)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full"
                    style={{ width: `${Math.min((analytics.avgGL / 2000000) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Auto Liability</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(analytics.avgAuto)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${Math.min((analytics.avgAuto / 2000000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Recommended Actions</h3>
            <div className="space-y-3">
              {analytics.expired > 0 && (
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      {analytics.expired} expired {analytics.expired === 1 ? 'policy' : 'policies'}
                    </p>
                    <p className="text-xs text-red-700 mt-1">Contact vendors immediately for updated COIs</p>
                  </div>
                </div>
              )}

              {analytics.expiring > 0 && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Calendar className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      {analytics.expiring} {analytics.expiring === 1 ? 'policy' : 'policies'} expiring soon
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">Send renewal reminders to vendors</p>
                  </div>
                </div>
              )}

              {analytics.nonCompliant > 0 && (
                <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <XCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-orange-900">
                      {analytics.nonCompliant} non-compliant {analytics.nonCompliant === 1 ? 'vendor' : 'vendors'}
                    </p>
                    <p className="text-xs text-orange-700 mt-1">Review coverage requirements with vendors</p>
                  </div>
                </div>
              )}

              {analytics.expired === 0 && analytics.expiring === 0 && analytics.nonCompliant === 0 && (
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-green-900">All vendors compliant!</p>
                    <p className="text-xs text-green-700 mt-1">No action required at this time</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
