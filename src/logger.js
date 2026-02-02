// Production-safe logging utility
// In production, logs are suppressed and errors are sent to Sentry

import * as Sentry from '@sentry/react';

const isDev = process.env.NODE_ENV !== 'production';
const isDebugEnabled = process.env.REACT_APP_DEBUG === 'true';

/**
 * Logger utility that only logs in development or when debug is enabled
 */
export const logger = {
  /**
   * Log info messages (only in development)
   */
  info: (...args) => {
    if (isDev || isDebugEnabled) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args) => {
    if (isDev || isDebugEnabled) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log error messages
   * In production, errors are sent to Sentry
   */
  error: (message, error = null, context = {}) => {
    if (isDev || isDebugEnabled) {
      console.error('[ERROR]', message, error, context);
    }

    // In production, send to Sentry
    if (!isDev && process.env.REACT_APP_SENTRY_DSN) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          extra: { message, ...context }
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: { error, ...context }
        });
      }
    }
  },

  /**
   * Log debug messages (only in development with debug enabled)
   */
  debug: (...args) => {
    if (isDev && isDebugEnabled) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Track an event for analytics
   */
  track: (eventName, properties = {}) => {
    if (isDev) {
      console.log('[TRACK]', eventName, properties);
    }
  }
};

export default logger;
