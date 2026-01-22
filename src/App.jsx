// App.jsx
// Main app component with authentication routing

import React, { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { LandingPage } from './LandingPage'
import Login from './Login'
import Signup from './Signup'
import ComplyApp from './ComplyApp'
import { PrivacyPolicy } from './PrivacyPolicy'
import { TermsOfService } from './TermsOfService'
import { Loader2 } from 'lucide-react'

function AppContent() {
  const { user, loading, signOut } = useAuth()
  const [showSignup, setShowSignup] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

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

  // Show Privacy Policy page
  if (showPrivacy) {
    return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
  }

  // Show Terms of Service page
  if (showTerms) {
    return <TermsOfService onBack={() => setShowTerms(false)} />
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
  return <ComplyApp user={user} onSignOut={signOut} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
