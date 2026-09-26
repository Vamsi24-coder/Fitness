import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Route protection for authenticated pages (Dashboard, Stats)
 * Requires logged-in user + completed profile.
 */
export function ProtectedRoute() {
  const { user, profile, loading, profileChecked } = useAuth();

  if (loading || !profileChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-sm font-medium tracking-wide text-slate-400">Authenticating with NutriPulse...</p>
      </div>
    );
  }

  // Not logged in -> go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but has not completed onboarding -> redirect to onboarding
  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

/**
 * Route protection for Onboarding page
 * Requires logged-in user, but NO existing profile.
 */
export function OnboardingRoute() {
  const { user, profile, loading, profileChecked } = useAuth();

  if (loading || !profileChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-sm font-medium tracking-wide text-slate-400">Checking profile status...</p>
      </div>
    );
  }

  // Not logged in -> go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Already has profile -> redirect straight to dashboard
  if (profile) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * Route protection for Login page
 * If already logged in, redirect to Dashboard or Onboarding
 */
export function PublicOnlyRoute() {
  const { user, profile, loading, profileChecked } = useAuth();

  if (loading || !profileChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
      </div>
    );
  }

  if (user) {
    return profile ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
