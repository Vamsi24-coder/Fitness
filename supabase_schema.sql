-- ==============================================================================
-- NutriPulse Database Schema
-- Run this script in your Supabase SQL Editor:
-- 1. Open: https://supabase.com/dashboard/project/dzfgdimeamocmrgkxjqh/sql/new
-- 2. Paste this entire file into the editor
-- 3. Click "RUN" (green button)
-- ==============================================================================

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
    weight NUMERIC(6, 2) NOT NULL CHECK (weight > 0),
    works_out BOOLEAN NOT NULL DEFAULT false,
    intensity TEXT CHECK (intensity IN ('Intensive', 'Medium', 'Small', 'None')),
    duration INTEGER DEFAULT 0 CHECK (duration >= 0),
    custom_allergies TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration for existing user_profiles table columns:
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS custom_allergies TEXT DEFAULT '';

-- 2. Create food_logs table
CREATE TABLE IF NOT EXISTS public.food_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_category TEXT NOT NULL CHECK (meal_category IN ('Breakfast', 'Snacks', 'Lunch', 'Dinner')),
    food_name TEXT NOT NULL,
    quantity NUMERIC(8, 2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'g',
    carbs NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (carbs >= 0),
    protein NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (protein >= 0),
    fats NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (fats >= 0),
    fiber NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (fiber >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create high-performance indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON public.food_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_meal ON public.food_logs(user_id, date, meal_category);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions to authenticated, anon and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.food_logs TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Drop existing policies if any to allow safe re-running
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;

DROP POLICY IF EXISTS "Users can view their own food logs" ON public.food_logs;
DROP POLICY IF EXISTS "Users can insert their own food logs" ON public.food_logs;
DROP POLICY IF EXISTS "Users can update their own food logs" ON public.food_logs;
DROP POLICY IF EXISTS "Users can delete their own food logs" ON public.food_logs;

-- 7. Row Level Security Policies for user_profiles
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
    ON public.user_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- 8. Row Level Security Policies for food_logs
CREATE POLICY "Users can view their own food logs"
    ON public.food_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food logs"
    ON public.food_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food logs"
    ON public.food_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food logs"
    ON public.food_logs FOR DELETE
    USING (auth.uid() = user_id);

-- 9. Updated at trigger function for user_profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 10. Create distributed AI rate limits table
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL DEFAULT 'gemini-nutrition',
    request_count INT NOT NULL DEFAULT 1 CHECK (request_count >= 0),
    window_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_request_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, endpoint)
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.ai_rate_limits TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.ai_rate_limits;
CREATE POLICY "Users can view their own rate limits"
    ON public.ai_rate_limits FOR SELECT
    USING (auth.uid() = user_id);

-- 11. Atomic Distributed Rate Limiting Function with Row-Level Locking (Prevents Race Conditions)
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT DEFAULT 'gemini-nutrition',
    p_max_requests INT DEFAULT 15,
    p_window_seconds INT DEFAULT 60,
    p_min_interval_seconds NUMERIC DEFAULT 1.5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_record RECORD;
    v_retry_after INT;
    v_time_since_last NUMERIC;
BEGIN
    -- Atomic row-level lock: prevents concurrent race conditions across serverless instances
    SELECT * INTO v_record
    FROM public.ai_rate_limits
    WHERE user_id = p_user_id AND endpoint = p_endpoint
    FOR UPDATE;

    IF NOT FOUND THEN
        -- First request for this user and endpoint
        INSERT INTO public.ai_rate_limits (user_id, endpoint, request_count, window_start, last_request_at)
        VALUES (p_user_id, p_endpoint, 1, v_now, v_now);

        RETURN jsonb_build_object(
            'allowed', true,
            'remaining', p_max_requests - 1,
            'retry_after', 0
        );
    END IF;

    -- 1. Enforce minimum interval between consecutive requests (burst abuse prevention)
    v_time_since_last := EXTRACT(EPOCH FROM (v_now - v_record.last_request_at));
    IF v_time_since_last < p_min_interval_seconds THEN
        v_retry_after := GREATEST(1, CEIL(p_min_interval_seconds - v_time_since_last));
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'interval',
            'retry_after', v_retry_after,
            'message', 'Requests sent too quickly. Please wait before retrying.'
        );
    END IF;

    -- 2. Check window expiration (e.g. 60 seconds elapsed)
    IF EXTRACT(EPOCH FROM (v_now - v_record.window_start)) >= p_window_seconds THEN
        -- Reset window atomically
        UPDATE public.ai_rate_limits
        SET request_count = 1,
            window_start = v_now,
            last_request_at = v_now
        WHERE user_id = p_user_id AND endpoint = p_endpoint;

        RETURN jsonb_build_object(
            'allowed', true,
            'remaining', p_max_requests - 1,
            'retry_after', 0
        );
    END IF;

    -- 3. Check quota limit within current window
    IF v_record.request_count >= p_max_requests THEN
        v_retry_after := GREATEST(1, CEIL(p_window_seconds - EXTRACT(EPOCH FROM (v_now - v_record.window_start))));
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'quota',
            'retry_after', v_retry_after,
            'message', 'Rate limit exceeded. Please wait a moment before sending another request.'
        );
    END IF;

    -- 4. Within limits: increment count and update last_request_at atomically
    UPDATE public.ai_rate_limits
    SET request_count = v_record.request_count + 1,
        last_request_at = v_now
    WHERE user_id = p_user_id AND endpoint = p_endpoint;

    RETURN jsonb_build_object(
        'allowed', true,
        'remaining', p_max_requests - (v_record.request_count + 1),
        'retry_after', 0
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit TO authenticated, service_role;

-- 12. Immediately notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
