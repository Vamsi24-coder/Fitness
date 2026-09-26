import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  Utensils, 
  Dumbbell, 
  Droplet, 
  AlertCircle, 
  CheckCircle2, 
  Zap 
} from 'lucide-react';
import { generateNutritionSuggestions } from '../services/gemini';

export function AISuggestions({ profile, todayLogs, targets }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSuggestions = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      setError('');
      const data = await generateNutritionSuggestions(profile, todayLogs, targets);
      setSuggestions(data);
    } catch (err) {
      console.error('Error in suggestions component:', err);
      setError('Unable to refresh AI insights right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [profile?.id, todayLogs?.length]);

  return (
    <div className="relative rounded-[28px] p-px overflow-hidden apple-intelligence-glow group">
      
      {/* Underlying Apple Glass Card */}
      <div className="apple-glass-card rounded-[27px] p-6 sm:p-7 relative z-10 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-500 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-black/90 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="headline text-base sm:text-lg text-white">
                  Apple Intelligence Coach
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/10 border border-white/15 text-emerald-300 caption-label">
                  GEMINI PRO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Calibrated to your {profile?.intensity || 'daily'} workout schedule
              </p>
            </div>
          </div>

          <button
            onClick={fetchSuggestions}
            disabled={loading}
            className="apple-btn flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white shadow-sm disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Analyzing...' : 'Refresh AI'}</span>
          </button>
        </div>

        {/* Content */}
        <div>
          {loading && !suggestions ? (
            <div className="space-y-4 py-4 animate-pulse">
              <div className="h-16 bg-white/5 rounded-2xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-32 bg-white/5 rounded-2xl" />
                <div className="h-32 bg-white/5 rounded-2xl" />
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : suggestions ? (
            <div className="space-y-5">
              
              {/* Daily Performance & Priority Tip Banner */}
              <div className="p-4 sm:p-5 rounded-2xl apple-glass-inset flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                      {suggestions.summary}
                    </p>
                    {suggestions.priorityTip && (
                      <p className="text-xs text-emerald-300 mt-1 font-medium leading-relaxed">
                        <strong className="text-slate-400 font-normal">Next Action: </strong>
                        {suggestions.priorityTip}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Meal Recommendations */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 caption-label">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Targeted Meal Ideas</span>
                  </div>

                  <div className="space-y-3">
                    {suggestions.mealRecommendations?.map((rec, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-200">{rec.meal}</h4>
                          {rec.estCalories && (
                            <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full tabular-numbers">
                              ~{rec.estCalories} kcal
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-emerald-300">{rec.foodIdea}</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                          {rec.macroReason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workout Nutrition & Recovery Timing */}
                <div className="space-y-4">
                  
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-sky-400 caption-label">
                      <Dumbbell className="w-3.5 h-3.5" />
                      <span>Workout Nutrition Timing</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {suggestions.workoutNutritionTip}
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 caption-label">
                      <Droplet className="w-3.5 h-3.5" />
                      <span>Hydration & Recovery Target</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {suggestions.hydrationAndRecovery}
                    </p>
                  </div>

                </div>

              </div>

            </div>
          ) : null}
        </div>

      </div>

    </div>
  );
}
