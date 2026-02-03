/**
 * Shared utilities for COI compliance calculations
 * Consolidates duplicated logic from useVendors.js, VendorUploadPortal.jsx, etc.
 */

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Parse a date string (YYYY-MM-DD) to a local date object
 * Avoids timezone issues by creating date in local timezone
 */
export function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month - 1, day);
}

/**
 * Format a date for display (e.g., "Jan 15, 2024")
 * Handles YYYY-MM-DD strings without timezone shift
 */
export function formatDate(date) {
  if (!date) return 'N/A';

  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    // Parse YYYY-MM-DD format without timezone shift
    d = parseLocalDate(date.substring(0, 10));
  } else {
    d = new Date(date);
  }

  if (!d || isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a date as relative time (e.g., "2 days ago", "3 weeks ago")
 */
export function formatRelativeDate(date) {
  if (!date) return '';
  const now = new Date();
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Get days until a date (negative if in the past)
 */
export function getDaysUntil(date) {
  if (!date) return null;
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetDate = date instanceof Date ? date : parseLocalDate(date);
  if (!targetDate) return null;
  return Math.floor((targetDate - todayLocal) / (1000 * 60 * 60 * 24));
}

// ============================================
// CURRENCY UTILITIES
// ============================================

/**
 * Format a number as currency (e.g., "$1,000,000")
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

// ============================================
// ISSUE NORMALIZATION
// ============================================

/**
 * Normalize issues array to consistent format { type, message }
 */
export function normalizeIssues(issues) {
  if (!issues || !Array.isArray(issues)) return [];

  return issues.map(issue => {
    if (typeof issue === 'string') {
      // Convert string to object format
      const isCritical =
        issue.toLowerCase().includes('expired') ||
        issue.toLowerCase().includes('missing') ||
        issue.toLowerCase().includes('below') ||
        issue.toLowerCase().includes('required');
      return { type: isCritical ? 'critical' : 'warning', message: issue };
    }
    // Already an object, ensure it has required properties
    return {
      type: issue.type || 'warning',
      message: issue.message || issue.description || String(issue)
    };
  });
}

// ============================================
// COVERAGE EXPIRATION CHECKING
// ============================================

/**
 * Check if a coverage is expired or expiring soon
 * Returns { expired: boolean, expiringSoon: boolean, daysUntil: number|null }
 */
export function checkCoverageExpiration(coverage, expiringThresholdDays = 30) {
  if (!coverage || !coverage.expirationDate) {
    return { expired: false, expiringSoon: false, daysUntil: null };
  }

  const daysUntil = getDaysUntil(coverage.expirationDate);
  if (daysUntil === null) {
    return { expired: false, expiringSoon: false, daysUntil: null };
  }

  return {
    expired: daysUntil < 0,
    expiringSoon: daysUntil >= 0 && daysUntil <= expiringThresholdDays,
    daysUntil
  };
}

/**
 * Check all coverages and return overall expiration status
 */
export function checkAllCoveragesExpiration(coverage, additionalCoverages = [], thresholdDays = 30) {
  let hasExpired = false;
  let hasExpiringSoon = false;
  const expirationDetails = {};

  // Standard coverage types
  const coverageTypes = ['generalLiability', 'autoLiability', 'workersComp', 'employersLiability'];

  coverageTypes.forEach(type => {
    if (coverage?.[type]) {
      const result = checkCoverageExpiration(coverage[type], thresholdDays);
      expirationDetails[type] = result;
      if (result.expired) hasExpired = true;
      if (result.expiringSoon) hasExpiringSoon = true;
    }
  });

  // Additional coverages
  if (Array.isArray(additionalCoverages)) {
    additionalCoverages.forEach((cov, index) => {
      const result = checkCoverageExpiration(cov, thresholdDays);
      expirationDetails[`additional_${index}`] = result;
      if (result.expired) hasExpired = true;
      if (result.expiringSoon) hasExpiringSoon = true;
    });
  }

  return { hasExpired, hasExpiringSoon, expirationDetails };
}

// ============================================
// VENDOR STATUS CALCULATION
// ============================================

/**
 * Determine vendor compliance status based on coverage and issues
 * @param {object} vendorData - The vendor data object
 * @param {number} expiringThresholdDays - Days before expiration to mark as "expiring" (default: 30)
 */
export function determineVendorStatus(vendorData, expiringThresholdDays = 30) {
  const coverage = vendorData.coverage || {};
  const additionalCoverages = vendorData.additional_coverages || vendorData.additionalCoverages || [];

  // Check for expired coverages
  const { hasExpired, hasExpiringSoon } = checkAllCoveragesExpiration(coverage, additionalCoverages, expiringThresholdDays);

  if (hasExpired) return 'expired';
  if (hasExpiringSoon) return 'expiring';

  // Check compliance issues
  const issues = vendorData.issues || [];
  if (issues.length > 0) {
    return 'non-compliant';
  }

  return 'compliant';
}

/**
 * Recalculate vendor status based on current date and update coverage flags
 * Returns updated vendor object with recalculated status
 * @param {object} vendor - The vendor object
 * @param {number} expiringThresholdDays - Days before expiration to mark as "expiring" (default: 30)
 */
export function recalculateVendorStatus(vendor, expiringThresholdDays = 30) {
  const updatedVendor = { ...vendor };

  // Update coverage expiration flags
  if (updatedVendor.coverage) {
    const coverageTypes = ['generalLiability', 'autoLiability', 'workersComp', 'employersLiability'];
    coverageTypes.forEach(type => {
      if (updatedVendor.coverage[type]) {
        const result = checkCoverageExpiration(updatedVendor.coverage[type], expiringThresholdDays);
        updatedVendor.coverage[type] = {
          ...updatedVendor.coverage[type],
          expired: result.expired,
          expiringSoon: result.expiringSoon
        };
      }
    });
  }

  // Update additional coverages flags
  if (Array.isArray(updatedVendor.additional_coverages)) {
    updatedVendor.additional_coverages = updatedVendor.additional_coverages.map(cov => {
      const result = checkCoverageExpiration(cov, expiringThresholdDays);
      return { ...cov, expired: result.expired, expiringSoon: result.expiringSoon };
    });
  }

  // Normalize issues
  updatedVendor.issues = normalizeIssues(updatedVendor.issues);

  // Determine new status based on current state
  // Always update to the accurate status (allows both worsening AND improvement)
  updatedVendor.status = determineVendorStatus(updatedVendor, expiringThresholdDays);

  return updatedVendor;
}

// ============================================
// TENANT STATUS CALCULATION
// ============================================

/**
 * Determine tenant insurance status based on policy and requirements
 * @param {object} tenant - The tenant object
 * @param {number} expiringThresholdDays - Days before expiration to mark as "expiring" (default: 30)
 */
export function determineTenantStatus(tenant, expiringThresholdDays = 30) {
  // Check if policy exists
  if (!tenant.policy_expiration_date) {
    return 'pending';
  }

  // Check expiration
  const daysUntil = getDaysUntil(tenant.policy_expiration_date);
  if (daysUntil !== null && daysUntil < 0) {
    return 'expired';
  }
  if (daysUntil !== null && daysUntil <= expiringThresholdDays) {
    return 'expiring';
  }

  // Check compliance issues
  if (tenant.compliance_issues && tenant.compliance_issues.length > 0) {
    return 'non-compliant';
  }

  // Check liability minimum
  if (tenant.required_liability_min && tenant.policy_liability_amount) {
    if (tenant.policy_liability_amount < tenant.required_liability_min) {
      return 'non-compliant';
    }
  }

  // Check additional insured requirement
  if (tenant.requires_additional_insured && !tenant.has_additional_insured) {
    return 'non-compliant';
  }

  return 'compliant';
}

// ============================================
// STATUS DISPLAY HELPERS
// ============================================

/**
 * Get status configuration for display (colors, icons, labels)
 */
export function getStatusConfig(status) {
  const configs = {
    compliant: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      label: 'Compliant',
      icon: 'CheckCircle'
    },
    'non-compliant': {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      label: 'Non-Compliant',
      icon: 'AlertCircle'
    },
    expiring: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      label: 'Expiring Soon',
      icon: 'AlertCircle'
    },
    expired: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      label: 'Expired',
      icon: 'XCircle'
    },
    pending: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500',
      label: 'Pending',
      icon: 'Clock'
    }
  };

  return configs[status] || configs.pending;
}

/**
 * Sort function for status (worst status first)
 */
export function compareByStatus(a, b) {
  const order = { expired: 0, 'non-compliant': 1, expiring: 2, pending: 3, compliant: 4 };
  const statusA = a.status || a.insurance_status || 'pending';
  const statusB = b.status || b.insurance_status || 'pending';
  return (order[statusA] ?? 5) - (order[statusB] ?? 5);
}
