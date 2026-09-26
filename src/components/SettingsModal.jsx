import React, { useState, useEffect } from 'react';
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
        }, 800);
        return;
      }

      await upsertUserProfile(updatedData);
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error('Failed to update profile settings:', err);
      setErrorMessage(err.message || 'Failed to save settings to Supabase.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Profile & Fitness Settings</h3>
              <p className="text-xs text-slate-400">Edit your biometric and workout parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 text-xs bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300">
              {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 text-xs bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-emerald-300 flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Profile updated! Recalibrating dashboard targets...</span>
            </div>
          )}

          {/* 1. Gender */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Biological Gender
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {['Male', 'Female', 'Other'].map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setGender(g)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    gender === g
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
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
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Age (years)
              </label>
              <input
                type="number"
                min="12"
                max="120"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
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
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* 3. Workout Habit & Intensity */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Daily Workout Habit</span>
                </span>
                <span className="text-[11px] text-slate-500 block">Exercise or sports daily</span>
              </div>

              <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setWorksOut(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    worksOut ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setWorksOut(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    !worksOut ? 'bg-slate-700 text-slate-200' : 'text-slate-400'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {worksOut && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Intensity
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Small', 'Medium', 'Intensive'].map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => setIntensity(lvl)}
                        className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all ${
                          intensity === lvl
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                    <span>Duration:</span>
                    <span className="text-emerald-400">{duration} minutes/day</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="180"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>

          {/* Dynamic Targets Recalculation Preview */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-slate-400">Recalculated Goal:</span>
              <span className="text-amber-400 flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5" />
                <span>{liveTargets.calories} kcal/day</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
              <div className="bg-slate-900 p-1.5 rounded">
                <span className="text-slate-500 block">Protein</span>
                <span className="font-bold text-emerald-400">{liveTargets.protein}g</span>
              </div>
              <div className="bg-slate-900 p-1.5 rounded">
                <span className="text-slate-500 block">Carbs</span>
                <span className="font-bold text-sky-400">{liveTargets.carbs}g</span>
              </div>
              <div className="bg-slate-900 p-1.5 rounded">
                <span className="text-slate-500 block">Fats</span>
                <span className="font-bold text-amber-400">{liveTargets.fats}g</span>
              </div>
              <div className="bg-slate-900 p-1.5 rounded">
                <span className="text-slate-500 block">Fiber</span>
                <span className="font-bold text-purple-400">{liveTargets.fiber}g</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
