import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { upsertUserProfile } from '../lib/supabase';
import { DatabaseSchemaAlert } from '../components/DatabaseSchemaAlert';
import { 
  Activity, 
  Dumbbell, 
  Flame, 
  User, 
  HeartPulse, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  Wheat, 
  Droplet, 
  Scale, 
  Sparkles, 
  Info,
  ChevronRight,
  Zap
} from 'lucide-react';
import { calculateDailyTargets } from '../services/nutrition';

export function Onboarding() {
  const { user, isDemoUser, refreshProfile, setProfile, isSchemaMissing, setIsSchemaMissing } = useAuth();
  const navigate = useNavigate();

  // Step state: 1 = Form Inputs, 2 = Calculated Blueprint Reveal Page
  const [currentStep, setCurrentStep] = useState(1);

  // Form State - every factor mentioned by user
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('26');
  const [weight, setWeight] = useState('72');
  const [worksOut, setWorksOut] = useState(true);
  const [intensity, setIntensity] = useState('Medium');
  const [duration, setDuration] = useState('45');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // UPGRADE 2: Dynamic calculation strictly depending upon EVERY factor entered
  const parsedAge = parseInt(age, 10) || 25;
  const parsedWeight = parseFloat(weight) || 70;
  const parsedDuration = worksOut ? parseInt(duration, 10) || 30 : 0;

  const dynamicBlueprint = calculateDailyTargets({
    gender,
    age: parsedAge,
    weight: parsedWeight,
    works_out: worksOut,
    intensity: worksOut ? intensity : 'Small',
    duration: parsedDuration,
  });

  // Step 1 Validation & Proceed to Step 2
  const handleProceedToBlueprint = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
      setErrorMsg('Please enter a valid age between 10 and 120.');
      return;
    }

    if (isNaN(parsedWeight) || parsedWeight <= 20 || parsedWeight > 350) {
      setErrorMsg('Please enter a valid weight in kg (20 - 350 kg).');
      return;
    }

    if (worksOut && (isNaN(parsedDuration) || parsedDuration < 5)) {
      setErrorMsg('Please enter a valid workout duration (at least 5 minutes).');
      return;
    }

    // Go to next page (Step 2: Blueprint Reveal)
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2: Final Confirmation & Save to Supabase
  const handleFinalSave = async () => {
    setErrorMsg('');

    const profileData = {
      user_id: user?.id,
      gender,
      age: parsedAge,
      weight: parsedWeight,
      works_out: worksOut,
      intensity: worksOut ? intensity : 'Small',
      duration: parsedDuration,
      updated_at: new Date().toISOString(),
    };

    try {
      setLoading(true);

      if (isDemoUser) {
        setProfile({
          id: 'demo-profile-' + Date.now(),
          ...profileData,
          created_at: new Date().toISOString(),
        });
        navigate('/dashboard');
        return;
      }

      await upsertUserProfile(profileData);
      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to save profile:', err);
      if (err.isSchemaMissing || err.message?.includes('schema cache')) {
        setIsSchemaMissing(true);
        setErrorMsg('The user_profiles table has not been created in Supabase yet. Please run the SQL script below.');
      } else {
        setErrorMsg(err.message || 'Could not save profile to Supabase. Check user_profiles table setup.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center">
      
      {/* Apple Ambient Backlight Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-[#ff2d55]/10 via-[#30d158]/10 to-[#0a84ff]/10 rounded-full blur-3xl pointer-events-none opacity-60" />

      <div className="max-w-2xl w-full relative z-10">
        
        {/* Step Indicator Header (iOS Setup Assistant Style) */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full apple-glass-inset text-xs font-semibold text-[#30d158] mb-3.5 shadow-sm">
            <span className="caption-label text-[10px]">STEP {currentStep} OF 2</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-200">
              {currentStep === 1 ? 'Personal Profile' : 'Dynamic Nutrition Blueprint'}
            </span>
          </div>

          <h1 className="display-title text-3xl sm:text-4xl text-white">
            {currentStep === 1 ? 'Personalize Your Profile' : 'Your Dynamic Blueprint'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 font-medium max-w-lg mx-auto">
            {currentStep === 1
              ? 'Every factor you enter dynamically formulates your daily caloric and macronutrient targets.'
              : 'Precision nutritional targets calculated directly from your biometrics and workout intensity.'}
          </p>
        </div>

        {/* Database Schema Alert */}
        {isSchemaMissing && (
          <DatabaseSchemaAlert onResolved={() => setIsSchemaMissing(false)} />
        )}

        {/* Error Notice */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300 backdrop-blur-md">
            {errorMsg}
          </div>
        )}

        {/* Step Switcher with Apple Spring Motion */}
        <AnimatePresence mode="wait">
          {currentStep === 1 ? (
            /* ========================================================
               STEP 1: Profile Factors Form
               ======================================================== */
            <motion.div
              key="step-1"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="apple-glass-card rounded-[32px] p-6 sm:p-8 border-t border-t-white/15 shadow-2xl"
            >
              <form onSubmit={handleProceedToBlueprint} className="space-y-6">
                
                {/* 1. Biological Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 caption-label mb-2.5">
                    1. Biological Gender
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Male', 'Female', 'Other'].map((g) => {
                      const isSelected = gender === g;
                      return (
                        <button
                          type="button"
                          key={g}
                          onClick={() => setGender(g)}
                          className={`apple-btn py-3 px-4 rounded-2xl text-sm font-semibold transition-all relative ${
                            isSelected
                              ? 'bg-white/15 text-white border border-white/20 shadow-md'
                              : 'apple-glass-inset text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] absolute top-2.5 right-2.5 shadow-sm" />
                          )}
                          <span>{g}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Age & Weight */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
                      2. Age (years)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="12"
                        max="120"
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="26"
                        className="w-full px-4 py-3.5 apple-glass-inset rounded-2xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 tabular-numbers"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                        yrs
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
                      3. Weight (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="20"
                        max="350"
                        required
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="72.0"
                        className="w-full px-4 py-3.5 apple-glass-inset rounded-2xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 tabular-numbers"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Daily Workout Switch */}
                <div className="p-5 rounded-2xl apple-glass-inset">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                        <Dumbbell className="w-4 h-4 text-[#30d158]" />
                        <span>4. Do you work out daily?</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Resistance training, cardio, athletics, or active sports
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 apple-glass p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setWorksOut(true)}
                        className={`apple-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          worksOut
                            ? 'bg-[#30d158] text-black shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorksOut(false)}
                        className={`apple-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          !worksOut
                            ? 'bg-white/20 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Intensity & Duration (Smoothly revealed when worksOut is true) */}
                  <AnimatePresence>
                    {worksOut && (
                      <motion.div
                        key="workout-details"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                        className="mt-5 pt-4 border-t border-white/10 space-y-4 overflow-hidden"
                      >
                        
                        {/* 5. Workout Intensity */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
                            5. Workout Intensity
                          </label>
                          <div className="grid grid-cols-3 gap-2.5">
                            {[
                              { label: 'Small', desc: 'Light yoga / walk', burn: '~3.5 METs' },
                              { label: 'Medium', desc: 'Moderate lifting / jog', burn: '~6.0 METs' },
                              { label: 'Intensive', desc: 'Heavy lifts / HIIT', burn: '~8.5 METs' },
                            ].map((item) => {
                              const isSelected = intensity === item.label;
                              return (
                                <button
                                  type="button"
                                  key={item.label}
                                  onClick={() => setIntensity(item.label)}
                                  className={`apple-btn p-3 text-left rounded-2xl transition-all ${
                                    isSelected
                                      ? 'bg-white/15 border border-[#30d158]/50 text-white shadow-sm'
                                      : 'bg-black/40 border border-white/5 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <span className="block text-xs font-bold">{item.label}</span>
                                  <span className="block text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                                  <span className="block text-[10px] text-[#30d158] font-mono mt-1">{item.burn}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 6. Workout Duration */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-300 caption-label">
                              6. Workout Duration (minutes/day)
                            </label>
                            <span className="text-xs font-bold text-[#30d158] tabular-numbers">
                              {duration} minutes
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              min="15"
                              max="180"
                              step="5"
                              value={duration}
                              onChange={(e) => setDuration(e.target.value)}
                              className="flex-1 accent-[#30d158] h-2 bg-white/10 rounded-lg cursor-pointer"
                            />
                            <span className="px-3 py-1.5 rounded-xl apple-glass text-[#30d158] font-bold text-xs min-w-[65px] text-center tabular-numbers">
                              {duration}m
                            </span>
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Real-time Dynamic Mini-Ticker */}
                <div className="p-4 rounded-2xl apple-glass border border-white/10 flex items-center justify-between text-xs">
                  <span className="flex items-center space-x-2 text-slate-300 font-medium">
                    <Activity className="w-4 h-4 text-[#30d158]" />
                    <span>Real-time Dynamic Calorie Target:</span>
                  </span>
                  <div className="flex items-baseline space-x-1">
                    <span className="headline text-lg text-[#30d158] tabular-numbers">
                      {dynamicBlueprint.calories.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">kcal/day</span>
                  </div>
                </div>

                {/* Next Step Button */}
                <button
                  type="submit"
                  className="apple-btn w-full py-4 px-6 rounded-2xl bg-white text-black hover:bg-slate-100 font-bold text-sm shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>Review Calculated Blueprint</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </button>
              </form>
            </motion.div>
          ) : (
            /* ========================================================
               STEP 2: The Calculated Blueprint Reveal Page (UPGRADE 2)
               ======================================================== */
            <motion.div
              key="step-2"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="apple-glass-card rounded-[32px] p-6 sm:p-8 border-t border-t-white/15 shadow-2xl space-y-6"
            >
              
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#30d158]/20 via-[#0a84ff]/20 to-[#bf5af2]/20 border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#ffd60a]" />
                  </div>
                  <div>
                    <h3 className="headline text-lg text-white">Your Dynamic Daily Blueprint</h3>
                    <p className="text-xs text-slate-400">
                      Precision Mifflin-St Jeor + MET calibrated formula
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold text-[#30d158] caption-label border border-white/10">
                  DYNAMIC
                </span>
              </div>

              {/* Total Daily Calorie Card with Formula Breakdown */}
              <div className="p-6 rounded-[24px] apple-glass-inset border border-white/10 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="caption-label text-[11px] text-slate-400 block">
                      Total Daily Calorie Expenditure
                    </span>
                    <div className="mt-1 flex items-baseline space-x-2">
                      <span className="display-title text-4xl sm:text-5xl text-white tabular-numbers">
                        {dynamicBlueprint.calories.toLocaleString()}
                      </span>
                      <span className="text-sm font-semibold text-[#ff2d55]">kcal / day</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#ff2d55]/15 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55] shadow-lg">
                    <Flame className="w-7 h-7" />
                  </div>
                </div>

                {/* Formula Factors Breakdown */}
                <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between apple-glass p-3 rounded-xl">
                    <span className="text-slate-400">Basal Metabolic Rate (BMR):</span>
                    <span className="tabular-numbers font-bold text-white">{dynamicBlueprint.bmr} kcal</span>
                  </div>
                  <div className="flex items-center justify-between apple-glass p-3 rounded-xl">
                    <span className="text-slate-400">
                      Workout Burn ({dynamicBlueprint.factors.duration}m {dynamicBlueprint.factors.intensity}):
                    </span>
                    <span className="tabular-numbers font-bold text-[#30d158]">
                      +{dynamicBlueprint.workoutCalories} kcal
                    </span>
                  </div>
                </div>
              </div>

              {/* Macronutrient Targets Grid */}
              <div>
                <h4 className="caption-label text-[11px] text-slate-400 mb-3">
                  Macronutrient Energy Targets
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Protein */}
                  <div className="p-4 rounded-2xl apple-glass border-t border-t-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="caption-label text-[10px] text-[#30d158] flex items-center space-x-1">
                          <Dumbbell className="w-3 h-3" />
                          <span>Protein</span>
                        </span>
                      </div>
                      <div className="display-title text-2xl text-white tabular-numbers">
                        {dynamicBlueprint.protein}g
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {dynamicBlueprint.factors.proteinPerKg}g/kg of bodyweight
                    </p>
                  </div>

                  {/* Carbs */}
                  <div className="p-4 rounded-2xl apple-glass border-t border-t-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="caption-label text-[10px] text-[#0a84ff] flex items-center space-x-1">
                          <Wheat className="w-3 h-3" />
                          <span>Carbs</span>
                        </span>
                      </div>
                      <div className="display-title text-2xl text-white tabular-numbers">
                        {dynamicBlueprint.carbs}g
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Glycogen fuel for training
                    </p>
                  </div>

                  {/* Fats */}
                  <div className="p-4 rounded-2xl apple-glass border-t border-t-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="caption-label text-[10px] text-[#ffd60a] flex items-center space-x-1">
                          <Droplet className="w-3 h-3" />
                          <span>Fats</span>
                        </span>
                      </div>
                      <div className="display-title text-2xl text-white tabular-numbers">
                        {dynamicBlueprint.fats}g
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      25% hormonal baseline
                    </p>
                  </div>

                  {/* Fiber */}
                  <div className="p-4 rounded-2xl apple-glass border-t border-t-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="caption-label text-[10px] text-[#bf5af2] flex items-center space-x-1">
                          <Scale className="w-3 h-3" />
                          <span>Fiber</span>
                        </span>
                      </div>
                      <div className="display-title text-2xl text-white tabular-numbers">
                        {dynamicBlueprint.fiber}g
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      14g per 1000 kcal digestion
                    </p>
                  </div>
                </div>
              </div>

              {/* Input Factor Review Pill Bar */}
              <div className="p-3.5 rounded-2xl apple-glass-inset text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-300">Biometric Factors:</span>
                <div className="flex items-center space-x-2">
                  <span className="bg-white/10 px-2.5 py-0.5 rounded-lg text-slate-200 font-medium">{gender}</span>
                  <span className="bg-white/10 px-2.5 py-0.5 rounded-lg text-slate-200 font-medium">{age} yrs</span>
                  <span className="bg-white/10 px-2.5 py-0.5 rounded-lg text-slate-200 font-medium">{weight} kg</span>
                  <span className="bg-white/10 px-2.5 py-0.5 rounded-lg text-slate-200 font-medium">
                    {worksOut ? `${intensity} (${duration}m)` : 'Sedentary'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Adjust Inputs or Confirm & Launch */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="apple-btn flex items-center space-x-1.5 px-5 py-3.5 rounded-2xl apple-glass text-slate-300 hover:text-white text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Adjust Inputs</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSave}
                  disabled={loading}
                  className="apple-btn flex-1 py-3.5 px-6 rounded-2xl bg-[#30d158] hover:bg-[#30d158]/90 text-black font-bold text-sm shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black" />
                  ) : (
                    <>
                      <span>Confirm & Launch Dashboard</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
