import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  RotateCw, 
  Utensils, 
  Dumbbell, 
  Droplet, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Flame,
  Info,
  ChevronRight,
  ShieldCheck,
  Wheat,
  Scale
} from 'lucide-react';
import { generateNutritionSuggestions } from '../services/gemini';

const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

export function AISuggestions({ profile, todayLogs = [], targets = {} }) {
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
      setError('Unable to refresh recommendations right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [profile?.id, todayLogs?.length, profile?.weight, profile?.intensity, profile?.duration]);

  // Determine logged categories for meal track pill strip
  const loggedCategorySet = new Set(
    todayLogs.map((l) => (l.meal_category || '').toLowerCase())
  );

  return (
    <div className="relative rounded-[28px] p-px overflow-hidden apple-intelligence-glow group">
      
      {/* Underlying Apple Glass Container */}
      <div className="apple-glass-card rounded-[27px] p-6 sm:p-7 relative z-10 space-y-6">
        
        {/* 1. Header (Brand: Today's Fuel Plan • Smart Nutrition) */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-[#0a84ff] p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-black/90 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="headline text-base sm:text-lg text-white">
                  Today's Fuel Plan
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 caption-label">
                  SMART NUTRITION
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Personalized Andhra nutrition & workout recovery tailored to your day
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={fetchSuggestions}
            disabled={loading}
            className="apple-btn flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white shadow-sm disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Analyzing Day...' : 'Refresh Plan'}</span>
          </motion.button>
        </div>

        {/* 2. Today's Meal Progression Tracker (Breakfast -> Lunch -> Snacks -> Dinner) */}
        <div className="p-3 rounded-2xl apple-glass-inset flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400 font-semibold caption-label text-[10px]">
            <span>DAY LOGGED:</span>
          </div>
          <div className="flex items-center space-x-2">
            {MEAL_CATEGORIES.map((cat) => {
              const isLogged = loggedCategorySet.has(cat.toLowerCase());
              return (
                <div
                  key={cat}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                    isLogged
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-white/5 border border-white/5 text-slate-500'
                  }`}
                >
                  {isLogged ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{cat}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Main Content Area */}
        <div>
          <AnimatePresence mode="wait">
            {loading && !suggestions ? (
              <motion.div
                key="loading-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4 py-4 animate-pulse"
              >
                <div className="h-20 bg-white/5 rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-44 bg-white/5 rounded-2xl" />
                  <div className="h-44 bg-white/5 rounded-2xl" />
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error-box"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center space-x-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            ) : suggestions ? (
              <motion.div
                key="ai-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="space-y-5"
              >
                
                {/* 3A. Status & Macro Deficit Diagnosis Banner */}
                <div className="p-4 sm:p-5 rounded-2xl apple-glass-inset border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
                      <h3 className="headline text-sm sm:text-base text-white">
                        {suggestions.headline || suggestions.summary}
                      </h3>
                    </div>
                    {suggestions.macroStatus?.primaryFocus && (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-amber-300 caption-label border border-white/10">
                        {suggestions.macroStatus.primaryFocus}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {suggestions.alreadyEatenDiagnosis || suggestions.priorityTip}
                  </p>

                  {/* Live Gap Metrics */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <Flame className="w-3.5 h-3.5 text-[#ff2d55]" />
                      <span>Remaining Room:</span>
                      <strong className="text-white tabular-numbers">
                        {suggestions.macroStatus?.caloriesRemaining ?? targets.calories} kcal
                      </strong>
                    </div>
                    <span className="text-white/20">•</span>
                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <Dumbbell className="w-3.5 h-3.5 text-[#30d158]" />
                      <span>Protein Target Deficit:</span>
                      <strong className="text-[#30d158] tabular-numbers">
                        {suggestions.macroStatus?.proteinRemainingGrams ?? targets.protein}g to go
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 3B. Featured Immediate Next Meal Card */}
                {suggestions.nextMeal && (
                  <div className="p-5 sm:p-6 rounded-[24px] bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-[10px] caption-label border border-emerald-500/30">
                          {suggestions.nextMeal.category === 'Day Completed' ? 'DAY COMPLETE' : `NEXT MEAL: ${suggestions.nextMeal.category.toUpperCase()}`}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Culturally Calibrated</span>
                      </div>
                      {suggestions.nextMeal.estimatedMacros?.calories && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold text-xs tabular-numbers border border-amber-500/20">
                          ~{suggestions.nextMeal.estimatedMacros.calories} kcal
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="headline text-base sm:text-lg text-white mb-2">
                        {suggestions.nextMeal.title}
                      </h4>

                      {/* Items & Realistic Portions */}
                      {Array.isArray(suggestions.nextMeal.itemsAndPortions) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                          {suggestions.nextMeal.itemsAndPortions.map((portion, idx) => (
                            <div
                              key={idx}
                              className="flex items-center space-x-2 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-200"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="font-medium">{portion}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Estimated Macro Split Strip */}
                      {suggestions.nextMeal.estimatedMacros && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 pb-2 border-b border-white/5 text-[11px]">
                          <span className="text-slate-400">
                            Carbs: <strong className="text-[#0a84ff] tabular-numbers">{suggestions.nextMeal.estimatedMacros.carbs}g</strong>
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="text-slate-400">
                            Protein: <strong className="text-[#30d158] tabular-numbers">{suggestions.nextMeal.estimatedMacros.protein}g</strong>
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="text-slate-400">
                            Fats: <strong className="text-[#ffd60a] tabular-numbers">{suggestions.nextMeal.estimatedMacros.fats}g</strong>
                          </span>
                          {suggestions.nextMeal.estimatedMacros.fiber !== undefined && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="text-slate-400">
                                Fiber: <strong className="text-[#bf5af2] tabular-numbers">{suggestions.nextMeal.estimatedMacros.fiber}g</strong>
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Why This Works & Alternative */}
                    <div className="space-y-2 pt-1">
                      {suggestions.nextMeal.whyThisWorks && (
                        <div className="flex items-start space-x-2 text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            <strong className="text-slate-200 font-semibold">Why this fits: </strong>
                            {suggestions.nextMeal.whyThisWorks}
                          </p>
                        </div>
                      )}

                      {suggestions.nextMeal.quickAlternative && (
                        <p className="text-[11px] text-slate-400 pl-1">
                          <strong className="text-slate-300 font-medium">Quick Alternative: </strong>
                          {suggestions.nextMeal.quickAlternative}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 3C. Later Meals Roadmap */}
                {Array.isArray(suggestions.laterMeals) && suggestions.laterMeals.length > 0 && (
                  <div className="space-y-2.5">
                    <h5 className="caption-label text-[10px] text-slate-400 flex items-center space-x-1.5">
                      <Utensils className="w-3 h-3 text-amber-400" />
                      <span>UPCOMING PLANNED MEALS FOR TODAY</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {suggestions.laterMeals.map((meal, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 transition-colors hover:bg-white/[0.04]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="caption-label text-[10px] text-slate-400 font-semibold">
                              {meal.category}
                            </span>
                            {meal.estCalories && (
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full tabular-numbers">
                                ~{meal.estCalories} kcal
                              </span>
                            )}
                          </div>
                          <h6 className="text-xs font-bold text-slate-200">{meal.title}</h6>
                          {meal.portion && (
                            <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                              {meal.portion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3D. Workout Nutrition & Hydration Guidance Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  
                  {/* Workout Nutrition Timing */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-center space-x-2 text-xs font-bold text-sky-400 caption-label">
                      <Dumbbell className="w-3.5 h-3.5" />
                      <span>Workout Nutrition Timing</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {suggestions.workoutNutritionAdvice || suggestions.workoutNutritionTip}
                    </p>
                  </div>

                  {/* Hydration & Recovery Target */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 caption-label">
                      <Droplet className="w-3.5 h-3.5" />
                      <span>Hydration & Recovery</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {suggestions.hydrationAndRecovery}
                    </p>
                  </div>

                </div>

              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
