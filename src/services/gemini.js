import { supabase } from '../lib/supabase.js';
import { summarizeLogs } from './nutrition.js';
import { 
  generateInstantFuelPlan, 
  getMealLogStatus, 
  ORDERED_MEAL_PERIODS 
} from './fuelPlanner.js';

/**
 * Clean and parse JSON response from Gemini or fallback payload
 */
function cleanAndParseJSON(rawText, fallbackObj = null) {
  if (typeof rawText === 'object' && rawText !== null) {
    return rawText;
  }
  try {
    let clean = String(rawText).trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    return JSON.parse(clean);
  } catch (_e) {
    const jsonMatch = String(rawText).match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_innerErr) {
        // Fall through
      }
    }
    return fallbackObj;
  }
}

/**
 * Execute AI request securely via server-side / edge layer.
 * 1. Prioritizes Supabase Edge Function (`gemini-nutrition`).
 * 2. Falls back to secure local dev / Vercel Serverless `/api/gemini`.
 * 3. Never loads or exposes GEMINI_API_KEY in the browser bundle.
 */
async function callSecureGemini(action, payload = {}, signal = null) {
  if (signal?.aborted) {
    const abortErr = new Error('AI request cancelled.');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  // Strategy A: Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('gemini-nutrition', {
      body: { action, ...payload },
    });

    if (!error && data && !data.error) {
      return data;
    }
    if (data?.error) {
      console.warn('[Gemini Edge Notice]:', data.error);
    }
  } catch (edgeErr) {
    if (edgeErr.name === 'AbortError' || signal?.aborted) {
      throw edgeErr;
    }
    console.warn('[Gemini Edge Notice]:', edgeErr.message);
  }

  // Strategy B: Serverless API Endpoint (/api/gemini for Vite dev / Vercel)
  try {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: {} }));
    const token = sessionData?.session?.access_token;

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...payload }),
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      if (data && !data.error) {
        return data;
      }
    } else {
      const errData = await res.json().catch(() => null);
      if (errData?.error) {
        throw new Error(errData.error);
      }
    }
  } catch (apiErr) {
    if (apiErr.name === 'AbortError' || signal?.aborted) {
      throw apiErr;
    }
    console.warn('[Gemini Serverless Notice]:', apiErr.message);
  }

  throw new Error('All secure AI endpoints unavailable. Engaging heuristic fallback.');
}

/**
 * Intelligent Nutritionist that asks clarifying follow-up questions
 * (e.g., if user enters "3 dosa", asks about oil/ghee, chutney, fillings before final calculation).
 *
 * @param {string} foodInput - Natural text (e.g. "3 dosa", "caesar salad", "grilled chicken")
 * @param {string} clarificationAnswers - Any answers provided by user to previous questions
 * @param {string} preferredCategory - Meal category context
 */
export async function analyzeFoodWithClarification(foodInput, clarificationAnswers = '', preferredCategory = null) {
  if (!foodInput || !foodInput.trim()) return null;

  // Enforce client-side validation guardrail (max 300 chars)
  const trimmedInput = foodInput.trim().slice(0, 300);
  const trimmedAnswers = (clarificationAnswers || '').trim().slice(0, 300);

  try {
    const parsed = await callSecureGemini('analyze_food', {
      foodInput: trimmedInput,
      clarificationAnswers: trimmedAnswers,
      preferredCategory,
    });

    if (parsed) {
      if (parsed.status === 'needs_clarification' && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return {
          status: 'needs_clarification',
          food_summary: parsed.food_summary || trimmedInput,
          message: parsed.message || 'Please clarify a few preparation details for accurate macro calculation:',
          questions: parsed.questions,
        };
      }

      if (parsed.status === 'calculated' || typeof parsed.carbs === 'number') {
        const carbs = Math.max(0, Math.round(Number(parsed.carbs) * 10) / 10);
        const protein = Math.max(0, Math.round(Number(parsed.protein) * 10) / 10);
        const fats = Math.max(0, Math.round(Number(parsed.fats) * 10) / 10);
        const fiber = Math.max(0, Math.round(Number(parsed.fiber) * 10) / 10);
        const cals = Math.round(carbs * 4 + protein * 4 + fats * 9);

        return {
          status: 'calculated',
          food_name: parsed.food_name || trimmedInput,
          meal_category: preferredCategory || parsed.meal_category || 'Breakfast',
          quantity: Math.max(0.1, Number(parsed.quantity) || 1),
          unit: parsed.unit || 'serving',
          carbs,
          protein,
          fats,
          fiber,
          calories: cals,
          breakdown_note: parsed.breakdown_note || '',
        };
      }
    }
  } catch (err) {
    console.warn('Secure food analysis fallback engaged:', err.message);
  }

  // Smart local fallback for common items like "dosa" if API rate limits or network issues occur
  const lower = trimmedInput.toLowerCase();
  if (lower.includes('dosa') && !trimmedAnswers) {
    return {
      status: 'needs_clarification',
      food_summary: trimmedInput,
      message: 'To give you the exact macros for your dosa, how was it prepared?',
      questions: [
        {
          id: 'oil',
          question: 'How much cooking oil or ghee was used?',
          options: ['1 tsp oil/ghee (~5g fat)', 'Ghee roast (~10g fat)', 'Minimal / Non-stick pan (1-2g fat)'],
        },
        {
          id: 'chutney',
          question: 'Which chutney or side did you have?',
          options: ['Coconut Chutney & Sambar', 'Tomato Chutney', 'Only Sambar', 'No sides'],
        },
        {
          id: 'type',
          question: 'What type of dosa?',
          options: ['Plain Sada Dosa', 'Masala Dosa (Potato filling)', 'Rava Dosa'],
        },
      ],
    };
  }

  // Direct calculation fallback
  return {
    status: 'calculated',
    food_name: trimmedInput,
    meal_category: preferredCategory || 'Lunch',
    quantity: 1,
    unit: 'serving',
    carbs: 35,
    protein: 12,
    fats: 8,
    fiber: 3,
    calories: 260,
    breakdown_note: 'Estimated baseline for single serving. Adjust values below if needed.',
  };
}

/**
 * Standard auto-estimate fallback
 */
export async function parseAndCalculateFoodNutrition(foodInput, preferredCategory = null) {
  const result = await analyzeFoodWithClarification(foodInput, '', preferredCategory);
  if (result?.status === 'calculated') return result;
  return result;
}

/**
 * Backward compatibility alias
 */
export const estimateFoodNutrition = parseAndCalculateFoodNutrition;

/**
 * Culturally authentic Andhra Pradesh / South Indian dynamic fallback plan
 */
function getAndhraFallbackSuggestions(nextCategory, stage, summary, targets, profile, _eatenCategories = []) {
  const caloriesRemaining = Math.max(0, (targets.calories || 2000) - summary.calories);
  const proteinGap = Math.max(0, (targets.protein || 120) - Math.round(summary.protein));

  if (nextCategory === 'DayComplete' || stage === 'day_complete') {
    return {
      stage: 'day_complete',
      headline: 'Full Day Completed • Overnight Recovery & Tomorrow Prep',
      alreadyEatenDiagnosis: `You have completed your day with ${summary.calories} kcal consumed against your ${targets.calories} kcal goal and ${Math.round(summary.protein)}g protein logged.`,
      macroStatus: {
        caloriesRemaining,
        proteinRemainingGrams: proteinGap,
        primaryFocus: 'Hydration & Overnight Recovery',
      },
      nextMeal: {
        category: 'Day Completed',
        title: 'Daily Nutrition Goal Reached',
        itemsAndPortions: [
          'All primary meals logged today',
          'Sip warm water or light spiced buttermilk before bed for digestion',
          'Tomorrow morning: High-protein breakfast planned (Pesarattu / Boiled Eggs)',
        ],
        estimatedMacros: {
          calories: summary.calories,
          carbs: Math.round(summary.carbs),
          protein: Math.round(summary.protein),
          fats: Math.round(summary.fats),
          fiber: Math.round(summary.fiber),
        },
        whyThisWorks: 'Consistently logging every meal provides the data foundation for sustainable body composition and metabolic health.',
        quickAlternative: 'Take 7-8 hours restful sleep to allow muscle protein synthesis to take effect.',
      },
      laterMeals: [],
      workoutNutritionAdvice: profile?.works_out
        ? `Ensure your post-workout protein window is satisfied before sleep. Muscle tissue repairs overnight during deep sleep stages.`
        : 'Rest day recovery is where adaptation happens. Maintain a consistent sleep schedule.',
      hydrationAndRecovery: `Target total 3.0L fluids today. A warm glass of water or light majjiga aids overnight digestion and prevents waking dehydrated.`,
    };
  }

  if (nextCategory === 'Lunch') {
    return {
      stage: 'recommend_lunch',
      headline: 'Balanced Andhra Lunch • Protein & Controlled Rice',
      alreadyEatenDiagnosis: `Breakfast provided ${summary.calories} kcal and ${Math.round(summary.carbs)}g carbs. Lunch should combine measured Sona Masoori rice with protein-dense Palakura Pappu, eggs, and fresh curd.`,
      macroStatus: {
        caloriesRemaining,
        proteinRemainingGrams: proteinGap,
        primaryFocus: proteinGap > 40 ? 'High Protein Anchor' : 'Balanced Macro Split',
      },
      nextMeal: {
        category: 'Lunch',
        title: 'Steamed Rice with Palakura Pappu, Boiled Eggs & Curd',
        itemsAndPortions: [
          '1 cup steamed Sona Masoori rice (~150g cooked)',
          '1 medium bowl Palakura Pappu (Spinach Dal)',
          '2 boiled eggs (or 100g paneer / soya curry for vegetarian)',
          '1 small katori fresh homemade curd (perugu)',
        ],
        estimatedMacros: {
          calories: 510,
          carbs: 58,
          protein: 26,
          fats: 14,
          fiber: 8,
        },
        whyThisWorks: 'Spinach dal and boiled eggs deliver 26g of bioavailable protein while keeping rice measured to 1 cup, preventing afternoon lethargy and saving calories for dinner.',
        quickAlternative: '2 Phulkas with Andhra Egg Porutu (Bhurji) and cucumber slices',
      },
      laterMeals: [
        {
          category: 'Evening Snacks',
          title: 'Chilled Spiced Buttermilk & Roasted Chana',
          portion: '1 tall glass majjiga (250ml) + 30g putnalu (roasted chana)',
          estCalories: 160,
          estProtein: 9,
        },
        {
          category: 'Dinner',
          title: '2 Phulkas with Light Andhra Chicken Curry or Dal',
          portion: '2 phulkas without oil + 1 bowl chicken curry/dal + cucumber',
          estCalories: 380,
          estProtein: 28,
        },
      ],
      workoutNutritionAdvice: profile?.works_out
        ? `For your ${profile.intensity} session (${profile.duration}m), schedule lunch at least 2.5 hours before training to allow optimal digestion.`
        : 'Keep meal timing structured to sustain stable energy and focus.',
      hydrationAndRecovery: 'Keep a bottle of water and 1 glass of spiced buttermilk handy for mid-afternoon electrolyte replenishment.',
    };
  }

  if (nextCategory === 'Evening Snacks') {
    return {
      stage: 'recommend_snacks',
      headline: 'Pre-Workout & Evening Fuel • High-Protein Snack',
      alreadyEatenDiagnosis: `With Breakfast and Lunch logged, you have consumed ${summary.calories} kcal. You have ${caloriesRemaining} kcal and ${proteinGap}g protein remaining today.`,
      macroStatus: {
        caloriesRemaining,
        proteinRemainingGrams: proteinGap,
        primaryFocus: 'Protein Satiety & Sustained Energy',
      },
      nextMeal: {
        category: 'Evening Snacks',
        title: 'Chilled Spiced Buttermilk with Boiled Eggs or Roasted Chana',
        itemsAndPortions: [
          '1 tall glass spiced buttermilk (majjiga with ginger, curry leaves & hing)',
          '2 boiled eggs with crushed pepper (or 35g roasted chana / putnalu)',
          '1 medium banana if workout is scheduled in 45 mins',
        ],
        estimatedMacros: {
          calories: 220,
          carbs: 18,
          protein: 16,
          fats: 8,
          fiber: 4,
        },
        whyThisWorks: 'Provides a clean 16g protein boost with digestive cooling from majjiga, curbing evening cravings without loading up on heavy fats.',
        quickAlternative: 'Moong sprouts salad with chopped onion, tomato, green chilli, and lemon',
      },
      laterMeals: [
        {
          category: 'Dinner',
          title: '2 Phulkas with Light Andhra Chicken Curry & Salad',
          portion: '2 phulkas + 1 bowl chicken curry or Dal + cucumber',
          estCalories: 380,
          estProtein: 28,
        },
      ],
      workoutNutritionAdvice: profile?.works_out
        ? `If working out this evening, have your snack 45 minutes prior. The electrolytes in buttermilk prevent cramping during ${profile.intensity} workouts.`
        : 'A light protein snack prevents overeating at dinner.',
      hydrationAndRecovery: 'Stay well-hydrated. Afternoon hydration in warm Andhra climates is critical for mental alertness and workout performance.',
    };
  }

  if (nextCategory === 'Dinner') {
    return {
      stage: 'recommend_dinner',
      headline: 'Light Andhra Dinner • Muscle Recovery Split',
      alreadyEatenDiagnosis: `You have logged ${summary.calories} kcal today. Dinner should cleanly hit your remaining ${proteinGap}g protein target while keeping carbs light for easy sleep digestion.`,
      macroStatus: {
        caloriesRemaining,
        proteinRemainingGrams: proteinGap,
        primaryFocus: 'Light Carbs & High Protein',
      },
      nextMeal: {
        category: 'Dinner',
        title: '2 Phulkas with Light Kodi Kura (Chicken Curry) or Egg Curry',
        itemsAndPortions: [
          '2 hot phulkas / chapatis without excess oil',
          '1 bowl Andhra chicken curry or 2-egg curry (or thick Tadka Dal / Paneer for veg)',
          'Sliced cucumber, tomato, and onion salad with lemon juice',
        ],
        estimatedMacros: {
          calories: 390,
          carbs: 38,
          protein: 29,
          fats: 11,
          fiber: 6,
        },
        whyThisWorks: 'Phulkas digest easily before sleep while chicken/egg protein supports overnight muscle recovery without feeling bloated or heavy.',
        quickAlternative: '1 cup light Jeera Rice or Rasam Rice with 2 boiled eggs and vegetable curry',
      },
      laterMeals: [],
      workoutNutritionAdvice: profile?.works_out
        ? `Your post-workout recovery window will be fulfilled by this dinner's protein and complex carbs, replenishing liver and muscle glycogen.`
        : 'Finish dinner at least 2 hours before bedtime for optimal sleep quality and digestive comfort.',
      hydrationAndRecovery: 'Sip a glass of warm water or light chaaru (rasam) after dinner to soothe digestion.',
    };
  }

  // Default: Breakfast
  return {
    stage: 'recommend_breakfast',
    headline: 'High-Protein Andhra Breakfast • Ignite Your Day',
    alreadyEatenDiagnosis: `Starting your day with a calibrated ${targets.calories} kcal goal and ${targets.protein}g protein target. A protein-rich Andhra breakfast sets steady blood sugar for the day.`,
    macroStatus: {
      caloriesRemaining,
      proteinRemainingGrams: proteinGap,
      primaryFocus: 'Protein-Anchor & Clean Fuel',
    },
    nextMeal: {
      category: 'Breakfast',
      title: '2 Pesarattu with Ginger (Allam) Chutney & 1 Boiled Egg',
      itemsAndPortions: [
        '2 medium Pesarattu (whole moong dal crepes)',
        '2 tbsp Allam (Ginger) Chutney',
        '1 boiled egg (or 50g paneer bhurji)',
        '1 cup warm water or spiced ragi java',
      ],
      estimatedMacros: {
        calories: 380,
        carbs: 44,
        protein: 22,
        fats: 9,
        fiber: 9,
      },
      whyThisWorks: 'Whole moong pesarattu paired with eggs delivers 22g of slow-digesting protein and 9g of gut-healthy prebiotic fiber, preventing insulin spikes.',
      quickAlternative: '3 Idlis with Sambar and Peanut Chutney + 1 boiled egg',
    },
    laterMeals: [
      {
        category: 'Lunch',
        title: 'Steamed Rice with Palakura Pappu, Boiled Eggs & Curd',
        portion: '1 cup rice + 1 bowl dal + 2 eggs + curd',
        estCalories: 510,
        estProtein: 26,
      },
      {
        category: 'Evening Snacks',
        title: 'Chilled Spiced Buttermilk & Roasted Chana',
        portion: '1 glass majjiga + 30g putnalu',
        estCalories: 160,
        estProtein: 9,
      },
      {
        category: 'Dinner',
        title: '2 Phulkas with Andhra Chicken Curry / Dal',
        portion: '2 phulkas + 1 bowl curry + salad',
        estCalories: 380,
        estProtein: 28,
      },
    ],
    workoutNutritionAdvice: profile?.works_out
      ? `For your ${profile.intensity} workout, fuel with this balanced breakfast. If you train in the morning, have 1 banana or ragi malt 30 mins prior.`
      : 'Maintain hydration early in the morning to kickstart metabolic burn.',
    hydrationAndRecovery: 'Drink 500ml water upon waking. Target 3.0L total fluids across the day.',
  };
}

/**
 * Generate genuinely day-aware, culturally authentic Andhra Pradesh & South Indian
 * nutrition, meal-by-meal roadmap, and workout recovery guidance.
 */
/**
 * Enhance an already-generated instant local fuel plan using Google Gemini AI in the background.
 * - Non-blocking: caller already has the instant local plan rendered.
 * - Respects AbortSignal for request cancellation when logs change.
 * - Preserves authentic Andhra meals and day-aware context.
 *
 * @param {Object} instantPlan - The synchronously computed local fuel plan
 * @param {Object} profile - User biometrics
 * @param {Array} todayLogs - Today's food logs
 * @param {Object} targets - Daily calorie/macro targets
 * @param {AbortSignal} [signal] - Optional cancellation signal
 * @returns {Promise<Object>} Enhanced fuel plan or the instant plan on failure
 */
export async function enhanceFuelPlanWithAI(instantPlan, profile, todayLogs = [], targets = {}, signal = null) {
  if (!instantPlan) return null;
  if (signal?.aborted) return instantPlan;

  const summary = summarizeLogs(todayLogs);
  const logStatus = instantPlan.logStatus || getMealLogStatus(todayLogs);
  const { loggedMap, isLogged } = logStatus;

  // Format detailed breakdown of meals eaten today
  const mealsEatenBreakdown = Object.entries(loggedMap)
    .filter(([_, items]) => items.length > 0)
    .map(([cat, items]) => {
      const catSummary = summarizeLogs(items);
      const itemList = items.map((it) => `${it.food_name} (${it.quantity}${it.unit})`).join(', ');
      return `* ${cat} [${catSummary.calories} kcal | ${catSummary.carbs}g C, ${catSummary.protein}g P, ${catSummary.fats}g F, ${catSummary.fiber}g Fiber]: ${itemList}`;
    })
    .join('\n');

  const unloggedCategories = ORDERED_MEAL_PERIODS.filter((cat) => !isLogged[cat]);

  try {
    const parsed = await callSecureGemini(
      'generate_suggestions',
      {
        profile,
        targets,
        stage: instantPlan.stage,
        nextCategory: instantPlan.nextMeal?.category || 'Lunch',
        unloggedCategories,
        mealsEatenBreakdown,
        summary,
        caloriesRemaining: instantPlan.macroStatus?.caloriesRemaining ?? 0,
        proteinGap: instantPlan.macroStatus?.proteinRemainingGrams ?? 0,
        carbsGap: instantPlan.macroStatus?.carbsGap ?? 0,
        fatsGap: instantPlan.macroStatus?.fatsGap ?? 0,
        fiberGap: instantPlan.macroStatus?.fiberGap ?? 0,
        currentPeriod: instantPlan.currentPeriod,
      },
      signal
    );

    if (parsed && parsed.nextMeal) {
      return {
        ...instantPlan,
        ...parsed,
        isAiEnhanced: true,
        generatedAt: Date.now(),
        cacheKey: instantPlan.cacheKey,
      };
    }
  } catch (err) {
    if (err.name === 'AbortError' || signal?.aborted) {
      throw err;
    }
    console.warn('[Gemini Enhancement Notice]: Fallback to instant local plan:', err.message);
  }

  return instantPlan;
}

/**
 * Generate genuinely day-aware, culturally authentic Andhra Pradesh & South Indian
 * nutrition, meal-by-meal roadmap, and workout recovery guidance.
 */
export async function generateNutritionSuggestions(profile, todayLogs = [], targets = {}, currentTime = new Date()) {
  const instantPlan = generateInstantFuelPlan(profile, todayLogs, targets, currentTime);
  try {
    const enhanced = await enhanceFuelPlanWithAI(instantPlan, profile, todayLogs, targets);
    return enhanced || instantPlan;
  } catch (_e) {
    return instantPlan;
  }
}
