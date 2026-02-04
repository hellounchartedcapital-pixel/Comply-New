// App.jsx
// Main app component with authentication routing

import React, { useState, useEffect } from 'react'
import * as Sentry from '@sentry/react'
import { AuthProvider, useAuth } from './AuthContext'
import { LandingPage } from './LandingPage'
import Login from './Login'
import Signup from './Signup'
import ComplyApp from './ComplyApp'
import { PrivacyPolicy } from './PrivacyPolicy'
import { TermsOfService } from './TermsOfService'
import { VendorUploadPortal } from './VendorUploadPortal'
import { TenantUploadPortal } from './TenantUploadPortal'
import { Pricing } from './Pricing'
import { NotFound } from './NotFound'
import { EmailVerification } from './EmailVerification'
import { Loader2 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './ErrorBoundary'

// Valid paths for the app (for 404 detection)
const VALID_PATHS = ['/', '/privacy', '/terms', '/pricing'];

// Initialize Sentry for error tracking
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Don't send PII
    sendDefaultPii: false,
  });
}

function AppContent() {
  const { user, loading, signOut, emailVerified } = useAuth()
  const [showSignup, setShowSignup] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [uploadToken, setUploadToken] = useState(null)
  const [tenantUploadToken, setTenantUploadToken] = useState(null)
  const [showNotFound, setShowNotFound] = useState(false)

  // Check URL for upload token or pricing page on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const path = window.location.pathname
    const token = params.get('upload')
    const tenantToken = params.get('tenant_upload')
    const checkoutResult = params.get('checkout')

    // Check for upload tokens first
    if (token) {
      setUploadToken(token)
      return
    }
    if (tenantToken) {
      setTenantUploadToken(tenantToken)
      return
    }
    // Check if coming back from checkout
    if (checkoutResult) {
      setShowPricing(true)
      return
    }

    // Check for invalid paths (404)
    if (path !== '/' && !VALID_PATHS.includes(path) && !params.toString()) {
      setShowNotFound(true)
    }
  }, [])

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show 404 page for invalid routes
  if (showNotFound) {
    return (
      <NotFound
        onGoHome={() => {
          setShowNotFound(false)
          window.history.pushState({}, '', '/')
        }}
      />
    )
  }

  // Show Vendor Upload Portal if upload token is present
  if (uploadToken) {
    return (
      <VendorUploadPortal
        token={uploadToken}
        onBack={() => {
          setUploadToken(null)
          window.history.pushState({}, '', window.location.pathname)
        }}
      />
    )
  }

  // Show Tenant Upload Portal if tenant upload token is present
  if (tenantUploadToken) {
    return (
      <TenantUploadPortal
        token={tenantUploadToken}
        onBack={() => {
          setTenantUploadToken(null)
          window.history.pushState({}, '', window.location.pathname)
        }}
      />
    )
  }

  // Show Privacy Policy page
  if (showPrivacy) {
    return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
  }

  // Show Terms of Service page
  if (showTerms) {
    return <TermsOfService onBack={() => setShowTerms(false)} />
  }

  // Show Pricing page (for both logged in and not logged in users)
  if (showPricing) {
    return (
      <Pricing
        onBack={() => {
          setShowPricing(false)
          // Clean up URL params
          const url = new URL(window.location)
          url.searchParams.delete('checkout')
          window.history.replaceState({}, '', url.pathname)
        }}
        onSignUp={() => {
          setShowPricing(false)
          setShowSignup(true)
          setShowAuth(true)
        }}
        user={user}
      />
    )
  }

  // If not logged in, show Landing Page or Auth screens
  if (!user) {
    // Show landing page unless user clicked Login or Sign Up
    if (!showAuth) {
      return (
        <LandingPage
          onLogin={() => { setShowSignup(false); setShowAuth(true); }}
          onSignUp={() => { setShowSignup(true); setShowAuth(true); }}
          onPrivacy={() => setShowPrivacy(true)}
          onTerms={() => setShowTerms(true)}
          onPricing={() => setShowPricing(true)}
        />
      )
    }

    // Show signup or login based on user choice
    if (showSignup) {
      return <Signup onSwitchToLogin={() => setShowSignup(false)} onBack={() => setShowAuth(false)} />
    }
    return <Login onSwitchToSignup={() => setShowSignup(true)} onBack={() => setShowAuth(false)} />
  }

  // User is logged in but email not verified - show verification page
  if (!emailVerified) {
    return (
      <EmailVerification
        email={user.email}
        onSignOut={signOut}
        onBack={() => {
          signOut()
          setShowAuth(false)
        }}
      />
    )
  }

  // User is logged in and verified, show main app
  return <ComplyApp user={user} onSignOut={signOut} onShowPricing={() => setShowPricing(true)} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            // Default options for all toasts
            duration: 4000,
            style: {
              background: '#fff',
              color: '#363636',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  )
}
