import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Settings as SettingsIcon, 
  Dumbbell, 
  Flame, 
  Check, 
  Loader2, 
  Scale, 
  Wheat, 
  Droplet,
  Sparkles,
  Footprints,
  Zap,
  Utensils,
  ShieldAlert,
  Trophy
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { upsertUserProfile } from '../lib/supabase';
import { calculateDailyTargets, cmToFeetInches, feetInchesToCm } from '../services/nutrition';

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

export function SettingsModal({ isOpen, onClose }) {
  const { user, profile, isDemoUser, refreshProfile, setProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('biometrics'); // 'biometrics' | 'activity' | 'goals' | 'diet'

  // 1. Core Biometrics
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('26');
  const [weight, setWeight] = useState('72');
  const [heightUnit, setHeightUnit] = useState('cm'); // 'cm' | 'ft_in'
  const [heightCm, setHeightCm] = useState('175');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('9');

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

  // 2. Activity & Movement
  const [dailyActivityLevel, setDailyActivityLevel] = useState('mostly_sitting');
  const [walkingDuration, setWalkingDuration] = useState('15_30');

  // 3. Training & Gym (Smart Exercise Mode)
  const [exerciseTypes, setExerciseTypes] = useState(['gym']);
  const [worksOut, setWorksOut] = useState(true);
  const [workoutFrequency, setWorkoutFrequency] = useState(4);
  const [intensity, setIntensity] = useState('Medium');
  const [duration, setDuration] = useState('45');
  const [goesToGym, setGoesToGym] = useState(true);
  const [gymFrequency, setGymFrequency] = useState(4);
  const [gymDuration, setGymDuration] = useState('60');
  const [cardioDuration, setCardioDuration] = useState('15');
  const [cardioTypes, setCardioTypes] = useState(['Treadmill']);

  // 4. Goals & Nutrition
  const [primaryGoal, setPrimaryGoal] = useState('lose_fat');
  const [targetWeight, setTargetWeight] = useState('68');
  const [recompPriorities, setRecompPriorities] = useState(['fat_loss', 'muscle_gain']);
  const [performanceFocus, setPerformanceFocus] = useState(['strength']);
  const [dietPreference, setDietPreference] = useState('non_vegetarian');
  const [allergies, setAllergies] = useState(['none']);
  const [customAllergies, setCustomAllergies] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form with current user profile whenever modal opens
  useEffect(() => {
    if (isOpen && profile) {
      setGender(profile.gender || 'Male');
      setAge(String(profile.age || 26));
      setWeight(String(profile.weight || 72));
      
      const rawHeight = profile.height_cm || profile.height || 175;
      const unit = profile.height_unit || 'cm';
      setHeightUnit(unit);
      if (unit === 'ft_in') {
        const { feet, inches } = cmToFeetInches(rawHeight);
        setHeightFeet(String(profile.height_feet || feet));
        setHeightInches(String(profile.height_inches !== undefined ? profile.height_inches : inches));
        setHeightCm(String(Math.round(rawHeight)));
      } else {
        setHeightCm(String(Math.round(rawHeight)));
        const { feet, inches } = cmToFeetInches(rawHeight);
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
      setTargetWeight(String(profile.target_weight || 68));

      const loadedRecomps = Array.isArray(profile.recomp_priorities) && profile.recomp_priorities.length > 0
        ? profile.recomp_priorities
        : (profile.recomp_priority === 'fat_loss' ? ['fat_loss'] : (profile.recomp_priority === 'muscle_gain' ? ['muscle_gain'] : ['fat_loss', 'muscle_gain']));
      setRecompPriorities(loadedRecomps);

      const loadedPerf = Array.isArray(profile.performance_focus) && profile.performance_focus.length > 0
        ? profile.performance_focus
        : (profile.performance_focus ? [profile.performance_focus] : ['strength']);
      setPerformanceFocus(loadedPerf);

      setDietPreference(profile.diet_preference || 'non_vegetarian');
      setAllergies(Array.isArray(profile.allergies) ? profile.allergies : ['none']);
      setCustomAllergies(profile.custom_allergies || '');
      setErrorMessage('');
      setSaveSuccess(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const numAge = parseInt(age, 10) || 25;
  const numWeight = parseFloat(weight) || 70;
  const numHeight = heightUnit === 'cm'
    ? (parseFloat(heightCm) || 175)
    : feetInchesToCm(parseInt(heightFeet, 10) || 0, parseFloat(heightInches) || 0);
  const numDuration = worksOut ? parseInt(duration, 10) || 30 : 0;
  const numGymDuration = goesToGym ? parseInt(gymDuration, 10) || 60 : 0;
  const numCardioDuration = goesToGym ? Math.min(numGymDuration, parseInt(cardioDuration, 10) || 0) : 0;

  const isBothRecompSelected = recompPriorities.includes('fat_loss') && recompPriorities.includes('muscle_gain');
  const canonicalRecompPriority = isBothRecompSelected
    ? 'both_equally'
    : (recompPriorities.includes('fat_loss') ? 'fat_loss' : (recompPriorities.includes('muscle_gain') ? 'muscle_gain' : 'both_equally'));

  // Live dynamic targets calculated from current setting inputs
  const liveTargets = calculateDailyTargets({
    gender,
    age: numAge,
    weight: numWeight,
    height: numHeight,
    height_cm: numHeight,
    height_unit: heightUnit,
    exercise_types: exerciseTypes,
    works_out: worksOut,
    workout_frequency: worksOut ? workoutFrequency : 0,
    intensity: worksOut ? intensity : 'Small',
    duration: numDuration,
    daily_activity_level: dailyActivityLevel,
    walking_duration: walkingDuration,
    goes_to_gym: worksOut && goesToGym,
    gym_frequency: worksOut && goesToGym ? gymFrequency : 0,
    gym_duration: numGymDuration,
    cardio_duration: numCardioDuration,
    cardio_type: cardioTypes.join(', '),
    cardio_types: cardioTypes,
    primary_goal: primaryGoal,
    target_weight: targetWeight ? parseFloat(targetWeight) : null,
    recomp_priority: canonicalRecompPriority,
    recomp_priorities: recompPriorities,
    performance_focus: performanceFocus,
    performance_focuses: performanceFocus,
    diet_preference: dietPreference,
    allergies,
    custom_allergies: customAllergies.trim(),
  });

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
    setSaveSuccess(false);

    if (isNaN(numAge) || numAge < 10 || numAge > 120) {
      setErrorMessage('Please enter a valid age between 10 and 120.');
      return;
    }

    if (isNaN(numHeight) || numHeight < 50 || numHeight > 250) {
      setErrorMessage('Please enter a valid height between 50 cm and 250 cm.');
      return;
    }

    if (isNaN(numWeight) || numWeight <= 20 || numWeight > 350) {
      setErrorMessage('Please enter a valid weight in kg (20 - 350 kg).');
      return;
    }

    const updatedData = {
      user_id: user?.id,
      gender,
      age: numAge,
      weight: numWeight,
      height: numHeight,
      height_cm: numHeight,
      height_unit: heightUnit,
      exercise_types: exerciseTypes,
      works_out: worksOut,
      workout_frequency: worksOut ? workoutFrequency : 0,
      intensity: worksOut ? intensity : 'Small',
      duration: numDuration,
      daily_activity_level: dailyActivityLevel,
      walking_duration: walkingDuration,
      goes_to_gym: worksOut && goesToGym,
      gym_frequency: worksOut && goesToGym ? gymFrequency : 0,
      gym_duration: numGymDuration,
      cardio_duration: numCardioDuration,
      cardio_type: cardioTypes.join(', '),
      cardio_types: cardioTypes,
      primary_goal: primaryGoal,
      target_weight: targetWeight ? parseFloat(targetWeight) : null,
      recomp_priority: canonicalRecompPriority,
      recomp_priorities: recompPriorities,
      performance_focus: performanceFocus,
      performance_focuses: performanceFocus,
      diet_preference: dietPreference,
      allergies,
      custom_allergies: customAllergies.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      setSaving(true);

      if (isDemoUser) {
        setProfile((prev) => ({
          ...prev,
          ...updatedData,
        }));
        setSaveSuccess(true);
        setTimeout(() => {
          onClose();
        }, 600);
        return;
      }

      await upsertUserProfile(updatedData);
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to update profile settings:', err);
      setErrorMessage(err.message || 'Could not save profile changes.');
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
        className="w-full max-w-2xl bg-slate-900/95 border border-white/15 rounded-[28px] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#30d158]/15 border border-[#30d158]/30 flex items-center justify-center text-[#30d158]">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="headline text-base sm:text-lg text-white">Profile & Fitness Settings</h3>
              <p className="text-xs text-slate-400">Update biometrics, daily activity, goals, and diet</p>
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

        {/* Tab Selector */}
        <div className="flex items-center space-x-1 p-2 bg-black/40 border-b border-white/10 shrink-0 overflow-x-auto">
          {[
            { id: 'biometrics', label: 'Biometrics' },
            { id: 'activity', label: 'Activity & Gym' },
            { id: 'goals', label: 'Goals & Diet' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`btn-press px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white/15 text-white shadow-sm border border-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* TAB 1: Biometrics */}
          {activeTab === 'biometrics' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
                  Biological Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGender(g)}
                      className={`btn-press py-2.5 rounded-xl text-xs font-bold transition-all ${
                        gender === g
                          ? 'bg-white/15 text-white border border-white/20'
                          : 'glass-inset text-slate-400 hover:text-white'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Age */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-inset rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-[#30d158]"
                  />
                </div>

                {/* Height */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300 caption-label">
                      Height
                    </label>
                    <div className="inline-flex rounded-lg p-0.5 glass-inset text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleHeightUnitToggle('cm')}
                        className={`px-1.5 py-0.5 rounded font-bold transition-all ${
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
                        className={`px-1.5 py-0.5 rounded font-bold transition-all ${
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
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="w-full px-3.5 py-2.5 glass-inset rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-[#30d158] tabular-numbers"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">
                        cm
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="relative">
                        <input
                          type="number"
                          min="2"
                          max="8"
                          value={heightFeet}
                          onChange={(e) => setHeightFeet(e.target.value)}
                          placeholder="5"
                          className="w-full px-2.5 py-2.5 glass-inset rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-[#30d158] tabular-numbers"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">
                          ft
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="11.9"
                          step="0.5"
                          value={heightInches}
                          onChange={(e) => setHeightInches(e.target.value)}
                          placeholder="9"
                          className="w-full px-2.5 py-2.5 glass-inset rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-[#30d158] tabular-numbers"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">
                          in
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="350"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-inset rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-[#30d158]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                  General Daily Activity
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'mostly_sitting', label: 'Mostly sitting' },
                    { id: 'lightly_active', label: 'Lightly active' },
                    { id: 'moderately_active', label: 'Moderately active' },
                    { id: 'highly_active', label: 'Highly active' },
                  ].map((act) => (
                    <button
                      type="button"
                      key={act.id}
                      onClick={() => setDailyActivityLevel(act.id)}
                      className={`btn-press p-2 rounded-xl text-xs font-semibold text-left transition-all ${
                        dailyActivityLevel === act.id
                          ? 'bg-white/15 text-white border border-white/20'
                          : 'glass-inset text-slate-400 hover:text-white'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5 flex items-center space-x-1.5">
                  <Footprints className="w-3.5 h-3.5 text-[#30d158]" />
                  <span>Daily Walking</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: 'less_15', label: '<15m' },
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
            </div>
          )}

          {/* TAB 2: Activity & Gym */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl glass-inset space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-white caption-label flex items-center space-x-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-[#30d158]" />
                    <span>How do you usually exercise?</span>
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
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 caption-label mb-1">
                        Days per week: {workoutFrequency}d
                      </label>
                      <div className="grid grid-cols-7 gap-1">
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                          <button
                            type="button"
                            key={d}
                            onClick={() => setWorkoutFrequency(d)}
                            className={`btn-press py-1.5 rounded-lg text-xs font-bold ${
                              workoutFrequency === d ? 'bg-[#30d158] text-black' : 'glass text-slate-400'
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 caption-label mb-1">
                        Workout Intensity: {intensity}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['Small', 'Medium', 'Intensive'].map((item) => (
                          <button
                            type="button"
                            key={item}
                            onClick={() => setIntensity(item)}
                            className={`btn-press py-1.5 rounded-lg text-xs font-bold ${
                              intensity === item ? 'bg-white/20 text-white border border-white/30' : 'glass text-slate-400'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    {goesToGym && (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-[#ffd60a]/20 space-y-2.5">
                        <span className="text-[10px] font-bold text-[#ffd60a] block">Gym Session Energy Details</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">Total Session Duration</label>
                            <select
                              value={gymDuration}
                              onChange={(e) => setGymDuration(e.target.value)}
                              className="w-full px-2.5 py-1.5 glass rounded-lg text-xs text-white"
                            >
                              {['30', '45', '60', '75', '90', '120'].map((m) => (
                                <option key={m} value={m} className="bg-slate-900 text-white">{m} mins</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">Cardio Portion</label>
                            <select
                              value={cardioDuration}
                              onChange={(e) => setCardioDuration(e.target.value)}
                              className="w-full px-2.5 py-1.5 glass rounded-lg text-xs text-white"
                            >
                              {['0', '15', '30', '45', '60'].map((m) => (
                                <option key={m} value={m} className="bg-slate-900 text-white">{m} mins</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {parseInt(cardioDuration, 10) > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] text-slate-400">Cardio Types</label>
                              <span className="text-[9px] text-slate-500">Select all that apply</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {['Treadmill', 'Running', 'Cycling', 'Elliptical', 'Stair Climber', 'Swimming', 'HIIT', 'Walking', 'Other'].map((t) => {
                                const isSelected = cardioTypes.some((item) => item.toLowerCase() === t.toLowerCase());
                                return (
                                  <button
                                    type="button"
                                    key={t}
                                    onClick={() => {
                                      setCardioTypes((prev) => {
                                        const exists = prev.some((x) => x.toLowerCase() === t.toLowerCase());
                                        if (exists) {
                                          const next = prev.filter((x) => x.toLowerCase() !== t.toLowerCase());
                                          return next.length === 0 ? [t] : next;
                                        } else {
                                          return [...prev, t];
                                        }
                                      });
                                    }}
                                    className={`btn-press py-1.5 px-1 rounded-lg text-[10px] font-semibold flex items-center justify-center space-x-1 ${
                                      isSelected ? 'bg-[#0a84ff]/30 border border-[#0a84ff] text-white font-bold' : 'glass text-slate-400'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-2.5 h-2.5 text-[#0a84ff] shrink-0" />}
                                    <span className="truncate">{t}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Goals & Diet */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                  Primary Goal
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'lose_fat', label: 'Lose Body Fat', desc: 'Burn fat & protect muscle', icon: Flame, color: '#ff2d55' },
                    { id: 'gain_muscle', label: 'Gain Muscle', desc: 'Lean surplus for growth', icon: Dumbbell, color: '#30d158' },
                    { id: 'maintain', label: 'Maintain Weight', desc: 'Stabilize & balance energy', icon: Scale, color: '#0a84ff' },
                    { id: 'recomposition', label: 'Recomposition', desc: 'Build muscle & lose fat', icon: Sparkles, color: '#bf5af2' },
                    { id: 'performance', label: 'Performance', desc: 'Power & athletic fuel', icon: Zap, color: '#ffd60a' },
                    { id: 'competition', label: 'Competition', desc: 'Disciplined stage prep', icon: Trophy, color: '#ff9f0a' },
                  ].map((g) => {
                    const Icon = g.icon;
                    const isSelected = primaryGoal === g.id;
                    return (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => setPrimaryGoal(g.id)}
                        className={`btn-press p-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-white/20 text-white border border-white/30 shadow-md'
                            : 'glass text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <Icon className="w-3.5 h-3.5" style={{ color: g.color }} />
                          <span className="text-xs font-bold text-white">{g.label}</span>
                        </div>
                        <span className="block text-[10px] text-slate-400">{g.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {primaryGoal === 'recomposition' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300 caption-label">
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
                          className={`btn-press py-1.5 px-1.5 text-center rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center space-x-1 ${
                            isSelected ? 'bg-[#bf5af2] text-white font-bold' : 'glass text-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {primaryGoal === 'performance' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300 caption-label">
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
                          onClick={() => {
                            setPerformanceFocus((prev) => {
                              const prevArr = Array.isArray(prev) ? prev : [prev];
                              if (prevArr.includes(item.id)) {
                                const next = prevArr.filter((f) => f !== item.id);
                                return next.length === 0 ? [item.id] : next;
                              } else {
                                return [...prevArr, item.id];
                              }
                            });
                          }}
                          className={`btn-press py-1.5 px-1.5 text-center rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center space-x-1 ${
                            isSelected ? 'bg-[#ffd60a] text-black font-bold' : 'glass text-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-black shrink-0" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 caption-label mb-1">
                    Target Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    className="w-full px-3.5 py-2 glass rounded-xl text-xs text-white focus:ring-1 focus:ring-[#30d158]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                  Diet Preference
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
                      className={`btn-press py-1.5 px-2 rounded-lg text-xs font-semibold ${
                        dietPreference === d.id ? 'bg-[#30d158] text-black font-bold' : 'glass text-slate-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                  Foods to Avoid / Allergies
                </label>
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAllergy('none')}
                    className={`btn-press px-2.5 py-1 rounded-lg text-[11px] font-bold ${
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
                        className={`btn-press px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
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
                        className={`btn-press px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                          allergies.includes(a.id) ? 'bg-[#ff9f0a]/30 border border-[#ff9f0a] text-white font-bold' : 'glass text-slate-400'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other Foods to Avoid */}
                <div className="space-y-1.5 pt-1">
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
            </div>
          )}

          {/* Real-time Dynamic Recalculated Targets Banner */}
          <div className="p-4 rounded-2xl glass-inset border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Live Recalibrated Target:</span>
              <div className="flex items-baseline space-x-1">
                <span className="headline text-lg text-[#30d158] tabular-numbers">
                  {liveTargets.calories.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">kcal/day</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center text-[11px]">
              <div className="glass p-1.5 rounded-lg">
                <span className="block text-slate-400 text-[9px]">Protein</span>
                <span className="font-bold text-white">{liveTargets.protein}g</span>
              </div>
              <div className="glass p-1.5 rounded-lg">
                <span className="block text-slate-400 text-[9px]">Carbs</span>
                <span className="font-bold text-white">{liveTargets.carbs}g</span>
              </div>
              <div className="glass p-1.5 rounded-lg">
                <span className="block text-slate-400 text-[9px]">Fats</span>
                <span className="font-bold text-white">{liveTargets.fats}g</span>
              </div>
              <div className="glass p-1.5 rounded-lg">
                <span className="block text-slate-400 text-[9px]">Fiber</span>
                <span className="font-bold text-white">{liveTargets.fiber}g</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-press flex-1 py-3 rounded-2xl glass text-slate-300 hover:text-white text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-press flex-1 py-3 rounded-2xl bg-[#30d158] hover:bg-[#30d158]/90 text-black font-bold text-xs shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-black" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
