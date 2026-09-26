# 🥗 NutriPulse — Full-Stack AI Nutrition & Fitness Platform

NutriPulse is a modern, full-stack nutrition and workout tracking web application powered by **React**, **Tailwind CSS**, **Supabase (PostgreSQL + Auth)**, and **Google Gemini AI**.

---

## 🚀 Features

1. **Authentication & Profile Routing:**
   - Supabase Auth with Google OAuth provider.
   - Intelligent post-login routing: checks `user_profiles` table:
     - No profile found $\rightarrow$ redirects to `/onboarding`
     - Profile exists $\rightarrow$ redirects straight to `/dashboard`
   - Instant Demo Sandbox mode for quick evaluation.

2. **Personalized Onboarding Form (One-time):**
   - Collects: Gender, Age, Weight (kg), Daily workout status, Workout intensity (Small / Medium / Intensive), and Workout duration (minutes).
   - Computes live BMR & TDEE macronutrient baselines before saving to Supabase.

3. **Interactive Main Dashboard:**
   - Date picker with calendar navigation to browse past & current dates.
   - Calorie & macronutrient progress bars (Calories, Protein, Carbs, Fats, Fiber).
   - 4 Meal Categories: **Breakfast**, **Lunch**, **Snacks**, and **Dinner**.
   - Each category displays total calories, logged items, quick macro badges, and a `+` button.

4. **Add Food Item Modal:**
   - Captures Food name, Quantity + Unit, Carbs (g), Protein (g), Fats (g), and Fiber (g).
   - Real-time automatic calorie calculation: `(carbs × 4) + (protein × 4) + (fats × 9)`.
   - **✨ AI Auto-Estimate Button**: Powered by Gemini API to automatically fill in macro values from a natural language food description (e.g., *"1 cup Greek yogurt with honey"*).

5. **Visual Analytics & Statistics Page:**
   - Timeframe switcher: **Daily**, **Last 7 Days (Weekly)**, and **Last 30 Days (Monthly)**.
   - Interactive charts built with **Recharts**:
     - Daily Calorie Intake vs Baseline Target (Bar Chart)
     - Protein / Carbs / Fats Calorie Distribution (Donut Chart)
     - Meal Category Distribution (Breakfast vs Lunch vs Snacks vs Dinner)
     - Multi-line macronutrient trend over time

6. **Gemini AI Nutrition Coach:**
   - Analyzes user's physiological profile + workout intensity + day's logged food + macro gaps.
   - Generates actionable meal ideas to bridge protein/carb gaps, pre/post-workout meal timing, and hydration tips.

---

## 🛠 Tech Stack

- **Frontend:** React 19, Tailwind CSS, Lucide React, Recharts, React Router v7
- **Backend / Database / Auth:** Supabase (PostgreSQL, Row Level Security, Auth)
- **AI Integration:** Google Gemini API (`gemini-flash-latest`, `gemini-3.5-flash-lite`, `gemini-3.8-flash`)
- **Build Tool:** Vite

---

## 🗄️ Database Setup (Supabase)

Open your [Supabase Dashboard](https://supabase.com/dashboard/project/dzfgdimeamocmrgkxjqh/sql) and run the SQL script located in [`supabase_schema.sql`](./supabase_schema.sql):

```sql
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

-- Indexes & RLS Policies are included in supabase_schema.sql
```

---

## 🔑 Google OAuth Setup Guide

To enable Google sign-in with your Supabase project:

1. **Google Cloud Console:**
   - Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Create an **OAuth 2.0 Client ID** with Application type **Web application**.
   - Under **Authorized redirect URIs**, add:
     ```
     https://dzfgdimeamocmrgkxjqh.supabase.co/auth/v1/callback
     ```
   - Copy the generated **Client ID** and **Client Secret**.

2. **Supabase Dashboard:**
   - Go to **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Google** in your [Supabase Dashboard](https://supabase.com/dashboard/project/dzfgdimeamocmrgkxjqh/auth/providers).
   - Toggle **Enable Google provider** to ON.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Save**.

---

---

---

## 🚀 Deploying to Render (Recommended Free Hosting)

### Method A: 1-Click via Render Blueprint
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your repository `https://github.com/Vamsi24-coder/Fitness`.
4. Render will read [`render.yaml`](./render.yaml) automatically, configure the build command (`npm install && npm run build`), publish directory (`dist`), and SPA rewrites (`/*` $\rightarrow$ `/index.html`).
5. Provide your 3 environment variables when prompted.

### Method B: Manual Static Site Setup
1. Click **New +** $\rightarrow$ **Static Site**.
2. Connect `Vamsi24-coder/Fitness` (branch: `main`).
3. Fill in configuration:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://dzfgdimeamocmrgkxjqh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_-b5hpCcpgIKRAqV_II-JLg_Z9EvVRxG`
   - `VITE_GEMINI_API_KEY` = `your_gemini_api_key_from_google_ai_studio`
5. **Redirects / Rewrites (Crucial for client-side routing)**:
   - Under **Redirects/Rewrites**:
     - **Type**: `Rewrite`
     - **Source**: `/*`
     - **Destination**: `/index.html`
6. Once deployed, copy your Render URL (e.g. `https://nutripulse-fitness.onrender.com`):
   - In [Supabase Dashboard $\rightarrow$ URL Configuration](https://supabase.com/dashboard/project/dzfgdimeamocmrgkxjqh/auth/url-configuration):
     - Set **Site URL**: `https://nutripulse-fitness.onrender.com`
     - Add to **Redirect URLs**: `https://nutripulse-fitness.onrender.com/**`
   - In [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials):
     - Add `https://nutripulse-fitness.onrender.com` to **Authorized JavaScript origins**.

---

## 💻 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and add your keys
cp .env.example .env

# 3. Start local development server
npm run dev

# 4. Build for production
npm run build
```

Open `http://localhost:5173` in your browser.
