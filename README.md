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

## ☁️ Deploying to Vercel

### Step 1: Push to GitHub & Connect to Vercel
1. Import the repository `https://github.com/Vamsi24-coder/Fitness` into [Vercel](https://vercel.com/new).
2. Framework Preset will automatically detect **Vite**.
3. Root Directory: `./`

### Step 2: Configure Environment Variables in Vercel
Under **Environment Variables**, add the 3 required keys:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://dzfgdimeamocmrgkxjqh.supabase.co` | Supabase API endpoint |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` | Supabase public publishable key |
| `VITE_GEMINI_API_KEY` | `AQ.Ab8RN6KH...` | Google Gemini AI Studio API key |

### Step 3: Add Vercel URL to Supabase Auth
Once Vercel assigns your production URL (e.g., `https://fitness-xxx.vercel.app`):
1. In [Supabase Dashboard](https://supabase.com/dashboard/project/dzfgdimeamocmrgkxjqh/auth/url-configuration):
   - Set **Site URL** to `https://fitness-xxx.vercel.app`
   - Under **Redirect URLs**, add `https://fitness-xxx.vercel.app/**`
2. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Under Authorized JavaScript origins, add `https://fitness-xxx.vercel.app`

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
