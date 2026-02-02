// Validation utilities for form inputs

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates a phone number (US format, flexible)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-().+]/g, '');
  // Check if it's 10-11 digits (with or without country code)
  return /^1?\d{10}$/.test(cleaned);
}

/**
 * Formats a phone number for display
 * @param {string} phone - The phone number to format
 * @returns {string} - Formatted phone number
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Validates that a string is not empty and meets minimum length
 * @param {string} value - The string to validate
 * @param {number} minLength - Minimum length (default 1)
 * @returns {boolean} - True if valid
 */
export function isValidString(value, minLength = 1) {
  if (!value || typeof value !== 'string') return false;
  return value.trim().length >= minLength;
}

/**
 * Validates a URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a string to prevent XSS
 * @param {string} str - The string to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validates form data and returns errors
 * @param {Object} data - The form data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} - Object with field names as keys and error messages as values
 */
export function validateForm(data, rules) {
  const errors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    if (rule.required && !value) {
      errors[field] = rule.message || `${field} is required`;
      continue;
    }

    if (value) {
      if (rule.type === 'email' && !isValidEmail(value)) {
        errors[field] = rule.message || 'Please enter a valid email address';
      }
      if (rule.type === 'phone' && !isValidPhone(value)) {
        errors[field] = rule.message || 'Please enter a valid phone number';
      }
      if (rule.minLength && value.length < rule.minLength) {
        errors[field] = rule.message || `Must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors[field] = rule.message || `Must be no more than ${rule.maxLength} characters`;
      }
    }
  }

  return errors;
}
