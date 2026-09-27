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
  Droplet 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { upsertUserProfile } from '../lib/supabase';
import { calculateDailyTargets } from '../services/nutrition';

export function SettingsModal({ isOpen, onClose }) {
  const { user, profile, isDemoUser, refreshProfile, setProfile } = useAuth();

  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('26');
  const [weight, setWeight] = useState('72');
  const [worksOut, setWorksOut] = useState(true);
  const [intensity, setIntensity] = useState('Medium');
  const [duration, setDuration] = useState('45');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form with current user profile whenever modal opens
  useEffect(() => {
    if (isOpen && profile) {
      setGender(profile.gender || 'Male');
      setAge(String(profile.age || 26));
      setWeight(String(profile.weight || 72));
      setWorksOut(profile.works_out !== false);
      setIntensity(profile.intensity || 'Medium');
      setDuration(String(profile.duration || 45));
      setErrorMessage('');
      setSaveSuccess(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // Live dynamic targets calculated from current setting inputs
  const liveTargets = calculateDailyTargets({
    gender,
    age: parseInt(age, 10) || 25,
    weight: parseFloat(weight) || 70,
    works_out: worksOut,
    intensity: worksOut ? intensity : 'Small',
    duration: worksOut ? parseInt(duration, 10) || 30 : 0,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSaveSuccess(false);

    const numAge = parseInt(age, 10);
    const numWeight = parseFloat(weight);
    const numDuration = parseInt(duration, 10);

    if (isNaN(numAge) || numAge < 10 || numAge > 120) {
      setErrorMessage('Please enter a valid age between 10 and 120.');
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
      works_out: worksOut,
      intensity: worksOut ? intensity : 'Small',
      duration: worksOut ? numDuration : 0,
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
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-lg glass-card rounded-[32px] border border-white/15 shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#30d158]/15 border border-[#30d158]/30 flex items-center justify-center text-[#30d158]">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="headline text-base text-white">Profile & Fitness Settings</h3>
              <p className="text-xs text-slate-400">Calibrate your dynamic biometric blueprint</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="btn-press p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 text-xs bg-rose-950/60 border border-rose-500/30 rounded-2xl text-rose-300">
              {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 text-xs bg-[#30d158]/15 border border-[#30d158]/40 rounded-2xl text-[#30d158] flex items-center space-x-2">
              <Check className="w-4 h-4 text-[#30d158]" />
              <span>Profile updated! Recalibrating dashboard targets...</span>
            </div>
          )}

          {/* 1. Biological Gender */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 caption-label mb-2">
              Biological Gender
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {['Male', 'Female', 'Other'].map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setGender(g)}
                  className={`btn-press py-2.5 px-3 text-xs font-semibold rounded-2xl transition-all ${
                    gender === g
                      ? 'bg-white/15 border border-[#30d158]/50 text-white shadow-sm'
                      : 'glass-inset text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Age & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                Age (years)
              </label>
              <input
                type="number"
                min="12"
                max="120"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3.5 py-2.5 glass-inset rounded-xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 tabular-numbers"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
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
                className="w-full px-3.5 py-2.5 glass-inset rounded-xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 tabular-numbers"
              />
            </div>
          </div>

          {/* 3. Workout Habit & Intensity */}
          <div className="p-4 rounded-2xl glass-inset space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[#30d158]" />
                  <span>Daily Workout Habit</span>
                </span>
                <span className="text-[11px] text-slate-400 block">Exercise or athletics daily</span>
              </div>

              <div className="flex items-center space-x-1 glass p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setWorksOut(true)}
                  className={`btn-press px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    worksOut ? 'bg-[#30d158] text-black shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setWorksOut(false)}
                  className={`btn-press px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    !worksOut ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {worksOut && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 caption-label mb-1.5">
                    Workout Intensity
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Small', 'Medium', 'Intensive'].map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => setIntensity(lvl)}
                        className={`btn-press py-2 px-2 text-xs font-semibold rounded-xl transition-all ${
                          intensity === lvl
                            ? 'bg-white/15 border border-[#30d158]/50 text-white shadow-sm'
                            : 'bg-black/40 border border-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                    <span className="caption-label">Duration:</span>
                    <span className="text-[#30d158] tabular-numbers font-bold">{duration} minutes/day</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="180"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full accent-[#30d158] h-2 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>

          {/* Dynamic Targets Recalculation Preview */}
          <div className="p-4 rounded-2xl glass border border-white/10">
            <div className="flex items-center justify-between text-xs font-bold mb-2.5">
              <span className="caption-label text-slate-400">Recalculated Goal:</span>
              <span className="text-[#ffd60a] flex items-center space-x-1 tabular-numbers font-extrabold">
                <Flame className="w-3.5 h-3.5 text-[#ff2d55]" />
                <span>{liveTargets.calories} kcal/day</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
              <div className="glass-inset p-2 rounded-xl">
                <span className="text-slate-400 block caption-label text-[9px]">Protein</span>
                <span className="font-bold text-[#30d158] tabular-numbers text-xs">{liveTargets.protein}g</span>
              </div>
              <div className="glass-inset p-2 rounded-xl">
                <span className="text-slate-400 block caption-label text-[9px]">Carbs</span>
                <span className="font-bold text-[#0a84ff] tabular-numbers text-xs">{liveTargets.carbs}g</span>
              </div>
              <div className="glass-inset p-2 rounded-xl">
                <span className="text-slate-400 block caption-label text-[9px]">Fats</span>
                <span className="font-bold text-[#ffd60a] tabular-numbers text-xs">{liveTargets.fats}g</span>
              </div>
              <div className="glass-inset p-2 rounded-xl">
                <span className="text-slate-400 block caption-label text-[9px]">Fiber</span>
                <span className="font-bold text-[#bf5af2] tabular-numbers text-xs">{liveTargets.fiber}g</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-press px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-press flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-[#30d158] hover:bg-[#30d158]/90 text-black text-xs font-bold shadow-lg disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />}
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
