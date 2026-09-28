import { createClient } from '@supabase/supabase-js';

// Robust URL sanitization to handle accidental concatenation of Vercel domains or trailing paths
function sanitizeSupabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  
  // Extract the true Supabase project domain
  const match = trimmed.match(/(https?:\/\/[a-z0-9-]+(?:\.supabase\.co|\.supabase\.in))/i);
  if (match) {
    return match[1];
  }
  return trimmed.replace(/\/+$/, '');
}

function sanitizeSupabaseKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  return rawKey.trim().replace(/^["']|["']$/g, '');
}

// Configuration strictly from environment variables
const rawEnvUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '';
const rawEnvKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || '';
const supabaseUrl = sanitizeSupabaseUrl(rawEnvUrl);
const supabaseAnonKey = sanitizeSupabaseKey(rawEnvKey);

const effectiveUrl = supabaseUrl || 'https://dzfgdimeamocmrgkxjqh.supabase.co';
const effectiveKey = supabaseAnonKey || 'sb_publishable_placeholder';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.');
}

export const supabase = createClient(effectiveUrl, effectiveKey, {
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
 * Format and sanitize profile object for Supabase user_profiles table.
 * Strips client-only computed keys and ensures proper data types.
 */
export function sanitizeProfilePayload(raw) {
  if (!raw || typeof raw !== 'object') return {};

  const payload = {};

  // Core ID
  if (raw.user_id) payload.user_id = raw.user_id;

  // Biometrics
  if (raw.gender !== undefined && raw.gender !== null) payload.gender = String(raw.gender);
  if (raw.age !== undefined && !isNaN(Number(raw.age))) payload.age = Math.round(Number(raw.age));
  if (raw.weight !== undefined && !isNaN(Number(raw.weight))) payload.weight = Math.round(Number(raw.weight) * 100) / 100;
  
  // Height & Unit (Database column: height, height_unit)
  const rawHeight = raw.height !== undefined && raw.height !== null ? raw.height : raw.height_cm;
  if (rawHeight !== undefined && !isNaN(Number(rawHeight)) && Number(rawHeight) > 0) {
    payload.height = Math.round(Number(rawHeight) * 10) / 10;
  }
  if (raw.height_unit !== undefined && raw.height_unit !== null) payload.height_unit = String(raw.height_unit);

  // Workout / Training
  if (raw.works_out !== undefined) payload.works_out = Boolean(raw.works_out);
  if (raw.intensity !== undefined && raw.intensity !== null) payload.intensity = String(raw.intensity);
  if (raw.duration !== undefined && !isNaN(Number(raw.duration))) payload.duration = Math.max(0, Math.round(Number(raw.duration)));
  if (raw.workout_frequency !== undefined && !isNaN(Number(raw.workout_frequency))) {
    payload.workout_frequency = Math.max(0, Math.round(Number(raw.workout_frequency)));
  }

  // Lifestyle & Daily Activity
  if (raw.daily_activity_level !== undefined && raw.daily_activity_level !== null) payload.daily_activity_level = String(raw.daily_activity_level);
  if (raw.walking_duration !== undefined && raw.walking_duration !== null) payload.walking_duration = String(raw.walking_duration);

  // Gym & Cardio
  if (raw.goes_to_gym !== undefined) payload.goes_to_gym = Boolean(raw.goes_to_gym);
  if (raw.gym_frequency !== undefined && !isNaN(Number(raw.gym_frequency))) {
    payload.gym_frequency = Math.max(0, Math.round(Number(raw.gym_frequency)));
  }
  if (raw.gym_duration !== undefined && !isNaN(Number(raw.gym_duration))) {
    payload.gym_duration = Math.max(0, Math.round(Number(raw.gym_duration)));
  }
  if (raw.cardio_duration !== undefined && !isNaN(Number(raw.cardio_duration))) {
    payload.cardio_duration = Math.max(0, Math.round(Number(raw.cardio_duration)));
  }

  // Cardio Type (Database column: cardio_type TEXT)
  if (raw.cardio_types && Array.isArray(raw.cardio_types) && raw.cardio_types.length > 0) {
    payload.cardio_type = raw.cardio_types.filter(Boolean).join(', ');
  } else if (raw.cardio_type !== undefined && raw.cardio_type !== null) {
    payload.cardio_type = Array.isArray(raw.cardio_type) ? raw.cardio_type.filter(Boolean).join(', ') : String(raw.cardio_type);
  }

  // Goals (Database column: primary_goal TEXT, target_weight NUMERIC)
  if (raw.primary_goal !== undefined && raw.primary_goal !== null) payload.primary_goal = String(raw.primary_goal);
  if (raw.target_weight !== undefined && raw.target_weight !== null && raw.target_weight !== '') {
    const tw = Number(raw.target_weight);
    payload.target_weight = !isNaN(tw) && tw > 0 ? Math.round(tw * 100) / 100 : null;
  } else if (raw.target_weight === null || raw.target_weight === '') {
    payload.target_weight = null;
  }

  // Recomp Priority (Database column: recomp_priority TEXT)
  if (raw.recomp_priorities && Array.isArray(raw.recomp_priorities)) {
    const hasFat = raw.recomp_priorities.includes('fat_loss');
    const hasMuscle = raw.recomp_priorities.includes('muscle_gain');
    payload.recomp_priority = (hasFat && hasMuscle) || (!hasFat && !hasMuscle) ? 'both_equally' : (hasFat ? 'fat_loss' : 'muscle_gain');
  } else if (raw.recomp_priority !== undefined && raw.recomp_priority !== null) {
    payload.recomp_priority = String(raw.recomp_priority);
  }

  // Performance Focus (Database column: performance_focus TEXT)
  if (raw.performance_focuses && Array.isArray(raw.performance_focuses)) {
    payload.performance_focus = raw.performance_focuses.filter(Boolean).join(', ');
  } else if (raw.performance_focus !== undefined && raw.performance_focus !== null) {
    payload.performance_focus = Array.isArray(raw.performance_focus) ? raw.performance_focus.filter(Boolean).join(', ') : String(raw.performance_focus);
  }

  // Competition Details
  if (raw.competition_type !== undefined) payload.competition_type = raw.competition_type ? String(raw.competition_type) : null;
  if (raw.competition_date !== undefined) payload.competition_date = raw.competition_date ? String(raw.competition_date) : null;
  if (raw.competition_weight_category !== undefined) payload.competition_weight_category = raw.competition_weight_category ? String(raw.competition_weight_category) : null;

  // Diet & Allergies
  if (raw.diet_preference !== undefined && raw.diet_preference !== null) payload.diet_preference = String(raw.diet_preference);
  if (raw.allergies !== undefined && raw.allergies !== null) {
    payload.allergies = Array.isArray(raw.allergies) ? raw.allergies : [String(raw.allergies)];
  }

  payload.updated_at = new Date().toISOString();

  return payload;
}

/**
 * Enrich raw database row with client convenience helper properties
 */
export function enrichProfileData(data) {
  if (!data) return null;
  const enriched = { ...data };

  // Ensure height_cm is present
  if (enriched.height !== undefined && enriched.height_cm === undefined) {
    enriched.height_cm = enriched.height;
  }

  // Parse cardio_types array from cardio_type string if needed
  if (enriched.cardio_type && !enriched.cardio_types) {
    enriched.cardio_types = String(enriched.cardio_type).split(',').map((s) => s.trim()).filter(Boolean);
  }

  // Parse recomp_priorities array from recomp_priority if needed
  if (enriched.recomp_priority && !enriched.recomp_priorities) {
    if (enriched.recomp_priority === 'both_equally') {
      enriched.recomp_priorities = ['fat_loss', 'muscle_gain'];
    } else {
      enriched.recomp_priorities = [enriched.recomp_priority];
    }
  }

  // Parse performance_focuses if needed
  if (enriched.performance_focus && !enriched.performance_focuses) {
    enriched.performance_focuses = String(enriched.performance_focus).split(',').map((s) => s.trim()).filter(Boolean);
  }

  // Ensure allergies is an array
  if (!Array.isArray(enriched.allergies)) {
    enriched.allergies = enriched.allergies ? [enriched.allergies] : ['none'];
  }

  return enriched;
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
  return enrichProfileData(data);
}

/**
 * Create or update user profile with resilient column stripping on schema mismatch
 */
export async function upsertUserProfile(profileData) {
  let payload = sanitizeProfilePayload(profileData);
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    attempts++;
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (!error) {
      return enrichProfileData(data);
    }

    // Check if error is due to a missing column in Supabase schema cache
    // e.g. "Could not find the 'cardio_types' column of 'user_profiles' in the schema cache"
    const missingColMatch = error.message?.match(/Could not find the '([^']+)' column of/i)
      || error.details?.match(/column "([^"]+)" of relation "[^"]+" does not exist/i)
      || error.message?.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);

    if (missingColMatch && missingColMatch[1]) {
      const missingColumn = missingColMatch[1];
      console.warn(`[Supabase Schema Resilience] Column '${missingColumn}' not present in Supabase table. Stripping field and retrying upsert.`);
      delete payload[missingColumn];
      continue;
    }

    if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
      error.isSchemaMissing = true;
    }
    console.error('Error saving user profile:', error.message);
    throw error;
  }
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
