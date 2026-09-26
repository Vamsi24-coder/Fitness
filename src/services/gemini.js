import { GoogleGenerativeAI } from '@google/generative-ai';
import { summarizeLogs } from './nutrition';

// Primary API key loaded securely from Vite environment variables (VITE_GEMINI_API_KEY)
const PRIMARY_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const FALLBACK_API_KEY = '';

// Prioritize gemini-3.5-flash-lite and gemini-3.8-flash for fast, quota-resilient responses
const MODELS_TO_TRY = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-pro-latest',
];

/**
 * Execute generation with API key and model fallback
 */
async function generateWithFallback(prompt, generationConfig = {}) {
  const keys = [PRIMARY_API_KEY, FALLBACK_API_KEY].filter(Boolean);
  let lastError = null;

  for (const apiKey of keys) {
    const genAI = new GoogleGenerativeAI(apiKey);
    for (const modelName of MODELS_TO_TRY) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig,
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) {
          return text;
        }
      } catch (err) {
        console.warn(`Gemini generation notice (${modelName}):`, err.message);
        lastError = err;
      }
    }
  }

  throw lastError || new Error('All Gemini API attempts failed.');
}

/**
 * Clean and parse JSON response from Gemini
 */
function cleanAndParseJSON(rawText, fallbackObj = null) {
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    return JSON.parse(clean);
  } catch (e) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerErr) {
        console.error('Regex JSON parse error:', innerErr);
      }
    }
    return fallbackObj;
  }
}

/**
 * UPGRADE 1 & 3: Intelligent Gemini Nutritionist that asks clarifying follow-up questions
 * (e.g., if user enters "3 dosa", asks about oil/ghee, chutney, fillings before final calculation).
 *
 * @param {string} foodInput - Natural text (e.g. "3 dosa", "caesar salad", "grilled chicken")
 * @param {string} clarificationAnswers - Any answers provided by user to previous questions
 * @param {string} preferredCategory - Meal category context
 */
export async function analyzeFoodWithClarification(foodInput, clarificationAnswers = '', preferredCategory = null) {
  if (!foodInput || !foodInput.trim()) return null;

  const prompt = `You are an expert clinical dietitian and sports nutritionist with conversational intelligence.
User food entry: "${foodInput.trim()}"
${clarificationAnswers ? `User clarification answers: "${clarificationAnswers.trim()}"` : ''}
Preferred Meal Category: ${preferredCategory || 'Auto-detect'}

Task:
1. Determine if this food has critical missing preparation variables that substantially alter calories/macros (e.g., cooking oil/ghee amount, chutney or sauce sides, type of bread/filling, sugar/milk additions, or dressing).
2. IF critical variables are missing and no clarification answers were provided, return a clarification request JSON:
{
  "status": "needs_clarification",
  "food_summary": "Short title of food (e.g. 3 Dosas)",
  "message": "Friendly 1-sentence question asking for preparation details",
  "questions": [
    {
      "id": "oil_or_fat",
      "question": "How much cooking oil, ghee, or butter was used?",
      "options": ["Cooked with 1 tsp oil/ghee (~5g fat)", "Ghee roast / Crispy (2 tsp ghee, ~10g fat)", "Minimal / Non-stick pan (1-2g fat)"]
    },
    {
      "id": "sides_or_chutney",
      "question": "Which chutney, sauce, or side did you have?",
      "options": ["Coconut Chutney & Sambar", "Tomato / Onion Chutney", "Only Sambar", "No chutney or sides"]
    },
    {
      "id": "food_variant",
      "question": "What type or variant?",
      "options": ["Plain / Regular", "Filled (e.g. Masala / Potato)", "Whole grain / Oats / Rava"]
    }
  ]
}

3. IF sufficient details exist OR clarification answers are provided, calculate exact composite nutrition:
{
  "status": "calculated",
  "food_name": "Clear descriptive title including cooking details (e.g. 3 Plain Dosas with Coconut Chutney & 1 tsp oil)",
  "meal_category": "Breakfast" | "Lunch" | "Snacks" | "Dinner",
  "quantity": numeric quantity (e.g. 3, 1, 200),
  "unit": "piece" | "serving" | "g" | "bowl" | "plate" | "cup",
  "carbs": numeric grams of carbs,
  "protein": numeric grams of protein,
  "fats": numeric grams of fats,
  "fiber": numeric grams of fiber,
  "calories": numeric total (carbs*4 + protein*4 + fats*9),
  "breakdown_note": "A concise 1-2 sentence breakdown showing exactly how the base food, oil, and sides factored into the final macros."
}

Respond STRICTLY with valid JSON only. Do NOT include markdown fences.`;

  try {
    const rawText = await generateWithFallback(prompt, { temperature: 0.1 });
    const parsed = cleanAndParseJSON(rawText);

    if (parsed) {
      if (parsed.status === 'needs_clarification' && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return {
          status: 'needs_clarification',
          food_summary: parsed.food_summary || foodInput,
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
          food_name: parsed.food_name || foodInput.trim(),
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
    console.error('Conversational nutrition calculation error:', err);
  }

  // Smart local fallback for common items like "dosa" if API rate limits or network issues occur
  const lower = foodInput.toLowerCase();
  if (lower.includes('dosa') && !clarificationAnswers) {
    return {
      status: 'needs_clarification',
      food_summary: foodInput,
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
    food_name: foodInput,
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
function getAndhraFallbackSuggestions(nextCategory, stage, summary, targets, profile, eatenCategories = []) {
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
export async function generateNutritionSuggestions(profile, todayLogs = [], targets = {}) {
  const summary = summarizeLogs(todayLogs);

  // Group today's logs by meal category
  const mealsByCategory = {
    Breakfast: [],
    Lunch: [],
    Snacks: [],
    Dinner: [],
  };

  todayLogs.forEach((log) => {
    const rawCat = (log.meal_category || 'Snacks').trim().toLowerCase();
    if (rawCat === 'breakfast') mealsByCategory.Breakfast.push(log);
    else if (rawCat === 'lunch') mealsByCategory.Lunch.push(log);
    else if (rawCat === 'dinner') mealsByCategory.Dinner.push(log);
    else mealsByCategory.Snacks.push(log);
  });

  const MEAL_ORDER = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
  const eatenCategories = MEAL_ORDER.filter((cat) => mealsByCategory[cat].length > 0);
  const unloggedCategories = MEAL_ORDER.filter((cat) => mealsByCategory[cat].length === 0);

  // Determine dynamic stage and next meal based on what is logged
  let stage = 'recommend_breakfast';
  let nextCategory = 'Breakfast';

  if (mealsByCategory.Breakfast.length > 0 && mealsByCategory.Lunch.length === 0) {
    stage = 'recommend_lunch';
    nextCategory = 'Lunch';
  } else if (mealsByCategory.Lunch.length > 0 && mealsByCategory.Snacks.length === 0 && mealsByCategory.Dinner.length === 0) {
    stage = 'recommend_snacks';
    nextCategory = 'Evening Snacks';
  } else if (mealsByCategory.Lunch.length > 0 && mealsByCategory.Dinner.length === 0) {
    stage = 'recommend_dinner';
    nextCategory = 'Dinner';
  } else if (mealsByCategory.Dinner.length > 0) {
    stage = 'day_complete';
    nextCategory = 'DayComplete';
  } else if (unloggedCategories.length > 0) {
    nextCategory = unloggedCategories[0];
    stage = `recommend_${nextCategory.toLowerCase()}`;
  }

  // Calculate remaining macros
  const caloriesRemaining = Math.max(0, Math.round((targets.calories || 2000) - summary.calories));
  const proteinGap = Math.round((targets.protein || 120) - summary.protein);
  const carbsGap = Math.round((targets.carbs || 220) - summary.carbs);
  const fatsGap = Math.round((targets.fats || 65) - summary.fats);
  const fiberGap = Math.round((targets.fiber || 28) - summary.fiber);

  // Format detailed breakdown of meals eaten today
  const mealsEatenBreakdown = eatenCategories.map((cat) => {
    const items = mealsByCategory[cat];
    const catSummary = summarizeLogs(items);
    const itemList = items.map((it) => `${it.food_name} (${it.quantity}${it.unit})`).join(', ');
    return `* ${cat} [${catSummary.calories} kcal | ${catSummary.carbs}g C, ${catSummary.protein}g P, ${catSummary.fats}g F, ${catSummary.fiber}g Fiber]: ${itemList}`;
  }).join('\n');

  const prompt = `You are an elite clinical dietitian and sports nutritionist specializing in authentic Andhra Pradesh and South Indian nutrition.
You are providing the daily nutrition fuel plan for a user in Andhra Pradesh / South India based on their actual biometric profile and what they have consumed so far today.

USER PROFILE:
- Gender: ${profile?.gender || 'Adult'}
- Age: ${profile?.age || 25} years
- Weight: ${profile?.weight || 70} kg
- Daily Workout: ${profile?.works_out ? `Yes (${profile.intensity} intensity, ${profile.duration} mins/day)` : 'Sedentary / Rest day'}
- Basal Metabolic Rate (BMR): ${targets.bmr || 1650} kcal
- Daily Calorie Target: ${targets.calories || 2000} kcal
- Daily Macro Targets: ${targets.protein || 120}g Protein (${targets.factors?.proteinPerKg || 1.7}g/kg), ${targets.carbs || 220}g Carbs, ${targets.fats || 65}g Fats, ${targets.fiber || 28}g Fiber

TODAY'S INTAKE & LOGGED MEALS SO FAR:
${mealsEatenBreakdown || 'No meals logged yet today.'}

CURRENT NUTRITIONAL BALANCE & GAPS:
- Calories Consumed: ${summary.calories} kcal / ${targets.calories || 2000} kcal (Remaining: ${caloriesRemaining} kcal)
- Protein Consumed: ${Math.round(summary.protein)}g / ${targets.protein || 120}g (Deficit: ${proteinGap > 0 ? `${proteinGap}g remaining` : `Target met (+${Math.abs(proteinGap)}g)`})
- Carbs Consumed: ${Math.round(summary.carbs)}g / ${targets.carbs || 220}g (Deficit: ${carbsGap > 0 ? `${carbsGap}g remaining` : `Target met (+${Math.abs(carbsGap)}g)`})
- Fats Consumed: ${Math.round(summary.fats)}g / ${targets.fats || 65}g (Deficit: ${fatsGap > 0 ? `${fatsGap}g remaining` : `Target met (+${Math.abs(fatsGap)}g)`})
- Fiber Consumed: ${Math.round(summary.fiber)}g / ${targets.fiber || 28}g (Deficit: ${fiberGap > 0 ? `${fiberGap}g remaining` : `Target met (+${Math.abs(fiberGap)}g)`})

CURRENT STAGE: ${stage}
IMMEDIATE NEXT MEAL TO RECOMMEND: ${nextCategory}
UNLOGGED UPCOMING MEALS: ${unloggedCategories.filter(c => c !== nextCategory).join(', ') || 'None'}

CRITICAL DIETARY & CULTURAL RULES FOR ANDHRA PRADESH / SOUTH INDIA:
1. EXCLUSIVELY RECOMMEND REALISTIC, FAMILIAR ANDHRA / SOUTH INDIAN FOODS:
   - Breakfasts: Pesarattu (with allam/ginger chutney), Idli (with sambar or peanut/coconut chutney), Dosa, Rava Upma, Pongal, Chapati, Boiled eggs/egg porutu, Ragi java/porridge.
   - Lunches: Steamed rice (Sona Masoori/brown, measured in cups), Pappu (Palakura, Tomato, Dosakaya, Mamidikaya, Thotakura), Sambar, Rasam (chaaru), Vepudu/Curries (bendakaya, dondakaya, beerakaya, aratikaya), Leafy greens (gongura, thotakura), Curd (perugu), Boiled eggs, Kodi kura (Andhra chicken curry/roast with controlled oil), Chepala pulusu (fish curry), Paneer/Soya chunks curry.
   - Evening Snacks: Spiced Buttermilk (chilled majjiga with ginger, curry leaves, hing), Guggillu / Sundal (boiled tempered chickpeas or black chana), Roasted chana (putnalu), Boiled peanuts, Boiled eggs with black pepper, Moong sprouts salad with lemon, local fruits (guava, banana, papaya, pomegranate).
   - Dinners: Phulkas/Chapatis (2-3 phulkas without excess oil), Light rice with rasam or dal, Moong dal pesarattu, Egg curry, Andhra chicken with sliced cucumber, Curd.
   - DO NOT default to generic Western fitness foods (NO avocado toast, Greek yogurt bowls, quinoa salads, protein pancakes, kale smoothies, turkey deli slices, or cottage cheese).
2. ANDHRA EATING PATTERNS:
   - Lunch is traditionally substantial (Rice + Pappu + Curry + Curd). Honor this rhythm while controlling rice portions (e.g. 1 to 1.5 cups) and boosting dal/egg/curd protein.
   - If Breakfast was carb-dense (e.g. 3-4 idlis or 2 dosas), recommend high-protein, fiber-rich lunch and dinner (thick dal, boiled eggs, chicken, curd).
   - If Lunch was heavy on rice/carbs, recommend high-protein/low-carb snacks (boiled eggs + buttermilk or roasted chana).
   - If calories are running low, suggest light, satiating options (vegetable chaaru, clear rasam, stir-fried leafy greens, boiled egg whites).
3. SPECIFIC REALISTIC PORTIONS & REASONING:
   - Always state exact portions (e.g., "1 cup steamed rice (~150g cooked)", "1 bowl Palakura Pappu", "2 boiled eggs", "1 tall glass majjiga (250ml)").
   - Explain WHY this meal fits what has already been eaten today.
4. WORKOUT TIMING:
   - Connect meal timing to user's workout: ${profile?.works_out ? `${profile.intensity} workout (${profile.duration} mins)` : 'Rest day'}.
   - Recommend pre-workout fuel (e.g. banana or ragi malt 30-45 mins before) and post-workout protein replenishment (within 1-2 hours).
5. HYDRATION & RECOVERY:
   - Provide practical hydration advice considering bodyweight (${profile?.weight || 70}kg) and Andhra warm climate (recommend spiced buttermilk/majjiga for electrolytes, lemon water, and 2.5-3.5L water).

Respond STRICTLY with a valid JSON object matching this schema (NO markdown fences):
{
  "stage": "${stage}",
  "headline": "Punchy 4-7 word headline summarizing today's state (e.g. 'Breakfast Logged • High-Protein Lunch Plan')",
  "alreadyEatenDiagnosis": "1-2 sentences diagnosing what has been consumed so far today and what nutritional gaps need immediate attention.",
  "macroStatus": {
    "caloriesRemaining": ${caloriesRemaining},
    "proteinRemainingGrams": ${Math.max(0, proteinGap)},
    "primaryFocus": "High Protein & Controlled Carbs" | "Glycogen Fuel" | "Calorie Deficit Control" | "Hydration & Recovery"
  },
  "nextMeal": {
    "category": "${nextCategory === 'DayComplete' ? 'Day Completed' : nextCategory}",
    "title": "Clear descriptive name of recommended Andhra meal",
    "itemsAndPortions": [
      "Exact item with portion (e.g. 1 cup steamed rice ~150g)",
      "Exact item with portion (e.g. 1 bowl Palakura Pappu)",
      "Exact item with portion (e.g. 2 boiled eggs or 100g paneer)",
      "Exact item with portion (e.g. 1 small cup fresh homemade curd)"
    ],
    "estimatedMacros": {
      "calories": 480,
      "carbs": 56,
      "protein": 26,
      "fats": 14,
      "fiber": 8
    },
    "whyThisWorks": "Clear explanation of why this specific combination complements today's prior meals and meets remaining targets.",
    "quickAlternative": "A practical Andhra alternative meal (e.g. 2 Phulkas with Egg Porutu and cucumber slices)"
  },
  "laterMeals": [
    {
      "category": "Meal Category Name",
      "title": "Descriptive meal name",
      "portion": "Concise items and portions",
      "estCalories": 220,
      "estProtein": 12
    }
  ],
  "workoutNutritionAdvice": "Specific pre-workout or post-workout guidance tailored to their ${profile?.intensity || 'daily'} workout and remaining calories.",
  "hydrationAndRecovery": "Contextual fluid target with practical Andhra hydration tip (e.g. spiced buttermilk / majjiga)."
}
`;

  try {
    const rawText = await generateWithFallback(prompt, { temperature: 0.25 });
    const parsed = cleanAndParseJSON(rawText, null);
    if (parsed && parsed.nextMeal) {
      parsed.eatenCategories = eatenCategories;
      parsed.summary = parsed.headline || parsed.summary || 'Custom Andhra Fuel Plan';
      parsed.priorityTip = parsed.alreadyEatenDiagnosis || parsed.priorityTip;
      parsed.workoutNutritionTip = parsed.workoutNutritionAdvice || parsed.workoutNutritionTip;
      return parsed;
    }
  } catch (err) {
    console.error('Error getting dynamic Andhra nutrition suggestions from Gemini:', err);
  }

  // Graceful, authentic Andhra fallback plan
  const fallback = getAndhraFallbackSuggestions(nextCategory, stage, summary, targets, profile, eatenCategories);
  fallback.eatenCategories = eatenCategories;
  fallback.summary = fallback.headline;
  fallback.priorityTip = fallback.alreadyEatenDiagnosis;
  fallback.workoutNutritionTip = fallback.workoutNutritionAdvice;
  return fallback;
}
