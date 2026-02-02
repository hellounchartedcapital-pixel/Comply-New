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
import { Loader2 } from 'lucide-react'
import ErrorBoundary from './ErrorBoundary'

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
  const { user, loading, signOut } = useAuth()
  const [showSignup, setShowSignup] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [uploadToken, setUploadToken] = useState(null)
  const [tenantUploadToken, setTenantUploadToken] = useState(null)

  // Check URL for upload token or pricing page on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('upload')
    if (token) {
      setUploadToken(token)
    }
    // Check for tenant upload token
    const tenantToken = params.get('tenant_upload')
    if (tenantToken) {
      setTenantUploadToken(tenantToken)
    }
    // Check if coming back from checkout
    const checkoutResult = params.get('checkout')
    if (checkoutResult) {
      setShowPricing(true)
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

  // User is logged in, show main app
  return <ComplyApp user={user} onSignOut={signOut} onShowPricing={() => setShowPricing(true)} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}
