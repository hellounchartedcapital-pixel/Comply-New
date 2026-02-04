// src/AuthContext.js
// Authentication context for managing user state across the app

import React, { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from './supabaseClient'
import logger from './logger'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [emailVerified, setEmailVerified] = useState(false)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        // Check if email is verified
        setEmailVerified(!!session?.user?.email_confirmed_at)
        setLoading(false)
      })
      .catch((error) => {
        // Session retrieval failed - user will need to sign in
        console.warn('Session retrieval failed:', error.message)
        setSession(null)
        setUser(null)
        setEmailVerified(false)
        setLoading(false)
      })

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      // Update email verification status
      setEmailVerified(!!session?.user?.email_confirmed_at)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sign up with email and password
  const signUp = async (email, password, companyName = null) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error

    // If signup successful and we have a company name, create settings record
    if (data.user && companyName) {
      try {
        await supabase.from('settings').upsert({
          user_id: data.user.id,
          company_name: companyName,
          general_liability: 1000000,
          auto_liability: 1000000,
          workers_comp: 'Statutory',
          employers_liability: 500000,
          require_additional_insured: true,
          require_waiver_of_subrogation: false
        }, { onConflict: 'user_id' })
      } catch (settingsError) {
        logger.error('Failed to create settings', settingsError)
        // Don't throw - user is still created
      }
    }

    return data
  }

  // Sign in with email and password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Reset password
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
    return data
  }

  const value = {
    user,
    session,
    loading,
    emailVerified,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
