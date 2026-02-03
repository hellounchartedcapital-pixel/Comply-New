import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import logger from './logger';

const PLAN_LIMITS = {
  free: 10,
  starter: 25,
  professional: 100,
  enterprise: 500,
};

const PLAN_FEATURES = {
  free: {
    name: 'Free',
    price: 0,
    vendors: 10,
    properties: 1,
    autoFollowUp: false,
    prioritySupport: false,
  },
  starter: {
    name: 'Starter',
    price: 79,
    vendors: 25,
    properties: 3,
    autoFollowUp: true,
    prioritySupport: false,
  },
  professional: {
    name: 'Professional',
    price: 149,
    vendors: 100,
    properties: 10,
    autoFollowUp: true,
    prioritySupport: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    vendors: 500,
    properties: 'Unlimited',
    autoFollowUp: true,
    prioritySupport: true,
  },
};

export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubscription(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Default to free plan if no subscription found
      setSubscription(data || {
        plan: 'free',
        status: 'active',
        vendor_limit: PLAN_LIMITS.free,
      });
    } catch (err) {
      logger.error('Error loading subscription', err);
      setError(err.message);
      // Default to free on error
      setSubscription({
        plan: 'free',
        status: 'active',
        vendor_limit: PLAN_LIMITS.free,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Check if user can add more vendors
  const canAddVendor = useCallback((currentVendorCount) => {
    if (!subscription) return false;
    return currentVendorCount < subscription.vendor_limit;
  }, [subscription]);

  // Get remaining vendor slots
  const getRemainingVendors = useCallback((currentVendorCount) => {
    if (!subscription) return 0;
    return Math.max(0, subscription.vendor_limit - currentVendorCount);
  }, [subscription]);

  // Check if user is on free plan
  const isFreePlan = subscription?.plan === 'free';

  // Check if subscription is active
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  // Check if user has access to a feature
  const hasFeature = useCallback((feature) => {
    if (!subscription) return false;
    const planFeatures = PLAN_FEATURES[subscription.plan];
    return planFeatures?.[feature] || false;
  }, [subscription]);

  // Get plan features
  const getPlanFeatures = useCallback((plan) => {
    return PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  }, []);

  // Create checkout session
  const createCheckoutSession = useCallback(async (plan, billingPeriod = 'monthly') => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan, billingPeriod }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('Error creating checkout session', err);
      throw err;
    }
  }, []);

  // Open customer portal
  const openCustomerPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {});

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      logger.error('Error opening customer portal', err);
      throw err;
    }
  }, []);

  return {
    subscription,
    loading,
    error,
    refresh: loadSubscription,
    canAddVendor,
    getRemainingVendors,
    isFreePlan,
    isActive,
    hasFeature,
    getPlanFeatures,
    createCheckoutSession,
    openCustomerPortal,
    PLAN_LIMITS,
    PLAN_FEATURES,
  };
}

export default useSubscription;
