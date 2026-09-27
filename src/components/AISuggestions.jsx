import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { generateInstantFuelPlan, getCurrentMealPeriod, ORDERED_MEAL_PERIODS } from '../services/fuelPlanner';
import { enhanceFuelPlanWithAI } from '../services/gemini';

// In-memory LRU-style cache for AI-enhanced daily plans
const aiPlanCache = new Map();
const MAX_CACHE_ENTRIES = 40;

function getCachedPlan(key) {
  return aiPlanCache.get(key) || null;
}

function setCachedPlan(key, plan) {
  if (!key || !plan) return;
  if (aiPlanCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = aiPlanCache.keys().next().value;
    aiPlanCache.delete(oldestKey);
  }
  aiPlanCache.set(key, plan);
}

export function AISuggestions({ profile, todayLogs = [], targets = {}, selectedDate = null }) {
  // 1. INSTANT LOCAL PLAN GENERATION (< 2ms)
  // Evaluated synchronously so the card is never blank or blocked by network calls
  const [plan, setPlan] = useState(() => {
    return generateInstantFuelPlan(profile, todayLogs, targets, selectedDate || new Date());
  });

  const [isRefining, setIsRefining] = useState(false);
  const activeControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastManualClickRef = useRef(0);

  // Synchronously synchronize local plan whenever props change (add/edit/delete meal, targets)
  useEffect(() => {
    const now = selectedDate || new Date();
    const instant = generateInstantFuelPlan(profile, todayLogs, targets, now);

    // If we already have the enhanced plan cached for this exact day & log state, use it immediately
    const cached = getCachedPlan(instant.cacheKey);
    if (cached) {
      setPlan(cached);
      setIsRefining(false);
      return;
    }

    // Otherwise, immediately display the updated instant plan
    setPlan(instant);

    // Cancel any previous in-flight AI call and debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    // Background AI enhancement: debounced (600ms) to avoid network thrashing on rapid meal entries
    setIsRefining(true);
    const controller = new AbortController();
    activeControllerRef.current = controller;

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const enhanced = await enhanceFuelPlanWithAI(
          instant, 
          profile, 
          todayLogs, 
          targets, 
          controller.signal
        );

        if (enhanced && !controller.signal.aborted) {
          setCachedPlan(instant.cacheKey, enhanced);
          setPlan(enhanced);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[Fuel Plan] Background enhancement fallback engaged:', err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsRefining(false);
        }
      }
    }, 600);

    return () => {
      clearTimeout(debounceTimerRef.current);
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, [
    profile?.id, 
    profile?.weight, 
    profile?.works_out, 
    profile?.intensity, 
    profile?.duration,
    todayLogs?.length,
    // Deep log change detection via summarized hash
    useMemo(() => todayLogs.map(l => `${l.id || l.food_name}-${l.carbs}-${l.protein}-${l.fats}`).join('|'), [todayLogs]),
    targets?.calories,
    targets?.protein,
    selectedDate
  ]);

  // Manual Refresh Handler
  const handleManualRefresh = async () => {
    const clickNow = Date.now();
    if (clickNow - lastManualClickRef.current < 2000) {
      return; // 2s rate limit protection for button clicks
    }
    lastManualClickRef.current = clickNow;

    const now = selectedDate || new Date();
    const instant = generateInstantFuelPlan(profile, todayLogs, targets, now);
    setPlan(instant);

    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeControllerRef.current = controller;
    setIsRefining(true);

    try {
      const enhanced = await enhanceFuelPlanWithAI(
        instant, 
        profile, 
        todayLogs, 
        targets, 
        controller.signal
      );
      if (enhanced && !controller.signal.aborted) {
        setCachedPlan(instant.cacheKey, enhanced);
        setPlan(enhanced);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[Fuel Plan Refresh Notice]:', err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsRefining(false);
      }
    }
  };

  // Log status and temporal progression mapping
  const loggedCategorySet = useMemo(() => {
    return new Set(todayLogs.map((l) => (l.meal_category || '').toLowerCase()));
  }, [todayLogs]);

  const currentPeriod = plan.currentPeriod || getCurrentMealPeriod();
  const currentPeriodIndex = ORDERED_MEAL_PERIODS.indexOf(currentPeriod);

  return (
    <div className="relative rounded-[28px] p-px overflow-hidden intelligence-glow group">
      
      {/* Underlying Glass Container */}
      <div className="glass-card rounded-[27px] p-6 sm:p-7 relative z-10 space-y-6">
        
        {/* 1. Header (Brand: Today's Fuel Plan • Smart Nutrition) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-[#0a84ff] p-0.5 shadow-lg shadow-emerald-500/20 shrink-0 mt-0.5 sm:mt-0">
              <div className="w-full h-full bg-black/90 rounded-[14px] flex items-center justify-center">
                <Sparkles className={`w-5 h-5 text-emerald-300 ${isRefining ? 'animate-spin' : ''}`} style={{ animationDuration: '3.5s' }} />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="headline text-base sm:text-lg text-white">
                  Today's Fuel Plan
                </h2>
                <div className="hidden sm:inline-flex">
                  {isRefining ? (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 caption-label animate-pulse">
                      <Sparkles className="w-3 h-3 text-emerald-300" />
                      <span>AI REFINING</span>
                    </span>
                  ) : plan.isAiEnhanced ? (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 caption-label shadow-sm shadow-emerald-500/10">
                      <Sparkles className="w-3 h-3 text-emerald-300" />
                      <span>AI CALIBRATED</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-white/10 border border-white/15 text-slate-300 caption-label">
                      INSTANT SMART PLAN
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Personalized Andhra nutrition & workout recovery tailored to your day
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="sm:hidden">
              {isRefining ? (
                <span className="flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 caption-label animate-pulse">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span>AI REFINING</span>
                </span>
              ) : plan.isAiEnhanced ? (
                <span className="flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 caption-label shadow-sm shadow-emerald-500/10">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span>AI CALIBRATED</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-white/10 border border-white/15 text-slate-300 caption-label">
                  INSTANT SMART PLAN
                </span>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleManualRefresh}
              disabled={isRefining}
              title="Refresh Plan"
              aria-label="Refresh Plan"
              className="btn-press flex items-center space-x-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white shadow-sm disabled:opacity-60 transition-colors shrink-0"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefining ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isRefining ? 'Refining...' : 'Refresh Plan'}</span>
            </motion.button>
          </div>
        </div>

        {/* 2. Today's Meal Progression Tracker with Past, Current & Upcoming Awareness */}
        <div className="p-3 sm:p-3.5 rounded-2xl glass-inset flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400 font-semibold caption-label text-[10px]">
            <span>DAY LOGGED:</span>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            {ORDERED_MEAL_PERIODS.map((cat, idx) => {
              const isLogged = loggedCategorySet.has(cat.toLowerCase());
              const isCurrent = cat === currentPeriod;
              const isPast = currentPeriodIndex !== -1 && idx < currentPeriodIndex;
              const isUpcoming = currentPeriodIndex === -1 ? false : idx > currentPeriodIndex;

              let pillStyle = 'bg-white/5 border-white/5 text-slate-400';
              let badgeText = '';

              if (isLogged) {
                pillStyle = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
              } else if (isCurrent) {
                pillStyle = 'bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30';
                badgeText = 'NOW';
              } else if (isPast) {
                pillStyle = 'bg-white/[0.02] border-white/5 text-slate-500';
                badgeText = 'MISSED';
              }

              return (
                <div
                  key={cat}
                  className={`flex items-center justify-between sm:justify-start space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border w-full sm:w-auto min-h-[36px] sm:min-h-0 ${pillStyle}`}
                >
                  <div className="flex items-center space-x-1.5 min-w-0">
                    {isLogged ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    )}
                    <span className="truncate">{cat}</span>
                  </div>
                  {badgeText && (
                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-black/40 text-current caption-label ml-1 shrink-0">
                      {badgeText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Main Fuel Plan Content Area */}
        <motion.div
          key={plan.cacheKey || 'plan-content'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          {/* 3A. Status & Macro Deficit Diagnosis Banner */}
          <div className="p-4 sm:p-5 rounded-2xl glass-inset border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
                <h3 className="headline text-sm sm:text-base text-white">
                  {plan.headline || plan.summary}
                </h3>
              </div>
              {plan.macroStatus?.primaryFocus && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-amber-300 caption-label border border-white/10">
                  {plan.macroStatus.primaryFocus}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {plan.alreadyEatenDiagnosis || plan.priorityTip}
            </p>

            {/* Live Gap Metrics */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Flame className="w-3.5 h-3.5 text-[#ff2d55]" />
                <span>Remaining Room:</span>
                <strong className="text-white tabular-numbers">
                  {plan.macroStatus?.caloriesRemaining ?? targets.calories} kcal
                </strong>
              </div>
              <span className="text-white/20">•</span>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Dumbbell className="w-3.5 h-3.5 text-[#30d158]" />
                <span>Protein Target Deficit:</span>
                <strong className="text-[#30d158] tabular-numbers">
                  {plan.macroStatus?.proteinRemainingGrams ?? targets.protein}g to go
                </strong>
              </div>
            </div>
          </div>

          {/* 3B. Featured Immediate Next Meal Card */}
          {plan.nextMeal && (
            <div className="p-5 sm:p-6 rounded-[24px] bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-[10px] caption-label border border-emerald-500/30">
                    {plan.nextMeal.category === 'Day Completed' 
                      ? 'DAY COMPLETE' 
                      : `NEXT MEAL: ${plan.nextMeal.category.toUpperCase()}`}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Culturally Calibrated</span>
                </div>
                {plan.nextMeal.estimatedMacros?.calories && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold text-xs tabular-numbers border border-amber-500/20">
                    ~{plan.nextMeal.estimatedMacros.calories} kcal
                  </span>
                )}
              </div>

              <div>
                <h4 className="headline text-base sm:text-lg text-white mb-2">
                  {plan.nextMeal.title}
                </h4>

                {/* Items & Realistic Portions */}
                {Array.isArray(plan.nextMeal.itemsAndPortions) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                    {plan.nextMeal.itemsAndPortions.map((portion, idx) => (
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
                {plan.nextMeal.estimatedMacros && (
                  <div className="flex flex-wrap items-center gap-3 pt-1 pb-2 border-b border-white/5 text-[11px]">
                    <span className="text-slate-400">
                      Carbs: <strong className="text-[#0a84ff] tabular-numbers">{plan.nextMeal.estimatedMacros.carbs}g</strong>
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-slate-400">
                      Protein: <strong className="text-[#30d158] tabular-numbers">{plan.nextMeal.estimatedMacros.protein}g</strong>
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-slate-400">
                      Fats: <strong className="text-[#ffd60a] tabular-numbers">{plan.nextMeal.estimatedMacros.fats}g</strong>
                    </span>
                    {plan.nextMeal.estimatedMacros.fiber !== undefined && (
                      <>
                        <span className="text-white/20">•</span>
                        <span className="text-slate-400">
                          Fiber: <strong className="text-[#bf5af2] tabular-numbers">{plan.nextMeal.estimatedMacros.fiber}g</strong>
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Why This Works & Alternative */}
              <div className="space-y-2 pt-1">
                {plan.nextMeal.whyThisWorks && (
                  <div className="flex items-start space-x-2 text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-slate-200 font-semibold">Why this fits: </strong>
                      {plan.nextMeal.whyThisWorks}
                    </p>
                  </div>
                )}

                {plan.nextMeal.quickAlternative && (
                  <p className="text-[11px] text-slate-400 pl-1">
                    <strong className="text-slate-300 font-medium">Quick Alternative: </strong>
                    {plan.nextMeal.quickAlternative}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 3C. Later Meals Roadmap (Upcoming meals today or tomorrow breakfast) */}
          {Array.isArray(plan.laterMeals) && plan.laterMeals.length > 0 && (
            <div className="space-y-2.5">
              <h5 className="caption-label text-[10px] text-slate-400 flex items-center space-x-1.5">
                <Utensils className="w-3 h-3 text-amber-400" />
                <span>UPCOMING PLANNED MEALS</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plan.laterMeals.map((meal, idx) => (
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
                {plan.workoutNutritionAdvice || plan.workoutNutritionTip}
              </p>
            </div>

            {/* Hydration & Recovery Target */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 caption-label">
                <Droplet className="w-3.5 h-3.5" />
                <span>Hydration & Recovery</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {plan.hydrationAndRecovery}
              </p>
            </div>
          </div>
        </motion.div>

      </div>

    </div>
  );
}
