import { createClient } from '@supabase/supabase-js';

// Configuration from environment variables with fallbacks to user-provided values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dzfgdimeamocmrgkxjqh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-b5hpCcpgIKRAqV_II-JLg_Z9EvVRxG';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Check if the database tables exist in the Supabase schema cache
 */
export async function checkDatabaseSchemaStatus() {
  try {
    const { error } = await supabase.from('user_profiles').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return { isReady: false, error: 'Table public.user_profiles does not exist in Supabase yet.' };
      }
    }
    return { isReady: true, error: null };
  } catch (err) {
    return { isReady: false, error: err.message };
  }
}

/**
 * Trigger Google OAuth sign-in via Supabase
 */
export async function signInWithGoogle() {
  const redirectUrl = window.location.origin;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Fetch user profile from public.user_profiles
 */
export async function getUserProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      error.isSchemaMissing = true;
    }
    console.warn('Profile fetch notice:', error.message);
    throw error;
  }
  return data;
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(profileData) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(profileData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      error.isSchemaMissing = true;
    }
    console.error('Error saving user profile:', error.message);
    throw error;
  }
  return data;
}

/**
 * Fetch food logs for a specific user and date (YYYY-MM-DD)
 */
export async function getFoodLogsByDate(userId, dateStr) {
  if (!userId || !dateStr) return [];
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching food logs:', error.message);
    throw error;
  }
  return data || [];
}

/**
 * Fetch food logs across a date range for statistics
 */
export async function getFoodLogsRange(userId, startDateStr, endDateStr) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching food logs range:', error.message);
    throw error;
  }
  return data || [];
}

/**
 * Insert a new food log entry
 */
export async function addFoodLog(entry) {
  const { data, error } = await supabase
    .from('food_logs')
    .insert([entry])
    .select()
    .single();

  if (error) {
    console.error('Error adding food log:', error.message);
    throw error;
  }
  return data;
}

/**
 * Delete a food log entry
 */
export async function deleteFoodLog(logId, userId) {
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting food log:', error.message);
    throw error;
  }
  return true;
}
