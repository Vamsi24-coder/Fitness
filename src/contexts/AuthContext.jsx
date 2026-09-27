import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, signInWithGoogle, signOut, getUserProfile, checkDatabaseSchemaStatus } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  // Check and load profile for the given user ID
  const fetchAndSetProfile = async (userId) => {
    try {
      const p = await getUserProfile(userId);
      setProfile(p);
      setIsSchemaMissing(false);
      setProfileChecked(true);
      return p;
    } catch (err) {
      if (err.isSchemaMissing || err.message?.includes('schema cache')) {
        setIsSchemaMissing(true);
      }
      setProfile(null);
      setProfileChecked(true);
      return null;
    }
  };

  useEffect(() => {
    // 1. Initial schema health check
    checkDatabaseSchemaStatus().then((status) => {
      if (!status.isReady) {
        setIsSchemaMissing(true);
      }
    });

    // 2. Check active session on mount
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;

      if (currentUser) {
        setIsDemoUser(false);
        setUser(currentUser);
        fetchAndSetProfile(currentUser.id).finally(() => setLoading(false));
      } else if (!isDemoUser) {
        setUser(null);
        setProfileChecked(true);
        setLoading(false);
      }
    });

    // 3. Listen to Supabase Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      const currentUser = newSession?.user ?? null;

      if (currentUser) {
        setIsDemoUser(false);
        setUser(currentUser);
        setLoading(true);
        await fetchAndSetProfile(currentUser.id);
        setLoading(false);
      } else if (!isDemoUser) {
        setUser(null);
        setProfile(null);
        setProfileChecked(true);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isDemoUser]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      if (isDemoUser) {
        setIsDemoUser(false);
        setUser(null);
        setProfile(null);
        setProfileChecked(true);
        return;
      }
      await signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      return await fetchAndSetProfile(user.id);
    }
    return null;
  };

  // Demo user helper allowing immediate UI verification without configuring Google OAuth
  const activateDemoMode = (hasExistingProfile = false) => {
    const demoId = '00000000-0000-0000-0000-000000000001';
    const demoUser = {
      id: demoId,
      email: 'alex.fitness@example.com',
      user_metadata: {
        full_name: 'Alex Mercer',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
    };

    setIsDemoUser(true);
    setUser(demoUser);
    setIsSchemaMissing(false);

    if (hasExistingProfile) {
      setProfile({
        id: 'demo-profile-1',
        user_id: demoId,
        gender: 'Male',
        age: 26,
        weight: 74.5,
        works_out: true,
        intensity: 'Intensive',
        duration: 55,
        created_at: new Date().toISOString(),
      });
    } else {
      setProfile(null);
    }
    setProfileChecked(true);
    setLoading(false);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    profileChecked,
    isDemoUser,
    isSchemaMissing,
    loginWithGoogle: handleGoogleLogin,
    logout: handleLogout,
    refreshProfile,
    activateDemoMode,
    setProfile,
    setIsSchemaMissing,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
