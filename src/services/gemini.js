import { GoogleGenerativeAI } from '@google/generative-ai';
import { summarizeLogs } from './nutrition';

// Primary API key loaded securely from Vite environment variables (VITE_GEMINI_API_KEY)
const PRIMARY_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const FALLBACK_API_KEY = '';

// Prioritize gemini-3.5-flash-lite and flash-lite-latest to avoid free tier 429 quota spikes
const MODELS_TO_TRY = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
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
 * Generate personalized nutrition & workout suggestions
 */
export async function generateNutritionSuggestions(profile, todayLogs = [], targets = {}) {
  const summary = summarizeLogs(todayLogs);

  const carbsGap = Math.round((targets.carbs || 0) - summary.carbs);
  const proteinGap = Math.round((targets.protein || 0) - summary.protein);
  const fatsGap = Math.round((targets.fats || 0) - summary.fats);
  const fiberGap = Math.round((targets.fiber || 0) - summary.fiber);
  const caloriesGap = Math.round((targets.calories || 0) - summary.calories);

  const loggedItemsList = todayLogs.length > 0
    ? todayLogs
        .map(
          (l) =>
            `- ${l.meal_category}: ${l.food_name} (${l.quantity}${l.unit}) -> ${l.carbs}g C, ${l.protein}g P, ${l.fats}g F, ${l.fiber}g fiber`
        )
        .join('\n')
    : 'No food items logged yet today.';

  const prompt = `
You are an expert sports nutritionist and personal health coach.
Analyze the user profile, their nutritional intake so far today, and their macro targets to provide tailored feedback.

User Profile:
- Gender: ${profile?.gender || 'Not specified'}
- Age: ${profile?.age || 25} years
- Weight: ${profile?.weight || 70} kg
- Works out daily: ${profile?.works_out ? 'Yes' : 'No'}
- Workout intensity: ${profile?.intensity || 'None'}
- Workout duration: ${profile?.duration || 0} minutes

Today's Targets:
- Calories Target: ${targets.calories || 2000} kcal (Remaining: ${caloriesGap} kcal)
- Protein Target: ${targets.protein || 120} g (Gap: ${proteinGap > 0 ? `Needs ${proteinGap}g more` : `Exceeded by ${Math.abs(proteinGap)}g`})
- Carbs Target: ${targets.carbs || 220} g (Gap: ${carbsGap > 0 ? `Needs ${carbsGap}g more` : `Exceeded by ${Math.abs(carbsGap)}g`})
- Fats Target: ${targets.fats || 65} g (Gap: ${fatsGap > 0 ? `Needs ${fatsGap}g more` : `Exceeded by ${Math.abs(fatsGap)}g`})
- Fiber Target: ${targets.fiber || 28} g (Gap: ${fiberGap > 0 ? `Needs ${fiberGap}g more` : `Exceeded by ${Math.abs(fiberGap)}g`})

Foods Logged Today:
${loggedItemsList}

Respond STRICTLY with a valid JSON object matching this schema:
{
  "summary": "1-2 encouraging sentences assessing their day so far.",
  "status": "on_track" | "needs_protein" | "needs_fuel" | "over_calories" | "fasting",
  "priorityTip": "One high-impact immediate action the user should take right now.",
  "mealRecommendations": [
    {
      "meal": "e.g. Next Snack or Post-Workout Dinner",
      "foodIdea": "Specific food item or recipe name",
      "macroReason": "Why this fixes their specific macro gap",
      "estCalories": 280
    }
  ],
  "workoutNutritionTip": "Specific pre-workout or post-workout advice tailored to their workout intensity (${profile?.intensity}) and duration (${profile?.duration} min).",
  "hydrationAndRecovery": "Hydration, sleep, or recovery tip."
}
`;

  try {
    const rawText = await generateWithFallback(prompt, { temperature: 0.3 });
    const parsed = cleanAndParseJSON(rawText, null);
    if (parsed) return parsed;
  } catch (err) {
    console.error('Error getting Gemini suggestions:', err);
  }

  return {
    summary: `You've consumed ${summary.calories} of your ${targets.calories} kcal goal today with ${Math.round(summary.protein)}g protein logged.`,
    status: proteinGap > 25 ? 'needs_protein' : 'on_track',
    priorityTip:
      proteinGap > 25
        ? `Prioritize a lean protein source (chicken breast, Greek yogurt, or tofu) to close your ${proteinGap}g protein gap.`
        : `Great job balancing your intake today! Keep staying hydrated throughout your workout.`,
    mealRecommendations: [
      {
        meal: 'Next Meal Recommendation',
        foodIdea:
          proteinGap > 20
            ? 'Grilled Salmon or Tofu with Quinoa and steamed broccoli'
            : 'Whole grain toast with avocado and two boiled eggs',
        macroReason:
          proteinGap > 20
            ? 'Provides 35g of bioavailable protein plus anti-inflammatory omega-3 fats'
            : 'Clean complex carbohydrates and healthy unsaturated fats for sustained energy',
        estCalories: 420,
      },
    ],
    workoutNutritionTip: profile?.works_out
      ? `For your ${profile.intensity} workout (${profile.duration} mins), take 25g fast-digesting carbs 30 mins before, and 25-30g protein within 2 hours after.`
      : 'Maintain steady meal timing every 3-4 hours to keep blood glucose and energy levels stable.',
    hydrationAndRecovery: `Aim for at least ${Math.round((profile?.weight || 70) * 0.035 * 10) / 10} liters of water today.`,
  };
}
