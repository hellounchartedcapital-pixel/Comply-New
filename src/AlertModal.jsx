import React, { useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * AlertModal - A reusable modal for displaying messages to users
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to call when closing the modal
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} title - Modal title
 * @param {string} message - Main message to display
 * @param {string} details - Optional additional details (shown smaller)
 * @param {string} buttonText - Text for the close button (default: "OK")
 */
export function AlertModal({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  details,
  buttonText = 'OK'
}) {
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Handle keyboard events and focus management
  useEffect(() => {
    if (isOpen) {
      // Save current focus
      previousFocusRef.current = document.activeElement;
      // Focus the close button when modal opens
      setTimeout(() => closeButtonRef.current?.focus(), 0);

      // Handle Escape key
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else {
      // Restore focus when modal closes
      previousFocusRef.current?.focus();
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeConfig = {
    success: {
      icon: CheckCircle,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      buttonBg: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/25',
      titleColor: 'text-emerald-900',
      borderColor: 'border-emerald-200'
    },
    error: {
      icon: XCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      titleColor: 'text-red-900',
      borderColor: 'border-red-200'
    },
    warning: {
      icon: AlertCircle,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      buttonBg: 'bg-orange-600 hover:bg-orange-700',
      titleColor: 'text-orange-900',
      borderColor: 'border-orange-200'
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      titleColor: 'text-blue-900',
      borderColor: 'border-blue-200'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  const titleId = `alert-modal-title-${type}`;
  const descId = `alert-modal-desc-${type}`;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className={`p-6 border-b ${config.borderColor} bg-gray-50`}>
          <div className="flex items-start space-x-4">
            <div className={`w-12 h-12 ${config.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={config.iconColor} size={24} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id={titleId} className={`text-lg font-bold ${config.titleColor}`}>
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-all flex-shrink-0"
              aria-label="Close dialog"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6" id={descId}>
          <p className="text-gray-700 whitespace-pre-line">
            {message}
          </p>
          {details && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {details}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={`w-full px-4 py-3 ${config.buttonBg} text-white rounded-xl font-semibold transition-all`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * useAlertModal - Hook to manage alert modal state
 *
 * Usage:
 * const { alertModal, showAlert, hideAlert } = useAlertModal();
 *
 * showAlert({
 *   type: 'success',
 *   title: 'Success!',
 *   message: 'Your action was completed.',
 *   details: 'Optional details here'
 * });
 *
 * return (
 *   <>
 *     <AlertModal {...alertModal} onClose={hideAlert} />
 *   </>
 * );
 */
export function useAlertModal() {
  const [alertModal, setAlertModal] = React.useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    details: '',
    buttonText: 'OK'
  });

  const showAlert = ({ type = 'info', title, message, details = '', buttonText = 'OK' }) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message,
      details,
      buttonText
    });
  };

  const hideAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  return { alertModal, showAlert, hideAlert };
}
