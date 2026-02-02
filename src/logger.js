// Production-safe logging utility
// In production, logs are suppressed unless explicitly enabled
// Can be extended to send errors to external services like Sentry

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
   * In production, these could be sent to an error tracking service
   */
  error: (message, error = null, context = {}) => {
    if (isDev || isDebugEnabled) {
      console.error('[ERROR]', message, error, context);
    }

    // In production, send to error tracking service
    if (!isDev && error) {
      // TODO: Integrate with Sentry or similar
      // Example:
      // Sentry.captureException(error, { extra: { message, ...context } });
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
   * Can be extended to send to analytics services
   */
  track: (eventName, properties = {}) => {
    if (isDev) {
      console.log('[TRACK]', eventName, properties);
    }

    // In production, send to analytics
    // Example:
    // analytics.track(eventName, properties);
  }
};

export default logger;
