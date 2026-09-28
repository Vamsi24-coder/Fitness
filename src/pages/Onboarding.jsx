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
  Check,
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
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Zap,
  Target,
  Trophy,
  Footprints,
  Calendar,
  ShieldAlert,
  Utensils,
  Salad,
  Timer
} from 'lucide-react';
import { 
  calculateDailyTargets, 
  generateGoalExplanation, 
  GOAL_DETAILS, 
  cmToFeetInches, 
  feetInchesToCm, 
  inchesToCm,
  calculateHealthyWeightRange,
  getSuggestedTargetWeight 
} from '../services/nutrition';

// Exercise options for the smart multi-select question
const EXERCISE_OPTIONS = [
  { id: 'gym', label: 'Gym', desc: 'Weights, machines, gym cardio' },
  { id: 'home_workouts', label: 'Home Workouts', desc: 'Bodyweight, calisthenics, resistance bands' },
  { id: 'outdoor', label: 'Outdoor Exercise', desc: 'Running, cycling, brisk walking' },
  { id: 'sports', label: 'Sports', desc: 'Badminton, cricket, football, swimming, tennis' },
  { id: 'none', label: "I Don't Exercise Regularly", desc: 'Focus only on daily movement & nutrition' },
];

// Categorized food allergies and avoidances
const ALLERGY_INTOLERANCES = [
  { id: 'dairy', label: 'Dairy / Lactose' },
  { id: 'peanuts', label: 'Peanuts' },
  { id: 'tree_nuts', label: 'Tree Nuts (Almonds, Walnuts)' },
  { id: 'gluten', label: 'Gluten / Wheat' },
  { id: 'soy', label: 'Soy' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'seafood', label: 'Fish / Seafood' },
];

const FOODS_TO_AVOID = [
  { id: 'pork', label: 'Pork' },
  { id: 'beef', label: 'Beef' },
];

export function Onboarding() {
  const { user, isDemoUser, logout, refreshProfile, setProfile, isSchemaMissing, setIsSchemaMissing } = useAuth();
  const navigate = useNavigate();

  // Wizard Stage: 1 = Biometrics & Lifestyle, 2 = Training & Gym, 3 = Goals & Diet, 4 = Blueprint Reveal
  const [currentStep, setCurrentStep] = useState(1);

  // 1. Core Biometrics
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('26');
  const [weight, setWeight] = useState('72');
  const [heightUnit, setHeightUnit] = useState('cm'); // 'cm' | 'ft_in'
  const [heightCm, setHeightCm] = useState('175');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('9');

  // Height Unit Switcher
  const handleHeightUnitToggle = (newUnit) => {
    if (newUnit === heightUnit) return;
    if (newUnit === 'ft_in') {
      const currentCm = parseFloat(heightCm) || 175;
      const { feet, inches } = cmToFeetInches(currentCm);
      setHeightFeet(String(feet));
      setHeightInches(String(inches));
    } else {
      const currentCm = feetInchesToCm(parseInt(heightFeet, 10) || 0, parseFloat(heightInches) || 0);
      setHeightCm(String(Math.round(currentCm)));
    }
    setHeightUnit(newUnit);
  };

  // 2. Daily Movement & General Activity
  const [dailyActivityLevel, setDailyActivityLevel] = useState('mostly_sitting');
  const [walkingDuration, setWalkingDuration] = useState('15_30');

  // 3. Training & Workout (Smart Exercise Mode)
  const [exerciseTypes, setExerciseTypes] = useState(['gym']);
  const [worksOut, setWorksOut] = useState(true);
  const [workoutFrequency, setWorkoutFrequency] = useState(4);
  const [intensity, setIntensity] = useState('Medium');
  const [duration, setDuration] = useState('45');

  // 4. Gym & Cardio
  const [goesToGym, setGoesToGym] = useState(true);
  const [gymFrequency, setGymFrequency] = useState(4);
  const [gymDuration, setGymDuration] = useState('60');
  const [cardioDuration, setCardioDuration] = useState('15');
  const [cardioTypes, setCardioTypes] = useState(['Treadmill']);

  // Smart Exercise Toggle Helper
  const toggleExerciseType = (typeId) => {
    if (typeId === 'none') {
      setExerciseTypes(['none']);
      setWorksOut(false);
      setGoesToGym(false);
      return;
    }
    setExerciseTypes((prev) => {
      const filtered = prev.filter((t) => t !== 'none');
      let next;
      if (filtered.includes(typeId)) {
        next = filtered.filter((t) => t !== typeId);
        if (next.length === 0) {
          next = ['none'];
        }
      } else {
        next = [...filtered, typeId];
      }
      const hasActive = next.some((t) => t !== 'none');
      setWorksOut(hasActive);
      setGoesToGym(next.includes('gym'));
      return next;
    });
  };

  // 5. Goals
  const [primaryGoal, setPrimaryGoal] = useState('lose_fat');
  const [targetWeight, setTargetWeight] = useState('');
  const [hasCustomTargetWeight, setHasCustomTargetWeight] = useState(false);
  const [recompPriorities, setRecompPriorities] = useState(['fat_loss', 'muscle_gain']);
  const [performanceFocus, setPerformanceFocus] = useState(['strength']);
  const [competitionType, setCompetitionType] = useState('bodybuilding');
  const [competitionDate, setCompetitionDate] = useState('');
  const [competitionCategory, setCompetitionCategory] = useState('');

  // 6. Nutrition Preferences & Allergies
  const [dietPreference, setDietPreference] = useState('non_vegetarian');
  const [allergies, setAllergies] = useState(['none']);
  const [customAllergy, setCustomAllergy] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Numerical Parsing & Sanitization
  const parsedAge = parseInt(age, 10) || 25;
  const parsedWeight = parseFloat(weight) || 70;
  const parsedHeightCm = heightUnit === 'cm'
    ? (parseFloat(heightCm) || 175)
    : feetInchesToCm(parseInt(heightFeet, 10) || 0, parseFloat(heightInches) || 0);

  const healthyRange = calculateHealthyWeightRange(parsedHeightCm, gender);
  const suggestedTargetWeight = getSuggestedTargetWeight(parsedWeight, parsedHeightCm, primaryGoal, gender);
  const parsedTargetWeight = (primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle')
    ? (targetWeight !== '' && !isNaN(parseFloat(targetWeight)) ? parseFloat(targetWeight) : suggestedTargetWeight)
    : null;
  const parsedDuration = worksOut ? parseInt(duration, 10) || 30 : 0;
  const parsedGymDuration = goesToGym ? parseInt(gymDuration, 10) || 60 : 0;
  const parsedCardioDuration = goesToGym ? Math.min(parsedGymDuration, parseInt(cardioDuration, 10) || 0) : 0;

  // Toggle Helpers for Multi-Select Questions
  const toggleCardioType = (type) => {
    setCardioTypes((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === type.toLowerCase());
      if (exists) {
        const next = prev.filter((t) => t.toLowerCase() !== type.toLowerCase());
        return next.length === 0 ? [type] : next;
      } else {
        return [...prev, type];
      }
    });
  };

  const togglePerformanceFocus = (focusId) => {
    setPerformanceFocus((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [prev];
      if (prevArr.includes(focusId)) {
        const next = prevArr.filter((f) => f !== focusId);
        return next.length === 0 ? [focusId] : next;
      } else {
        return [...prevArr, focusId];
      }
    });
  };

  const isBothRecompSelected = recompPriorities.includes('fat_loss') && recompPriorities.includes('muscle_gain');
  const canonicalRecompPriority = isBothRecompSelected
    ? 'both_equally'
    : (recompPriorities.includes('fat_loss') ? 'fat_loss' : (recompPriorities.includes('muscle_gain') ? 'muscle_gain' : 'both_equally'));

  // Profile Payload for Real-time Blueprint Calculation
  const profilePayload = {
    gender,
    age: parsedAge,
    weight: parsedWeight,
    height: parsedHeightCm,
    height_cm: parsedHeightCm,
    height_unit: heightUnit,
    exercise_types: exerciseTypes,
    works_out: worksOut,
    workout_frequency: worksOut ? workoutFrequency : 0,
    intensity: worksOut ? intensity : 'Small',
    duration: parsedDuration,
    daily_activity_level: dailyActivityLevel,
    walking_duration: walkingDuration,
    goes_to_gym: worksOut && goesToGym,
    gym_frequency: worksOut && goesToGym ? gymFrequency : 0,
    gym_duration: parsedGymDuration,
    cardio_duration: parsedCardioDuration,
    cardio_type: cardioTypes.join(', '),
    cardio_types: cardioTypes,
    primary_goal: primaryGoal,
    target_weight: parsedTargetWeight,
    recomp_priority: canonicalRecompPriority,
    recomp_priorities: recompPriorities,
    performance_focus: performanceFocus,
    performance_focuses: performanceFocus,
    competition_type: competitionType,
    competition_date: competitionDate,
    competition_weight_category: competitionCategory,
    diet_preference: dietPreference,
    allergies,
  };

  const [showMathDetails, setShowMathDetails] = useState(false);

  const dynamicBlueprint = calculateDailyTargets(profilePayload);
  const goalExplanation = generateGoalExplanation(dynamicBlueprint, profilePayload);

  // Allergy Toggle Helper with strict mutual exclusivity for 'none'
  const toggleAllergy = (id) => {
    if (id === 'none') {
      setAllergies(['none']);
      return;
    }
    setAllergies((prev) => {
      const filtered = prev.filter((item) => item !== 'none');
      if (filtered.includes(id)) {
        const next = filtered.filter((item) => item !== id);
        return next.length === 0 ? ['none'] : next;
      } else {
        return [...filtered, id];
      }
    });
  };

  const handleAddCustomAllergy = (e) => {
    e.preventDefault();
    if (!customAllergy.trim()) return;
    const clean = customAllergy.trim();
    if (!allergies.includes(clean)) {
      setAllergies((prev) => [...prev.filter((i) => i !== 'none'), clean]);
    }
    setCustomAllergy('');
  };

  // Step 1 Validation
  const handleProceedFromStep1 = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
      setErrorMsg('Please enter a valid age between 10 and 120.');
      return;
    }

    if (isNaN(parsedHeightCm) || parsedHeightCm < 50 || parsedHeightCm > 250) {
      setErrorMsg('Please enter a valid height between 50 cm and 250 cm (approx. 20 to 98 inches).');
      return;
    }

    if (isNaN(parsedWeight) || parsedWeight <= 20 || parsedWeight > 350) {
      setErrorMsg('Please enter a valid weight in kg (20 - 350 kg).');
      return;
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2 Validation
  const handleProceedFromStep2 = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (worksOut && (isNaN(parsedDuration) || parsedDuration < 5)) {
      setErrorMsg('Please enter a valid workout duration (at least 5 minutes).');
      return;
    }

    if (worksOut && goesToGym && (isNaN(parsedGymDuration) || parsedGymDuration < 15)) {
      setErrorMsg('Please enter a valid gym session duration (at least 15 minutes).');
      return;
    }

    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 Validation -> Proceed to Blueprint Reveal
  const handleProceedFromStep3 = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if ((primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle') && targetWeight) {
      if (isNaN(parsedTargetWeight) || parsedTargetWeight < 20 || parsedTargetWeight > 350) {
        setErrorMsg('Please enter a valid target weight in kg (20 - 350 kg).');
        return;
      }
    }

    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Save to Supabase (Real Users)
  const handleFinalSave = async () => {
    setErrorMsg('');

    const profileData = {
      user_id: user?.id,
      ...profilePayload,
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
        setErrorMsg('The user_profiles table has not been updated in Supabase yet. Please run the migration script below.');
      } else {
        setErrorMsg(err.message || 'Could not save profile to Supabase. Check user_profiles table setup.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center">
      
      {/* Ambient Backlight Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#ff2d55]/10 via-[#30d158]/10 to-[#0a84ff]/10 rounded-full blur-3xl pointer-events-none opacity-60" />

      <div className="max-w-2xl w-full relative z-10">
        
        {/* Step Indicator Header (iOS Setup Assistant Style) */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-inset text-xs font-semibold text-[#30d158] mb-3 shadow-sm">
            <span className="caption-label text-[10px]">STEP {currentStep} OF 4</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-200">
              {currentStep === 1 && 'Biometrics & Daily Activity'}
              {currentStep === 2 && 'Training & Gym Routine'}
              {currentStep === 3 && 'Primary Goal & Nutrition'}
              {currentStep === 4 && 'Your Precision Blueprint'}
            </span>
          </div>

          <h1 className="display-title text-2xl sm:text-3xl text-white">
            {currentStep === 1 && 'Personalize Your Lifestyle'}
            {currentStep === 2 && 'Your Training & Movement'}
            {currentStep === 3 && 'Goals & Dietary Blueprint'}
            {currentStep === 4 && 'Your Dynamic Nutrition Blueprint'}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400 font-medium max-w-lg mx-auto">
            {currentStep === 1 && 'Every factor you enter dynamically formulates your personalized metabolic and caloric foundation.'}
            {currentStep === 2 && 'Tell us how you train so we can accurately estimate workout expenditure without double-counting.'}
            {currentStep === 3 && 'Set your primary body composition goals and dietary preferences for tailored meal planning.'}
            {currentStep === 4 && 'Precision Mifflin-St Jeor + MET calibrated nutritional blueprint formulated for your exact routine.'}
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

        {/* Multi-Step Wizard Container */}
        <AnimatePresence mode="wait">
          
          {/* ========================================================
             STEP 1: Biometrics & Daily Lifestyle Activity
             ======================================================== */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="glass-card rounded-[32px] p-6 sm:p-8 border-t border-t-white/15 shadow-2xl"
            >
              <form onSubmit={handleProceedFromStep1} className="space-y-5">
                
                {/* 1. Biological Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
                    1. Biological Gender
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {['Male', 'Female', 'Other'].map((g) => {
                      const isSelected = gender === g;
                      return (
                        <button
                          type="button"
                          key={g}
                          onClick={() => setGender(g)}
                          className={`btn-press py-3 px-3 rounded-2xl text-xs font-semibold transition-all relative ${
                            isSelected
                              ? 'bg-white/15 text-white border border-white/20 shadow-md'
                              : 'glass-inset text-slate-400 hover:text-white hover:bg-white/5'
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

                {/* 2. Biometrics: Age, Height, Weight */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Age */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                      2. Age (years)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        max="120"
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="26"
                        className="w-full px-4 py-3 glass-inset rounded-2xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 tabular-numbers"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                        yrs
                      </span>
                    </div>
                  </div>

                  {/* Height */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300 caption-label">
                        3. Height
                      </label>
                      <div className="inline-flex rounded-lg p-0.5 glass-inset text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleHeightUnitToggle('cm')}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                            heightUnit === 'cm'
                              ? 'bg-[#30d158] text-black shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          cm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHeightUnitToggle('ft_in')}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                            heightUnit === 'ft_in'
                              ? 'bg-[#30d158] text-black shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ft/in
                        </button>
                      </div>
                    </div>

                    {heightUnit === 'cm' ? (
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="50"
                          max="250"
                          required
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value)}
                          placeholder="175"
                          className="w-full px-4 py-3 glass-inset rounded-2xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 tabular-numbers"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                          cm
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="2"
                            max="8"
                            required
                            value={heightFeet}
                            onChange={(e) => setHeightFeet(e.target.value)}
                            placeholder="5"
                            className="w-full px-3 py-3 glass-inset rounded-2xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 tabular-numbers"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                            ft
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="11.9"
                            step="0.5"
                            required
                            value={heightInches}
                            onChange={(e) => setHeightInches(e.target.value)}
                            placeholder="9"
                            className="w-full px-3 py-3 glass-inset rounded-2xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 tabular-numbers"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                            in
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                      4. Weight (kg)
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
                        className="w-full px-4 py-3 glass-inset rounded-2xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 tabular-numbers"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Daily Normal Activity (Outside Workouts) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
                    5. What best describes your normal day outside workouts?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'mostly_sitting', label: 'Mostly sitting', desc: 'Desk job, studying' },
                      { id: 'lightly_active', label: 'Lightly active', desc: 'Standing, teaching' },
                      { id: 'moderately_active', label: 'Moderately active', desc: 'Retail, nursing, walking' },
                      { id: 'highly_active', label: 'Highly active', desc: 'Construction, farming' },
                    ].map((act) => {
                      const isSelected = dailyActivityLevel === act.id;
                      return (
                        <button
                          type="button"
                          key={act.id}
                          onClick={() => setDailyActivityLevel(act.id)}
                          className={`btn-press p-3 rounded-2xl text-left transition-all ${
                            isSelected
                              ? 'bg-white/15 border border-[#30d158]/50 text-white shadow-sm'
                              : 'glass-inset text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="block text-xs font-bold">{act.label}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">{act.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Daily Walking / Movement */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-300 caption-label flex items-center space-x-1.5">
                      <Footprints className="w-3.5 h-3.5 text-[#30d158]" />
                      <span>6. How much do you usually walk in a typical day?</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'less_15', label: '< 15 min', est: '~1,200 steps' },
                      { id: '15_30', label: '15–30 min', est: '~3,000 steps' },
                      { id: '30_60', label: '30–60 min', est: '~6,000 steps' },
                      { id: '60_90', label: '60–90 min', est: '~9,000 steps' },
                      { id: '90_plus', label: '90+ min', est: '12,000+ steps' },
                    ].map((w) => {
                      const isSelected = walkingDuration === w.id;
                      return (
                        <button
                          type="button"
                          key={w.id}
                          onClick={() => setWalkingDuration(w.id)}
                          className={`btn-press p-2.5 rounded-xl text-center transition-all ${
                            isSelected
                              ? 'bg-[#30d158]/20 border border-[#30d158] text-white shadow-sm'
                              : 'glass-inset text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="block text-xs font-bold text-white">{w.label}</span>
                          <span className="block text-[9px] text-[#30d158] mt-0.5">{w.est}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real-time Dynamic Mini-Ticker */}
                <div className="p-3.5 rounded-2xl glass border border-white/10 flex items-center justify-between text-xs">
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

                {/* Action Buttons: Back to Login & Step 2 */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (isDemoUser) {
                        await logout();
                      }
                      navigate('/login');
                    }}
                    className="btn-press flex items-center space-x-1.5 px-4 py-3.5 rounded-2xl glass text-slate-300 hover:text-white text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Login</span>
                  </button>

                  <button
                    type="submit"
                    className="btn-press flex-1 py-3.5 px-6 rounded-2xl bg-white text-black hover:bg-slate-100 font-bold text-sm shadow-xl flex items-center justify-center space-x-2"
                  >
                    <span>Next: Training Routine</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================
             STEP 2: Training & Gym Experience (Dynamic / Conditional)
             ======================================================== */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="glass-card rounded-[32px] p-6 sm:p-8 border-t border-t-white/15 shadow-2xl"
            >
              <form onSubmit={handleProceedFromStep2} className="space-y-5">
                
                {/* Smart Exercise Question: How do you usually exercise? */}
                <div className="p-4 rounded-2xl glass-inset space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Dumbbell className="w-4 h-4 text-[#30d158]" />
                      <span>How do you usually exercise?</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select all forms of structured exercise or sports that apply to you
                    </p>
                  </div>

                  {/* Multi-Select Exercise Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EXERCISE_OPTIONS.map((opt) => {
                      const isSelected = exerciseTypes.includes(opt.id);
                      const isNone = opt.id === 'none';
                      return (
                        <button
                          type="button"
                          key={opt.id}
                          onClick={() => toggleExerciseType(opt.id)}
                          className={`btn-press p-3 rounded-2xl text-left transition-all relative ${
                            isSelected
                              ? isNone
                                ? 'bg-white/20 border border-white/40 text-white shadow-md'
                                : 'bg-white/15 border border-[#30d158]/50 text-white shadow-md'
                              : 'glass-inset text-slate-400 hover:text-white'
                          } ${isNone ? 'sm:col-span-2' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{opt.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#30d158] shrink-0" />}
                          </div>
                          <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Exercise Sub-Questions (Smoothly revealed when worksOut is true) */}
                  <AnimatePresence>
                    {worksOut && (
                      <motion.div
                        key="active-exercise-subquestions"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                        className="pt-4 border-t border-white/10 space-y-4 overflow-hidden"
                      >
                        {/* Days per week */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
                            How many days per week do you train?
                          </label>
                          <div className="grid grid-cols-7 gap-1.5">
                            {[1, 2, 3, 4, 5, 6, 7].map((days) => {
                              const isSelected = workoutFrequency === days;
                              return (
                                <button
                                  type="button"
                                  key={days}
                                  onClick={() => setWorkoutFrequency(days)}
                                  className={`btn-press py-2 rounded-xl text-xs font-bold transition-all ${
                                    isSelected
                                      ? 'bg-[#30d158] text-black shadow-sm'
                                      : 'glass-inset text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {days}d
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Training Intensity */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
                            What best describes your training intensity?
                          </label>
                          <div className="grid grid-cols-3 gap-2">
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
                                  className={`btn-press p-2.5 text-left rounded-xl transition-all ${
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

                        {/* Typical workout duration */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-300 caption-label">
                              Typical workout duration (minutes)
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
                            <span className="px-3 py-1 rounded-xl glass text-[#30d158] font-bold text-xs min-w-[60px] text-center tabular-numbers">
                              {duration}m
                            </span>
                          </div>
                        </div>

                        {/* Gym Specific Energy Partitioning (Revealed only when Gym is selected in exerciseTypes) */}
                        <AnimatePresence>
                          {goesToGym && (
                            <motion.div
                              key="gym-specific-details"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                              className="p-3.5 rounded-2xl bg-white/5 border border-[#ffd60a]/20 space-y-3 overflow-hidden"
                            >
                              <div className="flex items-center space-x-2">
                                <Zap className="w-3.5 h-3.5 text-[#ffd60a]" />
                                <h5 className="text-xs font-bold text-white">Gym Session Energy Partitioning</h5>
                              </div>

                              {/* Gym Session Duration */}
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-300 caption-label mb-1.5">
                                  How long is your typical gym session?
                                </label>
                                <div className="grid grid-cols-6 gap-1.5">
                                  {['30', '45', '60', '75', '90', '120'].map((mins) => {
                                    const isSelected = gymDuration === mins;
                                    return (
                                      <button
                                        type="button"
                                        key={mins}
                                        onClick={() => setGymDuration(mins)}
                                        className={`btn-press py-1.5 rounded-lg text-xs font-bold transition-all ${
                                          isSelected
                                            ? 'bg-[#ffd60a] text-black shadow-sm'
                                            : 'glass-inset text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        {mins}m
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Cardio Subset Duration */}
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-300 caption-label mb-1.5">
                                  How much of that session is cardio?
                                </label>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {['0', '15', '30', '45', '60'].map((mins) => {
                                    const isSelected = cardioDuration === mins;
                                    return (
                                      <button
                                        type="button"
                                        key={mins}
                                        onClick={() => setCardioDuration(mins)}
                                        className={`btn-press py-1.5 rounded-lg text-xs font-bold transition-all ${
                                          isSelected
                                            ? 'bg-[#0a84ff] text-white shadow-sm'
                                            : 'glass-inset text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        {mins === '0' ? 'None (0m)' : `${mins}m`}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Cardio Types Multi-Select (Only when cardioDuration > 0) */}
                              {parseInt(cardioDuration, 10) > 0 && (
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[11px] font-semibold text-slate-300 caption-label">
                                      What type of cardio do you usually do?
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-normal">Select all that apply</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {['Treadmill', 'Running', 'Cycling', 'Elliptical', 'Stair Climber', 'Swimming', 'HIIT', 'Walking', 'Other'].map((type) => {
                                      const isSelected = cardioTypes.some((t) => t.toLowerCase() === type.toLowerCase());
                                      return (
                                        <button
                                          type="button"
                                          key={type}
                                          onClick={() => toggleCardioType(type)}
                                          className={`btn-press py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center space-x-1 ${
                                            isSelected
                                              ? 'bg-[#0a84ff]/30 border border-[#0a84ff] text-white shadow-sm font-bold'
                                              : 'glass-inset text-slate-400 hover:text-slate-200'
                                          }`}
                                        >
                                          {isSelected && <Check className="w-3 h-3 text-[#0a84ff] shrink-0" />}
                                          <span className="truncate">{type}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Real-time Dynamic Mini-Ticker */}
                <div className="p-3.5 rounded-2xl glass border border-white/10 flex items-center justify-between text-xs">
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

                {/* Step Navigation Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    data-testid="step2-prev-btn"
                    onClick={() => setCurrentStep(1)}
                    className="btn-press flex items-center space-x-1.5 px-4 py-3.5 rounded-2xl glass text-slate-300 hover:text-white text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous Step</span>
                  </button>

                  <button
                    type="submit"
                    className="btn-press flex-1 py-3.5 px-6 rounded-2xl bg-white text-black hover:bg-slate-100 font-bold text-sm shadow-xl flex items-center justify-center space-x-2"
                  >
                    <span>Next: Goals & Diet</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================
             STEP 3: Goals & Dietary Preferences
             ======================================================== */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="glass-card rounded-[32px] p-6 sm:p-8 border-t border-t-white/15 shadow-2xl"
            >
              <form onSubmit={handleProceedFromStep3} className="space-y-5">
                
                {/* 1. Primary Goal Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
                    1. What is your primary goal?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'lose_fat', label: 'Lose Body Fat', desc: 'Burn fat while preserving lean muscle mass', icon: Flame, color: '#ff2d55' },
                      { id: 'gain_muscle', label: 'Gain Weight / Muscle', desc: 'Build lean muscle with a controlled surplus', icon: Dumbbell, color: '#30d158' },
                      { id: 'maintain', label: 'Maintain Weight', desc: 'Stabilize bodyweight & optimize metabolic health', icon: Scale, color: '#0a84ff' },
                      { id: 'recomposition', label: 'Body Recomposition', desc: 'Build muscle & lose fat at the same time', icon: Sparkles, color: '#bf5af2' },
                      { id: 'performance', label: 'Improve Performance', desc: 'Maximize endurance, power, and athletic recovery', icon: Zap, color: '#ffd60a' },
                      { id: 'competition', label: 'Competition Prep', desc: 'Targeted conditioning & weight-category readiness', icon: Trophy, color: '#ff9f0a' },
                    ].map((g) => {
                      const isSelected = primaryGoal === g.id;
                      const Icon = g.icon;
                      return (
                        <button
                          type="button"
                          key={g.id}
                          onClick={() => setPrimaryGoal(g.id)}
                          className={`btn-press p-3 text-left rounded-2xl transition-all relative ${
                            isSelected
                              ? 'bg-white/15 border border-white/30 text-white shadow-lg'
                              : 'glass-inset text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <Icon className="w-4 h-4" style={{ color: g.color }} />
                            <span className="text-xs font-bold text-white">{g.label}</span>
                          </div>
                          <span className="block text-[10px] text-slate-400 leading-tight">{g.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Goal Inputs */}
                {(primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle') && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl glass-inset border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-semibold text-slate-200">
                          What weight are you aiming for?
                        </label>
                        <span className="text-[11px] text-slate-400">Current weight: {parsedWeight} kg</span>
                      </div>
                      <div className="relative max-w-[130px]">
                        <input
                          type="number"
                          step="0.1"
                          value={targetWeight !== '' ? targetWeight : suggestedTargetWeight}
                          onChange={(e) => {
                            setTargetWeight(e.target.value);
                            setHasCustomTargetWeight(true);
                          }}
                          placeholder={String(suggestedTargetWeight)}
                          className="w-full px-3 py-2 glass rounded-xl text-white font-bold text-right text-xs focus:ring-1 focus:ring-[#30d158] tabular-numbers"
                        />
                        <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>

                    {/* Healthy Weight Reference Range & Suggested Target Helper */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <Scale className="w-3.5 h-3.5 text-[#0a84ff] shrink-0" />
                        <span>Estimated Healthy Range:</span>
                        <span className="font-bold text-white tabular-numbers">{healthyRange.minWeight} – {healthyRange.maxWeight} kg</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetWeight(String(suggestedTargetWeight));
                          setHasCustomTargetWeight(true);
                        }}
                        className="text-[#30d158] hover:underline font-semibold text-left sm:text-right"
                      >
                        Suggested Target: {suggestedTargetWeight} kg
                      </button>
                    </div>
                  </motion.div>
                )}

                {primaryGoal === 'recomposition' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl glass-inset border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-200">
                        What is your main priority during recomposition?
                      </label>
                      <span className="text-[10px] text-slate-400 font-normal">Select priorities</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'fat_loss', label: 'Reduce body fat' },
                        { id: 'muscle_gain', label: 'Build muscle' },
                        { id: 'both_equally', label: 'Both equally' },
                      ].map((item) => {
                        const isBoth = recompPriorities.includes('fat_loss') && recompPriorities.includes('muscle_gain');
                        const isSelected = item.id === 'both_equally'
                          ? isBoth
                          : recompPriorities.includes(item.id);

                        const handleClick = () => {
                          if (item.id === 'both_equally') {
                            setRecompPriorities(['fat_loss', 'muscle_gain']);
                          } else {
                            setRecompPriorities((prev) => {
                              const exists = prev.includes(item.id);
                              if (exists) {
                                const next = prev.filter((p) => p !== item.id);
                                return next.length === 0 ? [item.id] : next;
                              } else {
                                return [...prev, item.id];
                              }
                            });
                          }
                        };

                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={handleClick}
                            className={`btn-press py-2 px-2 text-center rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                              isSelected
                                ? 'bg-[#bf5af2] text-white shadow-sm font-bold'
                                : 'glass text-slate-400 hover:text-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {primaryGoal === 'performance' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl glass-inset border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-200">
                        What type of performance are you focusing on?
                      </label>
                      <span className="text-[10px] text-slate-400 font-normal">Select all that apply</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'strength', label: 'Strength' },
                        { id: 'endurance', label: 'Endurance' },
                        { id: 'general', label: 'General Fitness' },
                        { id: 'sports', label: 'Sports Specific' },
                      ].map((item) => {
                        const isSelected = performanceFocus.includes(item.id);
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => togglePerformanceFocus(item.id)}
                            className={`btn-press py-2 px-2 text-center rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                              isSelected
                                ? 'bg-[#ffd60a] text-black shadow-sm font-bold'
                                : 'glass text-slate-400 hover:text-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-black shrink-0" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {primaryGoal === 'competition' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl glass-inset border border-white/10 space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        What type of competition?
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['Bodybuilding / Physique', 'Powerlifting', 'Weightlifting', 'Running', 'Cycling', 'Swimming', 'Combat Sports', 'Team Sports', 'Other'].map((comp) => (
                          <button
                            type="button"
                            key={comp}
                            onClick={() => setCompetitionType(comp)}
                            className={`btn-press py-1.5 px-2 text-center rounded-lg text-[11px] font-semibold transition-all ${
                              competitionType === comp ? 'bg-[#ff9f0a] text-black' : 'glass text-slate-400 hover:text-white'
                            }`}
                          >
                            {comp}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 caption-label mb-1">
                          Competition Date
                        </label>
                        <input
                          type="date"
                          value={competitionDate}
                          onChange={(e) => setCompetitionDate(e.target.value)}
                          className="w-full px-3 py-2 glass rounded-xl text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 caption-label mb-1">
                          Target Weight Category (Optional)
                        </label>
                        <input
                          type="text"
                          value={competitionCategory}
                          onChange={(e) => setCompetitionCategory(e.target.value)}
                          placeholder="e.g. Under 75kg / Middleweight"
                          className="w-full px-3 py-2 glass rounded-xl text-xs text-white focus:outline-none placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. Diet Preference */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 caption-label mb-2 flex items-center space-x-1.5">
                    <Utensils className="w-3.5 h-3.5 text-[#30d158]" />
                    <span>2. What type of diet do you follow?</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'vegetarian', label: 'Vegetarian', desc: 'Plant foods + dairy' },
                      { id: 'non_vegetarian', label: 'Non-vegetarian', desc: 'Chicken, fish, eggs, meat' },
                      { id: 'eggetarian', label: 'Eggetarian', desc: 'Vegetarian + whole eggs' },
                      { id: 'vegan', label: 'Vegan', desc: '100% plant-based' },
                      { id: 'no_preference', label: 'No Preference', desc: 'Flexible omnivore' },
                    ].map((d) => {
                      const isSelected = dietPreference === d.id;
                      return (
                        <button
                          type="button"
                          key={d.id}
                          onClick={() => setDietPreference(d.id)}
                          className={`btn-press p-2.5 text-left rounded-xl transition-all ${
                            isSelected
                              ? 'bg-white/15 border border-[#30d158]/50 text-white shadow-sm'
                              : 'glass-inset text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="block text-xs font-bold text-white">{d.label}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{d.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Food Allergies & Foods to Avoid */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300 caption-label flex items-center space-x-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#ff2d55]" />
                    <span>3. Do you have any food allergies or foods you avoid?</span>
                  </label>

                  {/* None Option */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleAllergy('none')}
                      className={`btn-press px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
                        allergies.includes('none')
                          ? 'bg-[#30d158] text-black font-bold shadow-md'
                          : 'glass-inset text-slate-400 hover:text-white'
                      }`}
                    >
                      {allergies.includes('none') && <Check className="w-3.5 h-3.5 text-black shrink-0" />}
                      <span>None (No Allergies or Avoidances)</span>
                    </button>
                  </div>

                  {/* Allergies & Intolerances */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Allergies & Intolerances
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ALLERGY_INTOLERANCES.map((item) => {
                        const isSelected = allergies.includes(item.id);
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => toggleAllergy(item.id)}
                            className={`btn-press px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                              isSelected
                                ? 'bg-[#ff2d55]/30 border border-[#ff2d55] text-white font-bold shadow-sm'
                                : 'glass text-slate-400 hover:text-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-[#ff2d55] shrink-0" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Foods Chosen to Avoid */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Foods Chosen to Avoid
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {FOODS_TO_AVOID.map((item) => {
                        const isSelected = allergies.includes(item.id);
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => toggleAllergy(item.id)}
                            className={`btn-press px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                              isSelected
                                ? 'bg-[#ff9f0a]/30 border border-[#ff9f0a] text-white font-bold shadow-sm'
                                : 'glass text-slate-400 hover:text-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-[#ff9f0a] shrink-0" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Allergy Adder */}
                  <div className="mt-2.5 flex items-center space-x-2">
                    <input
                      type="text"
                      value={customAllergy}
                      onChange={(e) => setCustomAllergy(e.target.value)}
                      placeholder="Add custom food to avoid (e.g. Mushrooms, Mustard)..."
                      className="flex-1 px-3 py-2 glass rounded-xl text-xs text-white focus:outline-none placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAllergy}
                      className="btn-press px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Real-time Dynamic Mini-Ticker */}
                <div className="p-3.5 rounded-2xl glass border border-white/10 flex items-center justify-between text-xs">
                  <span className="flex items-center space-x-2 text-slate-300 font-medium">
                    <Activity className="w-4 h-4 text-[#30d158]" />
                    <span>Calculated Target:</span>
                  </span>
                  <div className="flex items-baseline space-x-1">
                    <span className="headline text-lg text-[#30d158] tabular-numbers">
                      {dynamicBlueprint.calories.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">kcal/day</span>
                  </div>
                </div>

                {/* Step Navigation Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    data-testid="step3-prev-btn"
                    onClick={() => setCurrentStep(2)}
                    className="btn-press flex items-center space-x-1.5 px-4 py-3.5 rounded-2xl glass text-slate-300 hover:text-white text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous Step</span>
                  </button>

                  <button
                    type="submit"
                    className="btn-press flex-1 py-3.5 px-6 rounded-2xl bg-white text-black hover:bg-slate-100 font-bold text-sm shadow-xl flex items-center justify-center space-x-2"
                  >
                    <span>Review Calculated Blueprint</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================
             STEP 4: Precision Calculated Blueprint Reveal Page
             ======================================================== */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="glass-card rounded-[32px] p-6 sm:p-8 border-t border-t-white/15 shadow-2xl space-y-5"
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#30d158]/20 via-[#0a84ff]/20 to-[#bf5af2]/20 border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#ffd60a]" />
                  </div>
                  <div>
                    <h3 className="headline text-lg text-white">Your Dynamic Daily Blueprint</h3>
                    <p className="text-xs text-slate-400">
                      Personalized calorie, macro, and pace calibration
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold text-[#30d158] caption-label border border-white/10">
                  AI CALIBRATED
                </span>
              </div>

              {/* Total Daily Calorie Card */}
              <div className="p-6 rounded-[24px] glass-inset border border-white/10 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="caption-label text-[11px] text-slate-400 block">
                      TOTAL DAILY TARGET INTAKE
                    </span>
                    <div className="mt-1 flex items-baseline space-x-2">
                      <span className="display-title text-4xl sm:text-5xl text-white tabular-numbers">
                        {dynamicBlueprint.calories.toLocaleString()}
                      </span>
                      <span className="text-sm font-semibold text-[#30d158]">kcal / day</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#30d158]/15 border border-[#30d158]/30 flex items-center justify-center text-[#30d158] shadow-lg">
                    <Flame className="w-7 h-7" />
                  </div>
                </div>

                {/* Status Sub-badge */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
                  <div className="px-3 py-1 rounded-xl bg-white/10 text-slate-300 font-medium flex items-center space-x-1.5">
                    <span>Maintenance TDEE:</span>
                    <span className="font-bold text-white tabular-numbers">{dynamicBlueprint.maintenanceCalories.toLocaleString()} kcal</span>
                  </div>
                  <div className={`px-3 py-1 rounded-xl font-bold flex items-center space-x-1.5 ${
                    dynamicBlueprint.goalAdjustment < 0
                      ? 'bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/30'
                      : dynamicBlueprint.goalAdjustment > 0
                      ? 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30'
                      : 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30'
                  }`}>
                    {dynamicBlueprint.goalAdjustment < 0 ? (
                      <>
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>{Math.abs(dynamicBlueprint.goalAdjustment)} kcal/day Deficit</span>
                      </>
                    ) : dynamicBlueprint.goalAdjustment > 0 ? (
                      <>
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{dynamicBlueprint.goalAdjustment} kcal/day Surplus</span>
                      </>
                    ) : (
                      <>
                        <Scale className="w-3.5 h-3.5" />
                        <span>Exact Maintenance Balance</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* "What This Means For You" Coach Insight Card */}
              <div className="p-5 sm:p-6 rounded-[24px] bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/15 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#ffd60a] to-[#ff9f0a] flex items-center justify-center text-black shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        What This Means For You
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {goalExplanation.title}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] font-semibold text-slate-300">
                    Coach Insight
                  </span>
                </div>

                {/* Conversational Explanation Paragraph */}
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {goalExplanation.summary}
                </p>

                {/* Estimated Pace Banner */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#ffd60a]">
                    <Target className="w-4 h-4 text-[#ffd60a] shrink-0" />
                    <span>{goalExplanation.paceBadge}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    {goalExplanation.paceText}
                  </p>
                  <p className="text-[10px] text-slate-400 italic pt-1 border-t border-white/5">
                    *{goalExplanation.disclaimer}
                  </p>
                </div>

                {/* 3 Scannable Highlight Chips */}
                {goalExplanation.highlights && goalExplanation.highlights.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {goalExplanation.highlights.map((h, idx) => (
                      <div key={idx} className="p-3 rounded-xl glass border border-white/10 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">{h.label}</span>
                        <div className="text-xs sm:text-sm font-bold text-white mt-0.5 tabular-numbers" style={{ color: h.color }}>
                          {h.value}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 leading-tight">{h.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Body Weight & Healthy Range Breakdown Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-2xl glass-inset border border-white/10 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold caption-label">CURRENT WEIGHT</span>
                  <div className="display-title text-xl text-white mt-1 tabular-numbers">{parsedWeight} kg</div>
                  <span className="text-[10px] text-slate-400 mt-1">Starting baseline</span>
                </div>

                <div className="p-3.5 rounded-2xl glass-inset border border-white/10 flex flex-col justify-between">
                  <span className="text-[10px] text-[#30d158] font-semibold caption-label">
                    {primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle' ? 'TARGET WEIGHT' : 'GOAL FOCUS'}
                  </span>
                  <div className="display-title text-xl text-[#30d158] mt-1 tabular-numbers">
                    {primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle' 
                      ? `${parsedTargetWeight || suggestedTargetWeight} kg`
                      : primaryGoal.replace('_', ' ').toUpperCase()}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle' 
                      ? (targetWeight !== '' ? 'Custom target' : 'Calibrated suggested target')
                      : 'Weight maintenance / recomp'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl glass-inset border border-white/10 flex flex-col justify-between">
                  <span className="text-[10px] text-[#0a84ff] font-semibold caption-label">ESTIMATED HEALTHY RANGE</span>
                  <div className="display-title text-xl text-[#0a84ff] mt-1 tabular-numbers">
                    {healthyRange.minWeight} – {healthyRange.maxWeight} kg
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">BMI 18.5–24.9 reference</span>
                </div>
              </div>

              {/* Macronutrient Targets Grid */}
              <div>
                <h4 className="caption-label text-[11px] text-slate-400 mb-2.5">
                  Macronutrient Energy Distribution
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Protein */}
                  <div className="p-3.5 rounded-2xl glass border-t border-t-white/10 flex flex-col justify-between">
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
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {dynamicBlueprint.factors.proteinPerKg}g/kg bodyweight
                    </p>
                  </div>

                  {/* Carbs */}
                  <div className="p-3.5 rounded-2xl glass border-t border-t-white/10 flex flex-col justify-between">
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
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Glycogen & daily fuel
                    </p>
                  </div>

                  {/* Fats */}
                  <div className="p-3.5 rounded-2xl glass border-t border-t-white/10 flex flex-col justify-between">
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
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      25% hormonal baseline
                    </p>
                  </div>

                  {/* Fiber */}
                  <div className="p-3.5 rounded-2xl glass border-t border-t-white/10 flex flex-col justify-between">
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
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      14g per 1000 kcal
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical Calculation Pipeline Accordion / Section */}
              <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowMathDetails(!showMathDetails)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4 text-[#0a84ff]" />
                    <span className="text-xs font-bold text-slate-200">
                      Under the Hood: Technical Formula Breakdown
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <span>{showMathDetails ? 'Hide' : 'Inspect Math'}</span>
                    {showMathDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence>
                  {showMathDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                      className="p-4 pt-0 border-t border-white/5 overflow-hidden"
                    >
                      <p className="text-[11px] text-slate-400 mb-3">
                        Every calorie is mathematically derived using Mifflin-St Jeor BMR, sedentary baseline, non-resting activity, and MET exercise burn without double counting.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between glass p-2.5 rounded-xl">
                          <span className="text-slate-400">Basal Metabolism (BMR):</span>
                          <span className="tabular-numbers font-bold text-white">{dynamicBlueprint.bmr} kcal</span>
                        </div>
                        <div className="flex items-center justify-between glass p-2.5 rounded-xl">
                          <span className="text-slate-400">Baseline Sedentary (1.2x):</span>
                          <span className="tabular-numbers font-bold text-white">{dynamicBlueprint.baselineEnergy} kcal</span>
                        </div>
                        <div className="flex items-center justify-between glass p-2.5 rounded-xl">
                          <span className="text-slate-400">General Activity + Walking:</span>
                          <span className="tabular-numbers font-bold text-[#0a84ff]">
                            +{dynamicBlueprint.generalActivityBurn + dynamicBlueprint.incrementalWalkingBurn} kcal
                          </span>
                        </div>
                        <div className="flex items-center justify-between glass p-2.5 rounded-xl">
                          <span className="text-slate-400">Structured Workout Burn:</span>
                          <span className="tabular-numbers font-bold text-[#30d158]">
                            +{dynamicBlueprint.workoutCalories} kcal
                          </span>
                        </div>
                        <div className="flex items-center justify-between glass p-2.5 rounded-xl">
                          <span className="text-slate-400">Maintenance TDEE:</span>
                          <span className="tabular-numbers font-bold text-amber-300">
                            {dynamicBlueprint.maintenanceCalories} kcal
                          </span>
                        </div>
                        <div className="flex items-center justify-between glass p-2.5 rounded-xl">
                          <span className="text-slate-400">Goal Adjustment:</span>
                          <span className={`tabular-numbers font-bold ${
                            dynamicBlueprint.goalAdjustment < 0 ? 'text-[#ff2d55]' : dynamicBlueprint.goalAdjustment > 0 ? 'text-[#30d158]' : 'text-slate-300'
                          }`}>
                            {dynamicBlueprint.goalAdjustment > 0 ? `+${dynamicBlueprint.goalAdjustment}` : dynamicBlueprint.goalAdjustment} kcal
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input Factor Review Pill Bar */}
              <div className="p-3 rounded-2xl glass-inset text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-300">Active Profile Blueprint:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg text-slate-200 font-medium">{gender}</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg text-slate-200 font-medium">{age} yrs</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg text-slate-200 font-medium">
                    {heightUnit === 'ft_in' ? `${heightFeet}′${heightInches}″` : `${heightCm} cm`}
                  </span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg text-slate-200 font-medium">{weight} kg</span>
                  <span className="bg-[#0a84ff]/20 text-[#0a84ff] px-2 py-0.5 rounded-lg font-medium">
                    {primaryGoal.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="bg-[#30d158]/20 text-[#30d158] px-2 py-0.5 rounded-lg font-medium">
                    {dietPreference.replace('_', ' ')}
                  </span>
                  {worksOut && (
                    <span className="bg-white/10 px-2 py-0.5 rounded-lg text-slate-200 font-medium">
                      {goesToGym ? `Gym (${gymDuration}m)` : `${intensity} (${duration}m)`}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  data-testid="step4-prev-btn"
                  onClick={() => setCurrentStep(3)}
                  className="btn-press flex items-center justify-center space-x-1.5 py-3.5 px-4 rounded-2xl glass text-slate-300 hover:text-white text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous Step</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn-press flex items-center justify-center space-x-1.5 py-3.5 px-4 rounded-2xl glass text-slate-400 hover:text-white text-xs font-bold"
                >
                  <span>Adjust Inputs</span>
                </button>

                {!isDemoUser && (
                  <button
                    type="button"
                    onClick={handleFinalSave}
                    disabled={loading}
                    className="btn-press flex-1 py-3.5 px-6 rounded-2xl bg-[#30d158] hover:bg-[#30d158]/90 text-black font-bold text-sm shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50"
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
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}
