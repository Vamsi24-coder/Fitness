import { summarizeLogs } from './nutrition.js';

/**
 * Meal Windows Definition (Local Device Time)
 * BREAKFAST:  6:00 AM  - 11:59 AM (06:00 - 11:59)
 * LUNCH:      12:00 PM -  3:59 PM (12:00 - 15:59)
 * SNACKS:      4:00 PM -  6:59 PM (16:00 - 18:59)
 * DINNER:      7:00 PM - 10:30 PM (19:00 - 22:30)
 * LATE NIGHT: 10:31 PM -  5:59 AM (22:31 - 05:59)
 */
export const MEAL_WINDOWS = {
  BREAKFAST: { start: 6 * 60, end: 11 * 60 + 59, name: 'Breakfast' },
  LUNCH: { start: 12 * 60, end: 15 * 60 + 59, name: 'Lunch' },
  SNACKS: { start: 16 * 60, end: 18 * 60 + 59, name: 'Evening Snacks' },
  DINNER: { start: 19 * 60, end: 22 * 60 + 30, name: 'Dinner' },
};

export const ORDERED_MEAL_PERIODS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

/**
 * Get current meal period from local device time
 * @param {Date} [date] - Local Date instance
 * @returns {'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner' | 'LateNight'}
 */
export function getCurrentMealPeriod(date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes >= 360 && totalMinutes <= 719) {
    return 'Breakfast';
  }
  if (totalMinutes >= 720 && totalMinutes <= 959) {
    return 'Lunch';
  }
  if (totalMinutes >= 960 && totalMinutes <= 1139) {
    return 'Snacks';
  }
  if (totalMinutes >= 1140 && totalMinutes <= 1350) {
    return 'Dinner';
  }
  return 'LateNight';
}

/**
 * Format local calendar date YYYY-MM-DD safely without UTC timezone shift
 * @param {Date} [d]
 * @returns {string}
 */
export function formatLocalDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Categorize logged items for the day
 */
export function getMealLogStatus(todayLogs = []) {
  const loggedMap = {
    Breakfast: [],
    Lunch: [],
    Snacks: [],
    Dinner: [],
  };

  todayLogs.forEach((log) => {
    const raw = (log.meal_category || '').trim().toLowerCase();
    if (raw === 'breakfast') loggedMap.Breakfast.push(log);
    else if (raw === 'lunch') loggedMap.Lunch.push(log);
    else if (raw === 'dinner') loggedMap.Dinner.push(log);
    else loggedMap.Snacks.push(log);
  });

  return {
    loggedMap,
    isLogged: {
      Breakfast: loggedMap.Breakfast.length > 0,
      Lunch: loggedMap.Lunch.length > 0,
      Snacks: loggedMap.Snacks.length > 0,
      Dinner: loggedMap.Dinner.length > 0,
    },
    count: todayLogs.length,
  };
}

/**
 * Determine past, current, and upcoming periods for today based on time
 */
export function getDayPeriodsSplit(currentPeriod) {
  if (currentPeriod === 'Breakfast') {
    return {
      past: [],
      current: 'Breakfast',
      upcoming: ['Lunch', 'Snacks', 'Dinner'],
    };
  }
  if (currentPeriod === 'Lunch') {
    return {
      past: ['Breakfast'],
      current: 'Lunch',
      upcoming: ['Snacks', 'Dinner'],
    };
  }
  if (currentPeriod === 'Snacks') {
    return {
      past: ['Breakfast', 'Lunch'],
      current: 'Snacks',
      upcoming: ['Dinner'],
    };
  }
  if (currentPeriod === 'Dinner') {
    return {
      past: ['Breakfast', 'Lunch', 'Snacks'],
      current: 'Dinner',
      upcoming: [],
    };
  }
  // LateNight
  return {
    past: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
    current: 'LateNight',
    upcoming: [],
  };
}

/**
 * Authentic Andhra Pradesh & South Indian meal templates calibrated with realistic portions
 */
export const ANDHRA_MEAL_TEMPLATES = {
  Breakfast: {
    standard: {
      category: 'Breakfast',
      title: '2 Pesarattu with Allam (Ginger) Chutney & 1 Boiled Egg',
      itemsAndPortions: [
        '2 medium Pesarattu (whole green gram moong dal crepes)',
        '2 tbsp Allam (Ginger) Chutney',
        '1 boiled egg with black pepper (or 50g paneer bhurji)',
        '1 tall glass warm water or spiced ragi java',
      ],
      estimatedMacros: {
        calories: 380,
        carbs: 44,
        protein: 22,
        fats: 9,
        fiber: 9,
      },
      whyThisWorks: 'Whole moong dal delivers sustained complex carbs and 9g prebiotic fiber, paired with egg protein for a steady metabolic start without insulin spikes.',
      quickAlternative: '3 Idlis with Drumstick Sambar & Peanut Chutney + 1 boiled egg',
    },
    highProtein: {
      category: 'Breakfast',
      title: 'Moong Dal Pesarattu with Double Boiled Eggs & Coconut Chutney',
      itemsAndPortions: [
        '2 medium whole moong Pesarattu',
        '2 whole boiled eggs with crushed black pepper',
        '2 tbsp fresh coconut/peanut chutney & allam chutney',
        '1 cup warm spiced ragi porridge (unsweetened)',
      ],
      estimatedMacros: {
        calories: 450,
        carbs: 45,
        protein: 29,
        fats: 14,
        fiber: 10,
      },
      whyThisWorks: 'Supplies 29g high-biological-value protein to jumpstart muscle recovery and keep satiety elevated through the morning.',
      quickAlternative: 'Andhra Egg Porutu (3 eggs scrambled with green chillies & onions) + 2 Phulkas',
    },
  },

  Lunch: {
    standard: {
      category: 'Lunch',
      title: 'Steamed Rice with Palakura Pappu, Boiled Eggs & Curd',
      itemsAndPortions: [
        '1 cup steamed Sona Masoori rice (~150g cooked)',
        '1 medium bowl Palakura Pappu (Spinach Dal)',
        '2 boiled eggs (or 100g Paneer / Soya Chunks Curry for vegetarian)',
        '1 small katori fresh homemade curd (perugu)',
      ],
      estimatedMacros: {
        calories: 510,
        carbs: 58,
        protein: 26,
        fats: 14,
        fiber: 8,
      },
      whyThisWorks: 'Traditional Andhra lunch balanced with measured rice, iron-rich spinach dal, and egg protein to prevent afternoon drowsiness while satisfying calorie needs.',
      quickAlternative: '2 Phulkas with Andhra Egg Porutu and cucumber slices',
    },
    highProtein: {
      category: 'Lunch',
      title: 'Controlled Sona Masoori Rice with Andhra Kodi Kura & Spinach Dal',
      itemsAndPortions: [
        '1 cup steamed Sona Masoori rice (~150g cooked)',
        '150g Andhra Chicken Curry (Kodi Kura) or 150g Paneer Curry',
        '1 small bowl Palakura Pappu',
        '1 small katori fresh homemade curd (perugu)',
      ],
      estimatedMacros: {
        calories: 560,
        carbs: 52,
        protein: 38,
        fats: 16,
        fiber: 7,
      },
      whyThisWorks: 'Delivers 38g protein to accelerate post-workout repair while measuring rice to keep total carbs in check.',
      quickAlternative: '3 Phulkas with Chepala Pulusu (Andhra Fish Curry) and raw cucumber salad',
    },
    calorieControlled: {
      category: 'Lunch',
      title: '2 Phulkas with Thick Tomato Pappu, Boiled Egg Whites & Cucumber Salad',
      itemsAndPortions: [
        '2 oil-free wheat Phulkas',
        '1 generous bowl Tomato Pappu (lentils with tomatoes & spices)',
        '3 boiled egg whites (or 80g boiled chickpeas/chana)',
        '1 bowl sliced cucumbers & tomatoes with lemon squeeze',
      ],
      estimatedMacros: {
        calories: 420,
        carbs: 50,
        protein: 24,
        fats: 8,
        fiber: 9,
      },
      whyThisWorks: 'High volume and fiber from lentils and fresh salad maximize fullness on a controlled calorie budget.',
      quickAlternative: '1 cup steamed brown rice with vegetable chaaru and 2 boiled eggs',
    },
  },

  Snacks: {
    standard: {
      category: 'Evening Snacks',
      title: 'Chilled Spiced Buttermilk & Roasted Chana (Putnalu)',
      itemsAndPortions: [
        '1 tall glass spiced buttermilk (majjiga with crushed ginger, curry leaves, hing)',
        '35g roasted chana / putnalu (or 2 boiled eggs with pepper)',
        '1 small banana or guava for active electrolyte replenish',
      ],
      estimatedMacros: {
        calories: 220,
        carbs: 22,
        protein: 15,
        fats: 6,
        fiber: 5,
      },
      whyThisWorks: 'Electrolyte-rich majjiga aids digestive cooling in warm climates while roasted chana delivers crunch and 15g protein without excess saturated fats.',
      quickAlternative: 'Moong sprouts salad with chopped onion, tomato, and lemon juice',
    },
    preWorkout: {
      category: 'Evening Snacks',
      title: 'Spiced Buttermilk with Banana & Boiled Eggs',
      itemsAndPortions: [
        '1 medium ripe banana (quick-burning glycogen)',
        '2 boiled egg whites with rock salt and pepper',
        '1 glass light majjiga for hydration and cramping prevention',
      ],
      estimatedMacros: {
        calories: 210,
        carbs: 28,
        protein: 14,
        fats: 3,
        fiber: 4,
      },
      whyThisWorks: 'Fast-digesting potassium from banana fuels muscle contraction while light protein primes amino acid availability for training.',
      quickAlternative: '1 cup warm ragi java with jaggery and a handful of roasted peanuts',
    },
  },

  Dinner: {
    standard: {
      category: 'Dinner',
      title: '2 Phulkas with Light Kodi Kura (Chicken Curry) or Egg Curry',
      itemsAndPortions: [
        '2 hot wheat Phulkas / chapatis without excess oil',
        '1 bowl Andhra chicken curry or 2-egg curry (or thick Tadka Dal / Paneer)',
        'Sliced cucumber, tomato, and onion salad with lemon',
      ],
      estimatedMacros: {
        calories: 390,
        carbs: 38,
        protein: 29,
        fats: 11,
        fiber: 6,
      },
      whyThisWorks: 'Phulkas digest easily before sleep while lean chicken or egg protein supports overnight muscle repair without nocturnal bloating.',
      quickAlternative: '1 cup light Jeera Rice or Rasam Rice with 2 boiled eggs and green vegetable curry',
    },
    highProteinLight: {
      category: 'Dinner',
      title: '2 Phulkas with High-Protein Kodi Kura & Leafy Green Vepudu',
      itemsAndPortions: [
        '2 dry phulkas',
        '180g lean chicken breast curry (Kodi Kura) or 150g grilled tofu/paneer',
        '1 small bowl Thotakura (amaranth) or Palakura stir-fry (vepudu)',
        '1 bowl fresh sliced cucumbers',
      ],
      estimatedMacros: {
        calories: 420,
        carbs: 34,
        protein: 36,
        fats: 12,
        fiber: 7,
      },
      whyThisWorks: 'High protein density (36g) closes the day’s remaining protein deficit while keeping carbs moderate for nocturnal growth hormone release.',
      quickAlternative: 'Moong dal pesarattu with egg porutu and fresh mint chaaru',
    },
    lightRecovery: {
      category: 'Dinner',
      title: '2 Phulkas with Moong Dal & Tomato Chaaru (Rasam)',
      itemsAndPortions: [
        '2 light phulkas',
        '1 bowl yellow moong dal with cumin and garlic',
        '1 cup warm clear tomato rasam / chaaru',
        '2 boiled egg whites with pepper',
      ],
      estimatedMacros: {
        calories: 340,
        carbs: 42,
        protein: 21,
        fats: 7,
        fiber: 6,
      },
      whyThisWorks: 'Gentle on digestion, rehydrates with spiced rasam, and fits comfortably within remaining calorie room.',
      quickAlternative: '1 cup soft Pongal with vegetable sambar and boiled egg',
    },
  },

  TomorrowBreakfast: {
    standard: {
      category: "Tomorrow's Breakfast",
      title: 'High-Protein Moong Dal Pesarattu with Allam Chutney & Egg',
      portion: '2 medium Pesarattu + 1 boiled egg + ginger chutney',
      estCalories: 380,
      estProtein: 22,
    },
    alternative: {
      category: "Tomorrow's Breakfast",
      title: 'Steamed Idlis with Drumstick Sambar & Peanut Podi',
      portion: '3 idlis + sambar + 1 boiled egg',
      estCalories: 360,
      estProtein: 19,
    },
  },

  DayComplete: {
    category: 'Day Completed',
    title: 'Daily Nutrition Cycle Completed',
    itemsAndPortions: [
      'All primary meals logged today',
      'Sip a glass of warm water or light majjiga with hing for digestion',
      'Target 7-8 hours deep sleep for muscle recovery',
    ],
    estimatedMacros: null,
    whyThisWorks: 'Consistent logging and meal adherence form the bedrock of sustainable health and body composition.',
    quickAlternative: 'Prepare tomorrow morning moong batter or boiled eggs in advance.',
  },

  LateNight: {
    category: 'Late Night',
    title: 'Overnight Digestion & Sleep Recovery',
    itemsAndPortions: [
      'Meal window closed for heavy digestion',
      '1 glass warm water with a pinch of cumin or ginger',
      'If hungry, 1 cup light spiced buttermilk or 1 boiled egg white',
      'Plan for Tomorrow Breakfast at 7:00 - 8:30 AM',
    ],
    estimatedMacros: {
      calories: 60,
      carbs: 4,
      protein: 6,
      fats: 1,
      fiber: 0,
    },
    whyThisWorks: 'Eating heavy meals late at night disrupts REM and deep slow-wave sleep. Light hydration supports overnight cellular repair.',
    quickAlternative: 'Herbal chamomile tea or warm turmeric water',
  },
};

/**
 * Generate instantaneous local, day-aware, and time-aware nutrition fuel plan
 * Target latency: < 5ms (pure in-memory evaluation)
 *
 * @param {Object} profile - User biometric profile
 * @param {Array} todayLogs - Today's food logs
 * @param {Object} targets - Daily calorie/macro targets
 * @param {Date} [currentTime] - Current local device date
 * @returns {Object} Complete Fuel Plan conforming to AISuggestions UI schema
 */
export function generateInstantFuelPlan(profile, todayLogs = [], targets = {}, currentTime = new Date()) {
  const summary = summarizeLogs(todayLogs);
  const currentPeriod = getCurrentMealPeriod(currentTime);
  const logStatus = getMealLogStatus(todayLogs);
  const { isLogged, loggedMap } = logStatus;

  // Deficits / Remaining Targets
  const targetCals = targets.calories || 2000;
  const targetProtein = targets.protein || 120;
  const targetCarbs = targets.carbs || 220;
  const targetFats = targets.fats || 65;
  const targetFiber = targets.fiber || 28;

  const caloriesRemaining = Math.max(0, Math.round(targetCals - summary.calories));
  const proteinGap = Math.round(targetProtein - summary.protein);
  const carbsGap = Math.round(targetCarbs - summary.carbs);
  const fatsGap = Math.round(targetFats - summary.fats);
  const fiberGap = Math.round(targetFiber - summary.fiber);

  // Determine stage and next meal based on CURRENT TIME OF DAY and ACTUAL LOGGED MEALS
  let stage = 'recommend_breakfast';
  let nextCategory = 'Breakfast';
  let nextMealData = null;
  let laterMeals = [];
  let alreadyEatenDiagnosis = '';
  let headline = '';
  let primaryFocus = 'Balanced Macro Split';

  const isBreakfastLogged = isLogged.Breakfast;
  const isLunchLogged = isLogged.Lunch;
  const isSnacksLogged = isLogged.Snacks;
  const isDinnerLogged = isLogged.Dinner;

  const allMealsLogged = isBreakfastLogged && isLunchLogged && isSnacksLogged && isDinnerLogged;

  // TIME-AWARE + LOG-AWARE DECISION MATRIX:
  if (currentPeriod === 'Breakfast') {
    // 6:00 AM - 11:59 AM
    if (!isBreakfastLogged) {
      stage = 'recommend_breakfast';
      nextCategory = 'Breakfast';
      headline = 'Morning Fuel • High-Protein Andhra Breakfast';
      alreadyEatenDiagnosis = `Starting your day with a target of ${targetCals} kcal and ${targetProtein}g protein. A moong-dal protein anchor primes sustained energy without mid-morning glucose crashes.`;
      primaryFocus = proteinGap > 30 ? 'High Protein Anchor' : 'Clean Morning Fuel';

      nextMealData = proteinGap > 30 
        ? ANDHRA_MEAL_TEMPLATES.Breakfast.highProtein 
        : ANDHRA_MEAL_TEMPLATES.Breakfast.standard;

      laterMeals = [
        {
          category: 'Lunch',
          title: ANDHRA_MEAL_TEMPLATES.Lunch.standard.title,
          portion: '1 cup Sona Masoori rice + Palakura Pappu + 2 eggs + curd',
          estCalories: 510,
          estProtein: 26,
        },
        {
          category: 'Evening Snacks',
          title: ANDHRA_MEAL_TEMPLATES.Snacks.standard.title,
          portion: '1 tall glass majjiga + 35g putnalu (roasted chana)',
          estCalories: 220,
          estProtein: 15,
        },
        {
          category: 'Dinner',
          title: ANDHRA_MEAL_TEMPLATES.Dinner.standard.title,
          portion: '2 phulkas + 1 bowl chicken curry/dal + salad',
          estCalories: 390,
          estProtein: 29,
        },
      ];
    } else {
      // Breakfast is logged; current window is Breakfast, so next meal to prepare is Lunch!
      stage = 'recommend_lunch';
      nextCategory = 'Lunch';
      headline = 'Breakfast Logged • Balanced Andhra Lunch Plan';
      alreadyEatenDiagnosis = `Breakfast logged (${summary.calories} kcal, ${Math.round(summary.protein)}g protein). Plan your lunch around measured rice, protein-dense dal, and eggs to stay on target.`;
      primaryFocus = proteinGap > 40 ? 'High Protein Anchor' : 'Balanced Macro Split';

      nextMealData = proteinGap > 40
        ? ANDHRA_MEAL_TEMPLATES.Lunch.highProtein
        : ANDHRA_MEAL_TEMPLATES.Lunch.standard;

      laterMeals = [
        {
          category: 'Evening Snacks',
          title: ANDHRA_MEAL_TEMPLATES.Snacks.standard.title,
          portion: '1 glass spiced buttermilk + roasted chana',
          estCalories: 220,
          estProtein: 15,
        },
        {
          category: 'Dinner',
          title: ANDHRA_MEAL_TEMPLATES.Dinner.standard.title,
          portion: '2 phulkas + chicken curry or dal + salad',
          estCalories: 390,
          estProtein: 29,
        },
      ];
    }
  } else if (currentPeriod === 'Lunch') {
    // 12:00 PM - 3:59 PM
    if (!isLunchLogged) {
      stage = 'recommend_lunch';
      nextCategory = 'Lunch';
      headline = isBreakfastLogged
        ? 'Midday Fuel • Balanced Andhra Lunch'
        : 'Lunch Time • Refuel & Catch Up on Protein';

      alreadyEatenDiagnosis = isBreakfastLogged
        ? `Breakfast provided ${summary.calories} kcal. Lunch combines measured Sona Masoori rice with Palakura Pappu, eggs, and homemade curd.`
        : `Breakfast was not logged earlier today. Anchor your energy now with a wholesome, protein-rich Andhra lunch to power your afternoon.`;

      primaryFocus = proteinGap > 35 ? 'High Protein Anchor' : 'Glycogen & Recovery';

      nextMealData = proteinGap > 35
        ? ANDHRA_MEAL_TEMPLATES.Lunch.highProtein
        : caloriesRemaining < 600
        ? ANDHRA_MEAL_TEMPLATES.Lunch.calorieControlled
        : ANDHRA_MEAL_TEMPLATES.Lunch.standard;

      laterMeals = [
        {
          category: 'Evening Snacks',
          title: ANDHRA_MEAL_TEMPLATES.Snacks.standard.title,
          portion: '1 tall glass majjiga + 35g putnalu / boiled eggs',
          estCalories: 220,
          estProtein: 15,
        },
        {
          category: 'Dinner',
          title: ANDHRA_MEAL_TEMPLATES.Dinner.standard.title,
          portion: '2 phulkas + chicken curry / egg curry + salad',
          estCalories: 390,
          estProtein: 29,
        },
        {
          category: "Tomorrow's Breakfast",
          title: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.title,
          portion: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.portion,
          estCalories: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estCalories,
          estProtein: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estProtein,
        },
      ];
    } else {
      // Lunch is logged! Next is Snacks
      stage = 'recommend_snacks';
      nextCategory = 'Evening Snacks';
      headline = 'Lunch Logged • High-Protein Afternoon Snack';
      alreadyEatenDiagnosis = `You have consumed ${summary.calories} kcal so far today. An afternoon snack with chilled buttermilk and roasted chana curbs cravings and sustains focus.`;
      primaryFocus = 'Protein Satiety & Hydration';

      nextMealData = profile?.works_out
        ? ANDHRA_MEAL_TEMPLATES.Snacks.preWorkout
        : ANDHRA_MEAL_TEMPLATES.Snacks.standard;

      laterMeals = [
        {
          category: 'Dinner',
          title: ANDHRA_MEAL_TEMPLATES.Dinner.standard.title,
          portion: '2 phulkas + chicken curry / dal + cucumber salad',
          estCalories: 390,
          estProtein: 29,
        },
        {
          category: "Tomorrow's Breakfast",
          title: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.title,
          portion: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.portion,
          estCalories: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estCalories,
          estProtein: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estProtein,
        },
      ];
    }
  } else if (currentPeriod === 'Snacks') {
    // 4:00 PM - 6:59 PM
    if (!isSnacksLogged) {
      stage = 'recommend_snacks';
      nextCategory = 'Evening Snacks';
      headline = 'Evening Fuel • Digestive Buttermilk & Protein';
      alreadyEatenDiagnosis = `With ${summary.calories} kcal logged today, you have ${caloriesRemaining} kcal and ${proteinGap > 0 ? `${proteinGap}g protein` : 'optimal protein'} remaining. Enjoy a light protein snack to power through the evening.`;
      primaryFocus = 'Digestive Cooling & Protein';

      nextMealData = profile?.works_out
        ? ANDHRA_MEAL_TEMPLATES.Snacks.preWorkout
        : ANDHRA_MEAL_TEMPLATES.Snacks.standard;

      laterMeals = [
        {
          category: 'Dinner',
          title: ANDHRA_MEAL_TEMPLATES.Dinner.standard.title,
          portion: '2 phulkas + chicken curry or dal + salad',
          estCalories: 390,
          estProtein: 29,
        },
        {
          category: "Tomorrow's Breakfast",
          title: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.title,
          portion: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.portion,
          estCalories: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estCalories,
          estProtein: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estProtein,
        },
      ];
    } else {
      // Snack logged! Next is Dinner
      stage = 'recommend_dinner';
      nextCategory = 'Dinner';
      headline = 'Evening Snack Logged • Muscle Recovery Dinner';
      alreadyEatenDiagnosis = `You have ${caloriesRemaining} kcal remaining today. Dinner should hit your remaining ${Math.max(0, proteinGap)}g protein cleanly while keeping carbs light for deep sleep.`;
      primaryFocus = proteinGap > 25 ? 'High Protein Anchor' : 'Clean Evening Recovery';

      nextMealData = proteinGap > 25
        ? ANDHRA_MEAL_TEMPLATES.Dinner.highProteinLight
        : ANDHRA_MEAL_TEMPLATES.Dinner.standard;

      laterMeals = [
        {
          category: "Tomorrow's Breakfast",
          title: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.title,
          portion: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.portion,
          estCalories: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estCalories,
          estProtein: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estProtein,
        },
      ];
    }
  } else if (currentPeriod === 'Dinner') {
    // 7:00 PM - 10:30 PM
    if (!isDinnerLogged) {
      stage = 'recommend_dinner';
      nextCategory = 'Dinner';
      headline = 'Night Fuel • Light Andhra Dinner & Recovery';
      alreadyEatenDiagnosis = `You have consumed ${summary.calories} kcal so far today. Dinner cleanly closes your ${proteinGap > 0 ? `${proteinGap}g protein gap` : 'macro target'} with easily digestible phulkas and curry.`;
      primaryFocus = caloriesRemaining < 400 ? 'Calorie Deficit Control' : 'Overnight Muscle Synthesis';

      nextMealData = caloriesRemaining < 400
        ? ANDHRA_MEAL_TEMPLATES.Dinner.lightRecovery
        : proteinGap > 25
        ? ANDHRA_MEAL_TEMPLATES.Dinner.highProteinLight
        : ANDHRA_MEAL_TEMPLATES.Dinner.standard;

      laterMeals = [
        {
          category: "Tomorrow's Breakfast",
          title: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.title,
          portion: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.portion,
          estCalories: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estCalories,
          estProtein: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estProtein,
        },
      ];
    } else {
      // Dinner logged! Day is complete
      stage = 'day_complete';
      nextCategory = 'Day Completed';
      headline = 'Dinner Logged • Overnight Sleep & Digestion';
      alreadyEatenDiagnosis = `Dinner logged! You have consumed ${summary.calories} kcal and ${Math.round(summary.protein)}g protein today. Your primary meal cycle is complete.`;
      primaryFocus = 'Hydration & Overnight Recovery';

      nextMealData = ANDHRA_MEAL_TEMPLATES.DayComplete;
      laterMeals = [
        {
          category: "Tomorrow's Breakfast",
          title: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.title,
          portion: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.portion,
          estCalories: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estCalories,
          estProtein: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estProtein,
        },
      ];
    }
  } else {
    // LateNight (10:31 PM - 5:59 AM)
    stage = 'day_complete';
    nextCategory = allMealsLogged ? 'Day Completed' : 'Late Night';
    headline = 'Late Night Recovery • Prepare for Tomorrow';
    alreadyEatenDiagnosis = allMealsLogged
      ? `All meals completed for the day with ${summary.calories} kcal logged. Allow your digestive system to rest for deep muscle protein synthesis.`
      : `Late night window. Heavy meals right before bed interfere with REM sleep. Sip warm water or light majjiga if hungry, and plan your morning breakfast.`;
    primaryFocus = 'Deep Sleep Recovery';

    nextMealData = allMealsLogged
      ? ANDHRA_MEAL_TEMPLATES.DayComplete
      : ANDHRA_MEAL_TEMPLATES.LateNight;

    laterMeals = [
      {
        category: "Tomorrow's Breakfast",
        title: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.title,
        portion: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.portion,
        estCalories: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estCalories,
        estProtein: ANDHRA_MEAL_TEMPLATES.TomorrowBreakfast.standard.estProtein,
      },
    ];
  }

  // Workout guidance
  let workoutNutritionAdvice = 'Maintain structured hydration and steady meal timing to keep metabolic burn active.';
  if (profile?.works_out) {
    const intensity = profile.intensity || 'Medium';
    const duration = profile.duration || 45;
    if (currentPeriod === 'Breakfast' || currentPeriod === 'Lunch') {
      workoutNutritionAdvice = `For your ${intensity} workout (${duration} mins), take 25g fast carbohydrates (banana or ragi malt) 45 mins before training, and replenish with protein within 90 mins after.`;
    } else if (currentPeriod === 'Snacks') {
      workoutNutritionAdvice = `If training this evening, hydrate with spiced buttermilk 45 mins before. The natural electrolytes prevent cramping during your ${intensity} session.`;
    } else {
      workoutNutritionAdvice = `Post-workout muscle repair occurs during sleep. Ensure your ${intensity} session recovery window is fulfilled by your dinner protein.`;
    }
  }

  // Fluid target based on bodyweight
  const weight = profile?.weight || 70;
  const fluidLiters = Math.round(weight * 0.035 * 10) / 10;
  const hydrationAndRecovery = `Aim for at least ${fluidLiters}L total fluids today. Include spiced buttermilk (majjiga with curry leaves, ginger & hing) for optimal electrolyte replenishment in warm climates.`;

  // Build unique cache key based on relevant day state
  const logSignature = `${todayLogs.length}_${summary.calories}_${Math.round(summary.protein)}_${Math.round(summary.carbs)}_${Math.round(summary.fats)}`;
  const dateStr = formatLocalDate(currentTime);
  const cacheKey = `${profile?.id || 'guest'}_${dateStr}_${currentPeriod}_${stage}_${logSignature}_${targetCals}`;

  return {
    stage,
    headline,
    summary: headline,
    alreadyEatenDiagnosis,
    priorityTip: alreadyEatenDiagnosis,
    macroStatus: {
      caloriesRemaining,
      proteinRemainingGrams: Math.max(0, proteinGap),
      carbsGap,
      fatsGap,
      fiberGap,
      primaryFocus,
    },
    nextMeal: nextMealData,
    laterMeals,
    workoutNutritionAdvice,
    workoutNutritionTip: workoutNutritionAdvice,
    hydrationAndRecovery,
    currentPeriod,
    isAiEnhanced: false,
    generatedAt: Date.now(),
    cacheKey,
    logStatus,
  };
}
