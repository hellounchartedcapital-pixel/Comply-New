/**
 * Accessibility utilities and constants
 * Provides reusable ARIA patterns and keyboard navigation helpers
 */

// ============================================
// KEYBOARD NAVIGATION
// ============================================

/**
 * Handle keyboard navigation for dropdowns and menus
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Object} options - Navigation options
 * @param {Function} options.onEscape - Handler for Escape key
 * @param {Function} options.onEnter - Handler for Enter key
 * @param {Function} options.onArrowDown - Handler for Arrow Down
 * @param {Function} options.onArrowUp - Handler for Arrow Up
 * @param {Function} options.onTab - Handler for Tab key
 */
export function handleKeyboardNavigation(event, options = {}) {
  const { onEscape, onEnter, onArrowDown, onArrowUp, onTab } = options;

  switch (event.key) {
    case 'Escape':
      if (onEscape) {
        event.preventDefault();
        onEscape(event);
      }
      break;
    case 'Enter':
    case ' ':
      if (onEnter) {
        event.preventDefault();
        onEnter(event);
      }
      break;
    case 'ArrowDown':
      if (onArrowDown) {
        event.preventDefault();
        onArrowDown(event);
      }
      break;
    case 'ArrowUp':
      if (onArrowUp) {
        event.preventDefault();
        onArrowUp(event);
      }
      break;
    case 'Tab':
      if (onTab) {
        onTab(event);
      }
      break;
    default:
      break;
  }
}

/**
 * Create a focus trap for modals
 * @param {HTMLElement} container - The modal container element
 * @returns {Object} - Contains activate and deactivate functions
 */
export function createFocusTrap(container) {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  let previouslyFocusedElement = null;

  function getFocusableElements() {
    return container?.querySelectorAll(focusableSelectors) || [];
  }

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return;

    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      previouslyFocusedElement = document.activeElement;
      container?.addEventListener('keydown', handleKeyDown);
      // Focus first focusable element
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    },
    deactivate() {
      container?.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus();
    }
  };
}

// ============================================
// ARIA LIVE REGIONS
// ============================================

/**
 * Announce a message to screen readers
 * @param {string} message - The message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  // Remove after announcement is read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// ============================================
// STATUS ARIA LABELS
// ============================================

/**
 * Get ARIA label for compliance status
 * @param {string} status - The compliance status
 * @returns {string} - Human-readable status description
 */
export function getStatusAriaLabel(status) {
  const labels = {
    compliant: 'Compliant - All requirements met',
    'non-compliant': 'Non-compliant - Missing or insufficient coverage',
    expiring: 'Expiring soon - Certificate expires within 30 days',
    expired: 'Expired - Certificate has expired',
    pending: 'Pending - Awaiting certificate submission'
  };
  return labels[status] || 'Unknown status';
}

// ============================================
// FORM ACCESSIBILITY
// ============================================

/**
 * Generate unique ID for form elements
 * @param {string} prefix - Prefix for the ID
 * @returns {string} - Unique ID
 */
let idCounter = 0;
export function generateId(prefix = 'a11y') {
  return `${prefix}-${++idCounter}`;
}

/**
 * Props for accessible form field
 * @param {string} label - The field label
 * @param {string} error - Error message (if any)
 * @param {string} hint - Hint text (if any)
 * @returns {Object} - ARIA props for the input
 */
export function getFormFieldProps(label, error = null, hint = null) {
  const id = generateId('field');
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return {
    id,
    'aria-label': label,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    errorId,
    hintId
  };
}

// ============================================
// BUTTON ACCESSIBILITY
// ============================================

/**
 * Get props for icon-only button
 * @param {string} label - The button's accessible name
 * @returns {Object} - Props for the button
 */
export function getIconButtonProps(label) {
  return {
    'aria-label': label,
    title: label
  };
}

/**
 * Get props for loading button
 * @param {boolean} isLoading - Whether the button is in loading state
 * @param {string} loadingText - Text to announce when loading
 * @param {string} defaultText - Default button text
 * @returns {Object} - Props for the button
 */
export function getLoadingButtonProps(isLoading, loadingText = 'Loading', defaultText = '') {
  return {
    'aria-busy': isLoading ? 'true' : undefined,
    'aria-label': isLoading ? loadingText : defaultText || undefined,
    disabled: isLoading || undefined
  };
}

// ============================================
// MODAL ACCESSIBILITY
// ============================================

/**
 * Get props for modal dialog
 * @param {string} title - The modal title
 * @param {boolean} isOpen - Whether the modal is open
 * @returns {Object} - Props for the modal
 */
export function getModalProps(title, isOpen) {
  const titleId = generateId('modal-title');
  return {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': titleId,
    'aria-hidden': !isOpen ? 'true' : undefined,
    titleId
  };
}

// ============================================
// TABLE ACCESSIBILITY
// ============================================

/**
 * Get props for data table
 * @param {string} caption - Table caption/description
 * @returns {Object} - Props for the table
 */
export function getTableProps(caption) {
  return {
    role: 'table',
    'aria-label': caption
  };
}

/**
 * Get props for sortable column header
 * @param {string} columnName - The column name
 * @param {string} currentSort - Current sort column
 * @param {string} sortDirection - 'asc' or 'desc'
 * @returns {Object} - Props for the header
 */
export function getSortableHeaderProps(columnName, currentSort, sortDirection = 'asc') {
  const isSorted = currentSort === columnName;
  return {
    role: 'columnheader',
    'aria-sort': isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none',
    tabIndex: 0
  };
}
