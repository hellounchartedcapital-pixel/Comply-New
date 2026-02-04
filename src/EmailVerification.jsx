// EmailVerification.jsx
// Page shown when user hasn't verified their email

import React, { useState } from 'react';
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Logo } from './Logo';
import logger from './logger';

export function EmailVerification({ email, onSignOut, onBack }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState(null);

  const handleResendEmail = async () => {
    setResending(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      logger.error('Failed to resend verification email', err);
      setError('Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <Logo size="md" />
        <button
          onClick={onSignOut}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-emerald-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h1>

          {/* Description */}
          <p className="text-gray-600 mb-6">
            We sent a verification link to{' '}
            <span className="font-medium text-gray-900">{email}</span>.
            Please check your inbox and click the link to activate your account.
          </p>

          {/* Status Messages */}
          {resent && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 mb-4">
              <CheckCircle size={20} />
              <span>Verification email sent!</span>
            </div>
          )}

          {error && (
            <div className="text-red-600 mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={resending || resent}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : resent ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Email Sent
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Resend Verification Email
                </>
              )}
            </button>

            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or{' '}
              <a
                href="mailto:support@smartcoi.com"
                className="text-emerald-600 hover:text-emerald-700"
              >
                contact support
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EmailVerification;
