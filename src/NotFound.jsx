// NotFound.jsx
// 404 page for invalid routes

import React from 'react';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Logo } from './Logo';

export function NotFound({ onGoHome }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Logo size="md" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* 404 Graphic */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-gray-200">404</div>
            <div className="relative -mt-16">
              <Search className="w-24 h-24 text-emerald-500 mx-auto opacity-80" />
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            Sorry, the page you're looking for doesn't exist or has been moved.
            This might happen if you followed an outdated link or typed the URL incorrectly.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={20} />
              Go Back
            </button>
            <button
              onClick={onGoHome}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              <Home size={20} />
              Go to Homepage
            </button>
          </div>

          {/* Help Text */}
          <p className="mt-8 text-sm text-gray-500">
            If you believe this is an error, please{' '}
            <a
              href="mailto:support@smartcoi.com"
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              contact support
            </a>
            .
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} SmartCOI. All rights reserved.
      </footer>
    </div>
  );
}

export default NotFound;
