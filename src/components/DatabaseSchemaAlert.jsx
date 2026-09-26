import React, { useState } from 'react';
import { 
  Database, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';
import { checkDatabaseSchemaStatus } from '../lib/supabase';

const SCHEMA_SQL = `-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
    weight NUMERIC(6, 2) NOT NULL CHECK (weight > 0),
    works_out BOOLEAN NOT NULL DEFAULT false,
    intensity TEXT CHECK (intensity IN ('Intensive', 'Medium', 'Small', 'None')),
    duration INTEGER DEFAULT 0 CHECK (duration >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- 3. High-performance indexes
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

-- 6. Row Level Security Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON public.user_profiles FOR DELETE USING (auth.uid() = user_id);

-- 7. Row Level Security Policies for food_logs
CREATE POLICY "Users can view their own food logs" ON public.food_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own food logs" ON public.food_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own food logs" ON public.food_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own food logs" ON public.food_logs FOR DELETE USING (auth.uid() = user_id);

-- 8. Updated at trigger function for user_profiles
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

-- 9. Immediately notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';`;

export function DatabaseSchemaAlert({ onResolved }) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCheck = async () => {
    setChecking(true);
    setCheckResult('');
    const status = await checkDatabaseSchemaStatus();
    setChecking(false);
    if (status.isReady) {
      setCheckResult('Success! Schema is ready.');
      if (onResolved) onResolved();
      setTimeout(() => window.location.reload(), 800);
    } else {
      setCheckResult('Tables not found yet. Please paste the SQL in Supabase and click RUN.');
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 sm:p-6 text-slate-200 shadow-xl my-4">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-amber-300">
            Database Setup Required: `public.user_profiles` Not Found
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            Your Supabase project (<code className="text-emerald-400 font-mono">dzfgdimeamocmrgkxjqh</code>) does not have the database tables created yet. Run the SQL script once in your Supabase SQL editor to create the tables and policies.
          </p>

          {/* Quick Action Steps */}
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <a
                href="https://supabase.com/dashboard/project/dzfgdimeamocmrgkxjqh/sql/new"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
              >
                <span>1. Open Supabase SQL Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'SQL Copied to Clipboard!' : '2. Copy SQL Script'}</span>
              </button>

              <button
                type="button"
                onClick={handleCheck}
                disabled={checking}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                <span>3. Check Status</span>
              </button>
            </div>

            {checkResult && (
              <p className={`text-xs font-medium ${checkResult.startsWith('Success') ? 'text-emerald-400' : 'text-amber-400'}`}>
                {checkResult}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
