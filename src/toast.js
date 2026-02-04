// toast.js
// Toast notification utilities using react-hot-toast

import toast from 'react-hot-toast';

// Success toast
export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    duration: 3000,
    position: 'top-right',
    ...options,
  });
};

// Error toast
export const showError = (message, options = {}) => {
  return toast.error(message, {
    duration: 5000,
    position: 'top-right',
    ...options,
  });
};

// Info toast
export const showInfo = (message, options = {}) => {
  return toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    ...options,
  });
};

// Warning toast
export const showWarning = (message, options = {}) => {
  return toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: '⚠️',
    style: {
      background: '#FEF3C7',
      color: '#92400E',
    },
    ...options,
  });
};

// Loading toast (returns dismiss function)
export const showLoading = (message, options = {}) => {
  return toast.loading(message, {
    position: 'top-right',
    ...options,
  });
};

// Dismiss a specific toast
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

// Dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Promise toast (shows loading, then success/error based on promise result)
export const showPromise = (promise, messages, options = {}) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong',
    },
    {
      position: 'top-right',
      ...options,
    }
  );
};

export default toast;
