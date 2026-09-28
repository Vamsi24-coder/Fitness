// Vercel Serverless / Node.js Endpoint: /api/gemini
// Provides secure, server-side Google Gemini execution for Vercel and local environments
// - Strictly enforces authenticated Supabase session (401 on missing or invalid JWT)
// - Employs atomic distributed rate limiting via Supabase PostgreSQL RPC (check_and_increment_rate_limit)
// - Strictly validates user inputs (max 300 chars on descriptions)
// - Protects backend GEMINI_API_KEY from browser exposure
// - Strips internal errors and provides sanitized JSON responses

// Local in-memory safeguard used ONLY as fallback if database RPC is temporarily unreachable
const memoryFallbackMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;
const MIN_INTERVAL_MS = 1500;

async function checkDistributedRateLimit(supabaseUrl, supabaseAnonKey, authHeader, userId) {
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_rate_limit`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_endpoint: 'gemini-nutrition',
        p_max_requests: MAX_REQUESTS_PER_WINDOW,
        p_window_seconds: 60,
        p_min_interval_seconds: 1.5,
      }),
    });

    if (rpcRes.ok) {
      const data = await rpcRes.json();
      if (data && typeof data.allowed === 'boolean') {
        return {
          allowed: data.allowed,
          retryAfter: data.retry_after || 2,
          message: data.message,
        };
      }
    } else {
      const errText = await rpcRes.text();
      console.warn('[Distributed Rate Limit Notice]: RPC returned status', rpcRes.status, errText);
    }
  } catch (err) {
    console.warn('[Distributed Rate Limit Call Error]:', err.message);
  }

  // Fallback in-memory safeguard
  const now = Date.now();
  const timestamps = (memoryFallbackMap.get(userId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length > 0 && now - timestamps[timestamps.length - 1] < MIN_INTERVAL_MS) {
    return {
      allowed: false,
      retryAfter: 2,
      message: 'Requests sent too quickly. Please wait before retrying.',
    };
  }

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
    return {
      allowed: false,
      retryAfter,
      message: 'Rate limit exceeded. Please wait a moment before sending another request.',
    };
  }

  timestamps.push(now);
  memoryFallbackMap.set(userId, timestamps);
  return { allowed: true };
}

const MODELS_TO_TRY = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-pro-latest',
];

function cleanAndParseJSON(rawText) {
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    return JSON.parse(clean);
  } catch (_e) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_inner) {
        // Fall through
      }
    }
    return null;
  }
}

async function executeGeminiWithFallback(apiKeys, prompt, temperature = 0.2) {
  let lastError = null;

  for (const apiKey of apiKeys) {
    for (const model of MODELS_TO_TRY) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          console.warn(`[Gemini Serverless] Model ${model} returned HTTP ${response.status}`);
          lastError = new Error(`Gemini status ${response.status}`);
          // On 429 quota exhaustion or key error, failover to next key or model
          continue;
        }

        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text;
        }
      } catch (_err) {
        console.warn(`[Gemini Serverless] Network error calling ${model}`);
        lastError = new Error(`Network error calling ${model}`);
      }
    }
  }

  throw lastError || new Error('All Gemini model invocations failed.');
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. STRICT AUTHENTICATION CHECK: Authorization header is strictly REQUIRED
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.trim()) {
      return res.status(401).json({
        error: 'Unauthorized: Missing Authorization header.',
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Gemini Serverless] Missing Supabase configuration.');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Verify token with Supabase Auth service directly via REST
    let user = null;
    try {
      const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': authHeader,
        },
      });

      if (!authRes.ok) {
        return res.status(401).json({
          error: 'Unauthorized: Invalid or expired authentication token.',
        });
      }

      user = await authRes.json();
      if (!user || !user.id) {
        return res.status(401).json({
          error: 'Unauthorized: Invalid user session.',
        });
      }
    } catch (authErr) {
      console.error('[Gemini Serverless Auth Error]:', authErr.message);
      return res.status(401).json({
        error: 'Unauthorized: Unable to verify authentication credentials.',
      });
    }

    const userId = user.id;

    // 2. ATOMIC DISTRIBUTED RATE LIMITING
    const rateLimit = await checkDistributedRateLimit(supabaseUrl, supabaseAnonKey, authHeader, userId);
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfter || 2));
      return res.status(429).json({
        error: rateLimit.message || 'Rate limit exceeded. Please wait a moment before sending another request.',
        retryAfter: rateLimit.retryAfter || 2,
      });
    }

    // 3. Secret Acquisition (Supports dual API keys for failover & quota splitting)
    const primaryKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    const secondaryKey = process.env.GEMINI_FALLBACK_API_KEY || process.env.GEMINI_COACH_API_KEY || process.env.VITE_GEMINI_FALLBACK_API_KEY || '';

    // 4. Parse & Validate Payload
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action } = body;

    // Prioritize keys intelligently based on action:
    let targetKeys = [];
    if (action === 'generate_suggestions' && process.env.GEMINI_COACH_API_KEY) {
      targetKeys = [process.env.GEMINI_COACH_API_KEY, primaryKey, secondaryKey];
    } else {
      targetKeys = [primaryKey, secondaryKey];
    }
    const activeApiKeys = Array.from(new Set(targetKeys)).filter((k) => typeof k === 'string' && k.trim().length > 0);

    if (activeApiKeys.length === 0) {
      console.error('[Gemini Serverless] GEMINI_API_KEY secret missing in environment.');
      return res.status(500).json({ error: 'AI service configuration error.' });
    }

    if (action === 'analyze_food') {
      const { foodInput, clarificationAnswers, preferredCategory } = body;

      if (!foodInput || typeof foodInput !== 'string' || !foodInput.trim()) {
        return res.status(400).json({ error: 'Food description is required.' });
      }

      const trimmedInput = foodInput.trim();
      // SERVER-SIDE VALIDATION: 300 character limit
      if (trimmedInput.length > 300) {
        return res.status(400).json({ error: 'Food description must be 300 characters or less.' });
      }

      const safeClarifications = typeof clarificationAnswers === 'string'
        ? clarificationAnswers.trim().slice(0, 300)
        : '';
      const safeCategory = typeof preferredCategory === 'string'
        ? preferredCategory.slice(0, 50)
        : 'Auto-detect';

      const prompt = `You are an expert clinical dietitian and sports nutritionist with conversational intelligence.
User food entry: "${trimmedInput}"
${safeClarifications ? `User clarification answers: "${safeClarifications}"` : ''}
Preferred Meal Category: ${safeCategory}

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

      const rawText = await executeGeminiWithFallback(activeApiKeys, prompt, 0.1);
      const parsed = cleanAndParseJSON(rawText);

      if (!parsed) {
        throw new Error('Failed to parse model output as valid JSON');
      }

      return res.status(200).json(parsed);
    }

    if (action === 'generate_suggestions') {
      const {
        profile,
        targets = {},
        stage = 'recommend_breakfast',
        nextCategory = 'Breakfast',
        unloggedCategories = [],
        mealsEatenBreakdown = '',
        summary = {},
        caloriesRemaining = 0,
        proteinGap = 0,
        carbsGap = 0,
        fatsGap = 0,
        fiberGap = 0,
      } = body;

      const prompt = `You are an elite clinical dietitian and sports nutritionist specializing in authentic Andhra Pradesh and South Indian nutrition.
You are providing the daily nutrition fuel plan for a user in Andhra Pradesh / South India based on their actual biometric profile and what they have consumed so far today.

USER PROFILE:
- Gender: ${profile?.gender || 'Adult'}
- Age: ${profile?.age || 25} years
- Weight: ${profile?.weight || 70} kg
- Primary Goal: ${profile?.primary_goal ? String(profile.primary_goal).replace('_', ' ').toUpperCase() : 'MAINTAIN WEIGHT'}
- Diet Preference: ${profile?.diet_preference ? String(profile.diet_preference).replace('_', ' ').toUpperCase() : 'NO SPECIFIC PREFERENCE'}
- Foods to Avoid / Allergies: ${Array.isArray(profile?.allergies) && profile.allergies.length > 0 ? profile.allergies.join(', ') : 'None'}
- General Daily Activity: ${profile?.daily_activity_level || 'mostly sitting'}
- Daily Walking: ${profile?.walking_duration || '15-30m'}
- Structured Workout: ${profile?.works_out ? `Yes (${profile.intensity} intensity, ${profile.duration} mins/day)` : 'Sedentary / Rest day'}
- Gym Routine: ${profile?.goes_to_gym ? `Yes (${profile.gym_duration || 60} mins, including ${profile.cardio_duration || 0} mins ${profile.cardio_type || 'cardio'})` : 'No'}
- Basal Metabolic Rate (BMR): ${targets.bmr || 1650} kcal
- Daily Calorie Target: ${targets.calories || 2000} kcal
- Daily Macro Targets: ${targets.protein || 120}g Protein (${targets.factors?.proteinPerKg || 1.7}g/kg), ${targets.carbs || 220}g Carbs, ${targets.fats || 65}g Fats, ${targets.fiber || 28}g Fiber

TODAY'S INTAKE & LOGGED MEALS SO FAR:
${mealsEatenBreakdown || 'No meals logged yet today.'}

CURRENT NUTRITIONAL BALANCE & GAPS:
- Calories Consumed: ${summary.calories || 0} kcal / ${targets.calories || 2000} kcal (Remaining: ${caloriesRemaining} kcal)
- Protein Consumed: ${Math.round(summary.protein || 0)}g / ${targets.protein || 120}g (Deficit: ${proteinGap > 0 ? `${proteinGap}g remaining` : `Target met (+${Math.abs(proteinGap)}g)`})
- Carbs Consumed: ${Math.round(summary.carbs || 0)}g / ${targets.carbs || 220}g (Deficit: ${carbsGap > 0 ? `${carbsGap}g remaining` : `Target met (+${Math.abs(carbsGap)}g)`})
- Fats Consumed: ${Math.round(summary.fats || 0)}g / ${targets.fats || 65}g (Deficit: ${fatsGap > 0 ? `${fatsGap}g remaining` : `Target met (+${Math.abs(fatsGap)}g)`})
- Fiber Consumed: ${Math.round(summary.fiber || 0)}g / ${targets.fiber || 28}g (Deficit: ${fiberGap > 0 ? `${fiberGap}g remaining` : `Target met (+${Math.abs(fiberGap)}g)`})

CURRENT STAGE: ${stage}
IMMEDIATE NEXT MEAL TO RECOMMEND: ${nextCategory}
UNLOGGED UPCOMING MEALS: ${unloggedCategories.filter((c) => c !== nextCategory).join(', ') || 'None'}

CRITICAL DIETARY & CULTURAL RULES:
1. STRICTLY RESPECT DIET PREFERENCES & ALLERGIES:
   - Diet: ${profile?.diet_preference || 'no_preference'}. If vegetarian, NEVER suggest chicken, fish, seafood, meat or eggs. If eggetarian, eggs and dairy are allowed, but no meat/fish. If vegan, no animal products (no dairy, ghee, curd, paneer, eggs, meat).
   - Allergies: NEVER recommend any dish containing the user's declared allergens: ${Array.isArray(profile?.allergies) ? profile.allergies.join(', ') : 'None'}.
2. EXCLUSIVELY RECOMMEND REALISTIC, FAMILIAR ANDHRA / SOUTH INDIAN FOODS:
   - Breakfasts: Pesarattu (with allam/ginger chutney), Idli (with sambar or peanut/coconut chutney), Dosa, Rava Upma, Pongal, Chapati, Boiled eggs/egg porutu, Ragi java/porridge.
   - Lunches: Steamed rice (Sona Masoori/brown, measured in cups), Pappu (Palakura, Tomato, Dosakaya, Mamidikaya, Thotakura), Sambar, Rasam (chaaru), Vepudu/Curries (bendakaya, dondakaya, beerakaya, aratikaya), Leafy greens (gongura, thotakura), Curd (perugu), Boiled eggs, Kodi kura (Andhra chicken curry/roast with controlled oil), Chepala pulusu (fish curry), Paneer/Soya chunks curry.
   - Evening Snacks: Spiced Buttermilk (chilled majjiga with ginger, curry leaves, hing), Guggillu / Sundal (boiled tempered chickpeas or black chana), Roasted chana (putnalu), Boiled peanuts, Boiled eggs with black pepper, Moong sprouts salad with lemon, local fruits (guava, banana, papaya, pomegranate).
   - Dinners: Phulkas/Chapatis (2-3 phulkas without excess oil), Light rice with rasam or dal, Moong dal pesarattu, Egg curry, Andhra chicken with sliced cucumber, Curd.
   - DO NOT default to generic Western fitness foods (NO avocado toast, Greek yogurt bowls, quinoa salads, protein pancakes, kale smoothies, turkey deli slices, or cottage cheese).
3. ANDHRA EATING PATTERNS:
   - Lunch is traditionally substantial (Rice + Pappu + Curry + Curd). Honor this rhythm while controlling rice portions (e.g. 1 to 1.5 cups) and boosting dal/egg/curd protein.
   - If Breakfast was carb-dense, recommend high-protein, fiber-rich lunch and dinner (thick dal, boiled eggs, chicken, curd).
   - If Lunch was heavy on rice/carbs, recommend high-protein/low-carb snacks (boiled eggs + buttermilk or roasted chana).
   - If calories are running low, suggest light, satiating options (vegetable chaaru, clear rasam, stir-fried leafy greens, boiled egg whites).
4. SPECIFIC REALISTIC PORTIONS & REASONING:
   - Always state exact portions (e.g., "1 cup steamed rice (~150g cooked)", "1 bowl Palakura Pappu", "2 boiled eggs", "1 tall glass majjiga (250ml)").
   - Explain WHY this meal fits what has already been eaten today and aligns with their primary goal (${profile?.primary_goal || 'Maintain'}).
5. WORKOUT & MOVEMENT TIMING:
   - Connect meal timing to user's workout & gym routine: ${profile?.works_out ? `${profile.intensity} workout (${profile.duration} mins)` : 'Rest day'}.
   - Recommend pre-workout fuel and post-workout protein replenishment.
6. HYDRATION & RECOVERY:
   - Provide practical hydration advice considering bodyweight (${profile?.weight || 70}kg) and climate (recommend spiced buttermilk/majjiga for electrolytes, lemon water, and 2.5-3.5L water).

Respond STRICTLY with a valid JSON object matching this schema (NO markdown fences):
{
  "stage": "${stage}",
  "headline": "Punchy 4-7 word headline summarizing today's state",
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
      "Exact item with portion",
      "Exact item with portion"
    ],
    "estimatedMacros": {
      "calories": 480,
      "carbs": 56,
      "protein": 26,
      "fats": 14,
      "fiber": 8
    },
    "whyThisWorks": "Clear explanation of why this specific combination complements today's prior meals and meets remaining targets.",
    "quickAlternative": "A practical Andhra alternative meal"
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
  "workoutNutritionAdvice": "Specific pre-workout or post-workout guidance tailored to their workout and remaining calories.",
  "hydrationAndRecovery": "Contextual fluid target with practical Andhra hydration tip."
}
`;

      const rawText = await executeGeminiWithFallback(activeApiKeys, prompt, 0.25);
      const parsed = cleanAndParseJSON(rawText);

      if (!parsed || !parsed.nextMeal) {
        throw new Error('Failed to parse suggestion output');
      }

      return res.status(200).json(parsed);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (_err) {
    console.error('[Gemini Serverless] Execution failure');
    return res.status(502).json({
      error: 'AI processing temporarily unavailable. Local fallback active.',
    });
  }
}
