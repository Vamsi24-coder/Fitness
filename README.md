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


Open `http://localhost:5173` in your browser.
