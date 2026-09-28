import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Check, 
  Loader2, 
  Footprints, 
  Dumbbell, 
  Flame, 
  Utensils, 
  ShieldAlert, 
  ArrowRight,
  Zap,
  Scale,
  Activity,
  Calendar,
  Trophy
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { upsertUserProfile } from '../lib/supabase';
import { 
  calculateDailyTargets, 
  getMissingProfileFields, 
  cmToFeetInches, 
  feetInchesToCm, 
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

export function CompleteProfileModal({ isOpen, onClose }) {
  const { user, profile, isDemoUser, refreshProfile, setProfile } = useAuth();

  // 1. Core Biometrics
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('26');
  const [weight, setWeight] = useState('72');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [heightCm, setHeightCm] = useState('175');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('9');

  // 2. Activity & Lifestyle
  const [dailyActivityLevel, setDailyActivityLevel] = useState('mostly_sitting');
  const [walkingDuration, setWalkingDuration] = useState('15_30');

  // 3. Training & Gym (Smart Exercise Mode)
  const [exerciseTypes, setExerciseTypes] = useState(['gym']);
  const [worksOut, setWorksOut] = useState(true);
  const [workoutFrequency, setWorkoutFrequency] = useState(4);
  const [intensity, setIntensity] = useState('Medium');
  const [duration, setDuration] = useState('45');
  const [goesToGym, setGoesToGym] = useState(false);
  const [gymFrequency, setGymFrequency] = useState(4);
  const [gymDuration, setGymDuration] = useState('60');
  const [cardioDuration, setCardioDuration] = useState('15');
  const [cardioTypes, setCardioTypes] = useState(['Treadmill']);

  // 4. Goals
  const [primaryGoal, setPrimaryGoal] = useState('lose_fat');
  const [targetWeight, setTargetWeight] = useState('');
  const [hasCustomTargetWeight, setHasCustomTargetWeight] = useState(false);
  const [recompPriorities, setRecompPriorities] = useState(['fat_loss', 'muscle_gain']);
  const [performanceFocus, setPerformanceFocus] = useState(['strength']);
  const [competitionType, setCompetitionType] = useState('bodybuilding');
  const [competitionDate, setCompetitionDate] = useState('');
  const [competitionCategory, setCompetitionCategory] = useState('');

  // 5. Nutrition Preferences
  const [dietPreference, setDietPreference] = useState('non_vegetarian');
  const [allergies, setAllergies] = useState(['none']);
  const [customAllergies, setCustomAllergies] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state with existing profile on modal open
  useEffect(() => {
    if (isOpen && profile) {
      setGender(profile.gender || 'Male');
      setAge(String(profile.age || 26));
      setWeight(String(profile.weight || 70));

      const hUnit = profile.height_unit || 'cm';
      setHeightUnit(hUnit);
      if (profile.height || profile.height_cm) {
        const val = Number(profile.height || profile.height_cm);
        setHeightCm(String(val));
        const { feet, inches } = cmToFeetInches(val);
        setHeightFeet(String(feet));
        setHeightInches(String(inches));
      } else {
        const defaultCm = (profile.gender?.toLowerCase() === 'female') ? 163 : 176;
        setHeightCm(String(defaultCm));
        const { feet, inches } = cmToFeetInches(defaultCm);
        setHeightFeet(String(feet));
        setHeightInches(String(inches));
      }

      setDailyActivityLevel(profile.daily_activity_level || 'mostly_sitting');
      setWalkingDuration(profile.walking_duration || '15_30');

      // Exercise sync
      let loadedExercises = ['gym'];
      if (Array.isArray(profile.exercise_types) && profile.exercise_types.length > 0) {
        loadedExercises = profile.exercise_types;
      } else if (profile.works_out === false) {
        loadedExercises = ['none'];
      } else if (profile.goes_to_gym) {
        loadedExercises = ['gym'];
      } else if (profile.works_out) {
        loadedExercises = ['home_workouts'];
      }
      setExerciseTypes(loadedExercises);

      const isWorkingOut = loadedExercises.some((t) => t !== 'none');
      setWorksOut(isWorkingOut);
      setWorkoutFrequency(profile.workout_frequency || 4);
      setIntensity(profile.intensity || 'Medium');
      setDuration(String(profile.duration || 45));

      setGoesToGym(loadedExercises.includes('gym'));
      setGymFrequency(profile.gym_frequency || 4);
      setGymDuration(String(profile.gym_duration || 60));
      setCardioDuration(String(profile.cardio_duration || 15));

      const loadedCardios = Array.isArray(profile.cardio_types) && profile.cardio_types.length > 0
        ? profile.cardio_types
        : (profile.cardio_type ? profile.cardio_type.split(',').map(s => s.trim()) : ['Treadmill']);
      setCardioTypes(loadedCardios);

      setPrimaryGoal(profile.primary_goal || 'lose_fat');
      if (profile.target_weight) {
        setTargetWeight(String(profile.target_weight));
        setHasCustomTargetWeight(true);
      } else {
        setTargetWeight('');
        setHasCustomTargetWeight(false);
      }

      const loadedRecomps = Array.isArray(profile.recomp_priorities) && profile.recomp_priorities.length > 0
        ? profile.recomp_priorities
        : (profile.recomp_priority === 'fat_loss' ? ['fat_loss'] : (profile.recomp_priority === 'muscle_gain' ? ['muscle_gain'] : ['fat_loss', 'muscle_gain']));
      setRecompPriorities(loadedRecomps);

      const loadedPerf = Array.isArray(profile.performance_focus) && profile.performance_focus.length > 0
        ? profile.performance_focus
        : (profile.performance_focus ? [profile.performance_focus] : ['strength']);
      setPerformanceFocus(loadedPerf);

      setCompetitionType(profile.competition_type || 'bodybuilding');
      setCompetitionDate(profile.competition_date || '');
      setCompetitionCategory(profile.competition_weight_category || '');

      setDietPreference(profile.diet_preference || 'non_vegetarian');
      setAllergies(Array.isArray(profile.allergies) ? profile.allergies : ['none']);
      setCustomAllergies(profile.custom_allergies || '');
      setErrorMessage('');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // Numerical Parsing & Derived Values
  const parsedAge = parseInt(age, 10) || 26;
  const parsedWeight = parseFloat(weight) || 70;
  const parsedHeightCm = heightUnit === 'cm'
    ? (parseFloat(heightCm) || 175)
    : feetInchesToCm(parseInt(heightFeet, 10) || 0, parseFloat(heightInches) || 0);

  const healthyRange = calculateHealthyWeightRange(parsedHeightCm, gender);
  const suggestedTargetWeight = getSuggestedTargetWeight(parsedWeight, parsedHeightCm, primaryGoal, gender);
  const parsedTargetWeight = (primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle')
    ? (targetWeight !== '' && !isNaN(parseFloat(targetWeight)) ? parseFloat(targetWeight) : suggestedTargetWeight)
    : null;

  const isBothRecompSelected = recompPriorities.includes('fat_loss') && recompPriorities.includes('muscle_gain');
  const canonicalRecompPriority = isBothRecompSelected
    ? 'both_equally'
    : (recompPriorities.includes('fat_loss') ? 'fat_loss' : (recompPriorities.includes('muscle_gain') ? 'muscle_gain' : 'both_equally'));

  // Live Blueprint Calculation
  const livePayload = {
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
    duration: worksOut ? (parseInt(duration, 10) || 45) : 0,
    daily_activity_level: dailyActivityLevel,
    walking_duration: walkingDuration,
    goes_to_gym: worksOut && goesToGym,
    gym_frequency: worksOut && goesToGym ? gymFrequency : 0,
    gym_duration: goesToGym ? (parseInt(gymDuration, 10) || 60) : 0,
    cardio_duration: goesToGym ? Math.min(parseInt(gymDuration, 10) || 60, parseInt(cardioDuration, 10) || 0) : 0,
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
    custom_allergies: customAllergies.trim(),
  };
  const liveTargets = calculateDailyTargets(livePayload);

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

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const updatedProfile = {
      user_id: user?.id,
      ...profile,
      ...livePayload,
      updated_at: new Date().toISOString(),
    };

    try {
      setSaving(true);

      if (isDemoUser) {
        setProfile((prev) => ({
          ...prev,
          ...updatedProfile,
        }));
        onClose();
        return;
      }

      await upsertUserProfile(updatedProfile);
      await refreshProfile();
      onClose();
    } catch (err) {
      console.error('Error completing profile:', err);
      setErrorMessage(err.message || 'Could not save profile details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-xl bg-slate-900/95 border border-white/15 rounded-[28px] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#30d158] to-[#0a84ff] flex items-center justify-center text-black font-black shadow-lg">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="headline text-base sm:text-lg text-white">
                {profile ? 'Review Your Personalized Routine' : 'Complete Your NutriPulse Profile'}
              </h3>
              <p className="text-xs text-slate-400">
                {profile 
                  ? "Welcome back. Let's make sure your profile still reflects your current routine."
                  : "Personalize your biometrics, activity, and goals for precision energy targets."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="btn-press p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* 1. Biometrics Section */}
          <div className="space-y-3">
            <span className="caption-label text-[10px] text-[#30d158] font-bold block">
              1. BIOMETRICS & HEIGHT
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Age */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 caption-label mb-1">
                  Age (yrs)
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 glass-inset rounded-xl text-white font-semibold text-xs tabular-numbers"
                />
              </div>

              {/* Height */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-300 caption-label">
                    Height
                  </label>
                  <div className="inline-flex rounded-lg p-0.5 glass-inset text-[9px]">
                    <button
                      type="button"
                      onClick={() => handleHeightUnitToggle('cm')}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        heightUnit === 'cm' ? 'bg-[#30d158] text-black' : 'text-slate-400'
                      }`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHeightUnitToggle('ft_in')}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        heightUnit === 'ft_in' ? 'bg-[#30d158] text-black' : 'text-slate-400'
                      }`}
                    >
                      ft/in
                    </button>
                  </div>
                </div>
                {heightUnit === 'cm' ? (
                  <input
                    type="number"
                    step="0.5"
                    min="50"
                    max="250"
                    required
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full px-3 py-2 glass-inset rounded-xl text-white font-semibold text-xs tabular-numbers"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      min="2"
                      max="8"
                      required
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(e.target.value)}
                      placeholder="ft"
                      className="w-full px-2 py-2 glass-inset rounded-xl text-white font-semibold text-xs tabular-numbers"
                    />
                    <input
                      type="number"
                      min="0"
                      max="11.9"
                      step="0.5"
                      required
                      value={heightInches}
                      onChange={(e) => setHeightInches(e.target.value)}
                      placeholder="in"
                      className="w-full px-2 py-2 glass-inset rounded-xl text-white font-semibold text-xs tabular-numbers"
                    />
                  </div>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 caption-label mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="350"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 glass-inset rounded-xl text-white font-semibold text-xs tabular-numbers"
                />
              </div>
            </div>
          </div>

          {/* 2. Daily Activity Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
              2. Normal Day Outside Workouts
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'mostly_sitting', label: 'Mostly sitting', desc: 'Desk job, studying' },
                { id: 'lightly_active', label: 'Lightly active', desc: 'Standing, teaching' },
                { id: 'moderately_active', label: 'Moderately active', desc: 'Retail, nursing, on feet' },
                { id: 'highly_active', label: 'Highly active', desc: 'Heavy physical work' },
              ].map((act) => (
                <button
                  type="button"
                  key={act.id}
                  onClick={() => setDailyActivityLevel(act.id)}
                  className={`btn-press p-2.5 rounded-xl text-left transition-all ${
                    dailyActivityLevel === act.id
                      ? 'bg-white/15 border border-[#30d158]/50 text-white shadow-sm'
                      : 'glass-inset text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block text-xs font-bold text-white">{act.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{act.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Walking Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 caption-label mb-2 flex items-center space-x-1.5">
              <Footprints className="w-3.5 h-3.5 text-[#30d158]" />
              <span>3. Daily Walking Amount</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'less_15', label: '< 15m' },
                { id: '15_30', label: '15–30m' },
                { id: '30_60', label: '30–60m' },
                { id: '60_90', label: '60–90m' },
                { id: '90_plus', label: '90+m' },
              ].map((w) => (
                <button
                  type="button"
                  key={w.id}
                  onClick={() => setWalkingDuration(w.id)}
                  className={`btn-press py-2 rounded-xl text-xs font-bold transition-all ${
                    walkingDuration === w.id
                      ? 'bg-[#30d158] text-black'
                      : 'glass-inset text-slate-400 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Smart Exercise Routine */}
          <div className="p-3.5 rounded-2xl glass-inset space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white caption-label flex items-center space-x-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-[#30d158]" />
                <span>4. How do you usually exercise?</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Multi-select forms of exercise or sports that apply to you
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {EXERCISE_OPTIONS.map((opt) => {
                const isSelected = exerciseTypes.includes(opt.id);
                const isNone = opt.id === 'none';
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => toggleExerciseType(opt.id)}
                    className={`btn-press p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? isNone
                          ? 'bg-white/20 border border-white/40 text-white shadow-sm'
                          : 'bg-[#30d158]/20 border border-[#30d158] text-white shadow-sm'
                        : 'glass text-slate-400 hover:text-white'
                    } ${isNone ? 'col-span-2' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{opt.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-[#30d158] shrink-0" />}
                    </div>
                    <span className="block text-[9px] text-slate-400 mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>

            {worksOut && (
              <div className="pt-2.5 border-t border-white/10 space-y-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 caption-label mb-1">
                    Days per week: {workoutFrequency}d
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setWorkoutFrequency(d)}
                        className={`btn-press py-1 rounded-lg text-xs font-bold ${
                          workoutFrequency === d ? 'bg-[#30d158] text-black' : 'glass text-slate-400'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 caption-label mb-1">
                    Intensity: {intensity}
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {['Small', 'Medium', 'Intensive'].map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setIntensity(item)}
                        className={`btn-press py-1.5 px-1 rounded-lg text-[10px] font-semibold ${
                          intensity === item ? 'bg-white/20 text-white border border-white/30' : 'glass text-slate-400'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-300 font-semibold">Typical duration:</span>
                    <span className="text-[#30d158] font-bold tabular-numbers">{duration} mins</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="180"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full accent-[#30d158] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                {goesToGym && (
                  <div className="p-2.5 rounded-xl bg-white/5 border border-[#ffd60a]/20 space-y-2">
                    <span className="text-[10px] font-bold text-[#ffd60a] block">Gym Session Energy Details</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-slate-400 mb-0.5">Session Length</label>
                        <select
                          value={gymDuration}
                          onChange={(e) => setGymDuration(e.target.value)}
                          className="w-full px-2 py-1 glass rounded-lg text-xs text-white"
                        >
                          {['30', '45', '60', '75', '90', '120'].map((m) => (
                            <option key={m} value={m} className="bg-slate-900 text-white">{m} mins</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-400 mb-0.5">Cardio Portion</label>
                        <select
                          value={cardioDuration}
                          onChange={(e) => setCardioDuration(e.target.value)}
                          className="w-full px-2 py-1 glass rounded-lg text-xs text-white"
                        >
                          {['0', '15', '30', '45', '60'].map((m) => (
                            <option key={m} value={m} className="bg-slate-900 text-white">{m} mins</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Primary Goal & Target Weight */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 caption-label mb-2 flex items-center space-x-1.5">
              <Flame className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span>5. Primary Body Goal</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'lose_fat', label: 'Lose Fat' },
                { id: 'gain_muscle', label: 'Gain Muscle' },
                { id: 'maintain', label: 'Maintain' },
                { id: 'recomposition', label: 'Recomp' },
                { id: 'performance', label: 'Performance' },
                { id: 'competition', label: 'Competition' },
              ].map((g) => (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => setPrimaryGoal(g.id)}
                  className={`btn-press p-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                    primaryGoal === g.id
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'glass-inset text-slate-400 hover:text-white'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Target Weight & Healthy Range */}
            {(primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle') && (
              <div className="mt-3 p-3.5 rounded-xl glass-inset border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200">
                      Target Goal Weight
                    </label>
                    <span className="text-[11px] text-slate-400">Current: {parsedWeight} kg</span>
                  </div>
                  <div className="relative max-w-[120px]">
                    <input
                      type="number"
                      step="0.1"
                      value={targetWeight !== '' ? targetWeight : suggestedTargetWeight}
                      onChange={(e) => {
                        setTargetWeight(e.target.value);
                        setHasCustomTargetWeight(true);
                      }}
                      placeholder={String(suggestedTargetWeight)}
                      className="w-full px-3 py-1.5 glass rounded-lg text-white font-bold text-right text-xs focus:ring-1 focus:ring-[#30d158] tabular-numbers"
                    />
                    <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px]">
                  <div className="flex items-center space-x-1.5 text-slate-300">
                    <Scale className="w-3 h-3 text-[#0a84ff] shrink-0" />
                    <span>Healthy Range:</span>
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
              </div>
            )}

            {primaryGoal === 'recomposition' && (
              <div className="mt-3 p-3 rounded-xl glass-inset border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-200">
                    Recomposition Priorities
                  </label>
                  <span className="text-[10px] text-slate-400">Multi-select</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'fat_loss', label: 'Reduce body fat' },
                    { id: 'muscle_gain', label: 'Build muscle' },
                    { id: 'both_equally', label: 'Both equally' },
                  ].map((item) => {
                    const isBoth = recompPriorities.includes('fat_loss') && recompPriorities.includes('muscle_gain');
                    const isSelected = item.id === 'both_equally' ? isBoth : recompPriorities.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
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
                        }}
                        className={`btn-press py-1.5 px-1 text-center rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center space-x-1 ${
                          isSelected ? 'bg-[#bf5af2] text-white font-bold' : 'glass text-slate-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {primaryGoal === 'performance' && (
              <div className="mt-3 p-3 rounded-xl glass-inset border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-200">
                    Performance Focus
                  </label>
                  <span className="text-[10px] text-slate-400">Multi-select</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'strength', label: 'Strength' },
                    { id: 'endurance', label: 'Endurance' },
                    { id: 'general', label: 'General' },
                    { id: 'sports', label: 'Sports' },
                  ].map((item) => {
                    const isSelected = performanceFocus.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => togglePerformanceFocus(item.id)}
                        className={`btn-press py-1.5 px-1 text-center rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center space-x-1 ${
                          isSelected ? 'bg-[#ffd60a] text-black font-bold' : 'glass text-slate-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-black shrink-0" />}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 6. Diet Preference */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 caption-label mb-2 flex items-center space-x-1.5">
              <Utensils className="w-3.5 h-3.5 text-[#30d158]" />
              <span>6. Dietary Preference</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'vegetarian', label: 'Vegetarian' },
                { id: 'non_vegetarian', label: 'Non-veg' },
                { id: 'eggetarian', label: 'Eggetarian' },
                { id: 'vegan', label: 'Vegan' },
                { id: 'no_preference', label: 'No Pref' },
              ].map((d) => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => setDietPreference(d.id)}
                  className={`btn-press py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                    dietPreference === d.id ? 'bg-[#30d158] text-black font-bold' : 'glass text-slate-400'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Food Allergies / Foods to Avoid */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-300 caption-label flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span>7. Foods to Avoid / Allergies</span>
            </label>

            <div>
              <button
                type="button"
                onClick={() => toggleAllergy('none')}
                className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold ${
                  allergies.includes('none') ? 'bg-[#30d158] text-black' : 'glass text-slate-400'
                }`}
              >
                None (No Allergies)
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Allergies & Intolerances
              </span>
              <div className="flex flex-wrap gap-1">
                {ALLERGY_INTOLERANCES.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggleAllergy(a.id)}
                    className={`btn-press px-2 py-1 rounded-lg text-[10px] font-semibold ${
                      allergies.includes(a.id) ? 'bg-[#ff2d55]/30 border border-[#ff2d55] text-white font-bold' : 'glass text-slate-400'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Foods Chosen to Avoid
              </span>
              <div className="flex flex-wrap gap-1">
                {FOODS_TO_AVOID.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggleAllergy(a.id)}
                    className={`btn-press px-2 py-1 rounded-lg text-[10px] font-semibold ${
                      allergies.includes(a.id) ? 'bg-[#ff9f0a]/30 border border-[#ff9f0a] text-white font-bold' : 'glass text-slate-400'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Other Foods to Avoid */}
            <div className="space-y-1.5 pt-1.5">
              <label className="block text-[11px] font-semibold text-slate-300">
                Other foods to avoid
              </label>
              <input
                type="text"
                value={customAllergies}
                onChange={(e) => setCustomAllergies(e.target.value)}
                placeholder="e.g. mushrooms, avocado, prawns, a specific ingredient..."
                className="w-full px-3 py-2 glass rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#30d158] placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Real-time Target Calorie Ticker */}
          <div className="p-3 rounded-2xl glass border border-white/10 flex items-center justify-between text-xs">
            <span className="flex items-center space-x-2 text-slate-300 font-medium">
              <Activity className="w-4 h-4 text-[#30d158]" />
              <span>Recalculated Target:</span>
            </span>
            <div className="flex items-baseline space-x-1">
              <span className="headline text-base text-[#30d158] tabular-numbers font-bold">
                {liveTargets.calories.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">kcal/day</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-press flex-1 py-3 rounded-2xl glass text-slate-300 hover:text-white text-xs font-bold"
            >
              Maybe Later
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-press flex-1 py-3 rounded-2xl bg-[#30d158] hover:bg-[#30d158]/90 text-black font-bold text-xs shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <span>Save & Recalibrate</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
