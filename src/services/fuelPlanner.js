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
 * Authentic Andhra Pradesh & South Indian meal templates categorized by DIET TYPE
 * Strictly enforced for Vegetarian, Non-vegetarian, Eggetarian, and Vegan.
 */
export const DIET_MEAL_TEMPLATES = {
  non_vegetarian: {
    Breakfast: {
      standard: {
        category: 'Breakfast',
        title: '2 Pesarattu with Allam (Ginger) Chutney & 1 Boiled Egg',
        itemsAndPortions: [
          '2 medium Pesarattu (whole green gram moong dal crepes)',
          '2 tbsp Allam (Ginger) Chutney',
          '1 boiled egg with crushed black pepper',
          '1 tall glass warm water or spiced ragi java',
        ],
        estimatedMacros: { calories: 380, carbs: 44, protein: 22, fats: 9, fiber: 9 },
        whyThisWorks: 'Whole moong dal delivers sustained complex carbs and 9g prebiotic fiber, paired with egg protein for a steady metabolic start.',
        quickAlternative: '3 Idlis with Drumstick Sambar & Coconut Chutney + 1 boiled egg',
      },
      highProtein: {
        category: 'Breakfast',
        title: 'Moong Dal Pesarattu with 2 Boiled Eggs & Allam Chutney',
        itemsAndPortions: [
          '2 medium whole moong Pesarattu',
          '2 whole boiled eggs with crushed black pepper',
          '2 tbsp fresh ginger (allam) & coconut chutney',
          '1 cup warm spiced ragi porridge',
        ],
        estimatedMacros: { calories: 450, carbs: 45, protein: 29, fats: 14, fiber: 10 },
        whyThisWorks: 'Supplies 29g high-biological-value protein to accelerate post-restoration muscle synthesis and keep satiety elevated.',
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
          '2 boiled eggs with black pepper',
          '1 small katori fresh homemade curd (perugu)',
        ],
        estimatedMacros: { calories: 510, carbs: 58, protein: 26, fats: 14, fiber: 8 },
        whyThisWorks: 'Traditional Andhra lunch balanced with measured rice, iron-rich spinach dal, and egg protein to prevent afternoon glucose crashes.',
        quickAlternative: '2 Phulkas with Andhra Egg Porutu and cucumber slices',
      },
      highProtein: {
        category: 'Lunch',
        title: 'Controlled Sona Masoori Rice with Andhra Kodi Kura & Spinach Dal',
        itemsAndPortions: [
          '1 cup steamed Sona Masoori rice (~150g cooked)',
          '150g Andhra Chicken Curry (Kodi Kura with controlled oil)',
          '1 small bowl Palakura Pappu',
          '1 small katori fresh homemade curd (perugu)',
        ],
        estimatedMacros: { calories: 560, carbs: 52, protein: 38, fats: 16, fiber: 7 },
        whyThisWorks: 'Delivers 38g complete animal & legume protein to accelerate training repair while measuring rice for tight carb control.',
        quickAlternative: '3 Phulkas with Chepala Pulusu (Andhra Fish Curry) and raw cucumber salad',
      },
      calorieControlled: {
        category: 'Lunch',
        title: '2 Phulkas with Thick Tomato Pappu, Boiled Egg Whites & Salad',
        itemsAndPortions: [
          '2 oil-free wheat Phulkas',
          '1 generous bowl Tomato Pappu (lentils with tomatoes & spices)',
          '3 boiled egg whites with roasted cumin',
          '1 bowl sliced cucumbers & tomatoes with lemon squeeze',
        ],
        estimatedMacros: { calories: 420, carbs: 50, protein: 24, fats: 8, fiber: 9 },
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
          '1 small banana or guava for active electrolyte replenishment',
        ],
        estimatedMacros: { calories: 220, carbs: 22, protein: 15, fats: 6, fiber: 5 },
        whyThisWorks: 'Electrolyte-rich majjiga aids digestive cooling in warm climates while roasted chana delivers crunch and 15g protein.',
        quickAlternative: 'Moong sprouts salad with chopped onion, tomato, and lemon juice',
      },
      preWorkout: {
        category: 'Evening Snacks',
        title: '2 Boiled Eggs with Black Pepper & Chilled Majjiga',
        itemsAndPortions: [
          '2 boiled eggs sprinkled with black pepper and roasted cumin',
          '1 tall glass spiced majjiga (buttermilk)',
          '1 small banana (if workout is within 45 mins)',
        ],
        estimatedMacros: { calories: 230, carbs: 18, protein: 16, fats: 9, fiber: 3 },
        whyThisWorks: 'Easily digestible protein and electrolytes hydrate muscle tissue before training without causing stomach fullness.',
        quickAlternative: '1 cup Boiled Chickpeas / Sundal with mustard seed tempering',
      },
    },
    Dinner: {
      standard: {
        category: 'Dinner',
        title: '2 Phulkas with Light Andhra Chicken Curry & Cucumber Salad',
        itemsAndPortions: [
          '2 hot oil-free phulkas / chapatis',
          '1 bowl Andhra chicken curry (or 2-egg curry)',
          '1 bowl sliced cucumbers and tomatoes with lemon juice',
        ],
        estimatedMacros: { calories: 390, carbs: 38, protein: 29, fats: 11, fiber: 6 },
        whyThisWorks: 'Phulkas digest easily before sleep while chicken/egg protein supports overnight muscle repair without bloating.',
        quickAlternative: '1 cup light Jeera Rice or Rasam Rice with 2 boiled eggs',
      },
      highProteinLight: {
        category: 'Dinner',
        title: '2 Phulkas with 180g Andhra Kodi Kura & Tomato Rasam',
        itemsAndPortions: [
          '2 light wheat phulkas',
          '180g lean Andhra chicken curry (Kodi Kura)',
          '1 cup warm spiced tomato chaaru (rasam)',
          'Sliced cucumber & onion with lime',
        ],
        estimatedMacros: { calories: 420, carbs: 34, protein: 36, fats: 12, fiber: 7 },
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
        estimatedMacros: { calories: 340, carbs: 42, protein: 21, fats: 7, fiber: 6 },
        whyThisWorks: 'Gentle on digestion, rehydrates with spiced rasam, and fits comfortably within remaining calorie room.',
        quickAlternative: '1 cup soft Pongal with vegetable sambar and boiled egg',
      },
    },
  },

  vegetarian: {
    Breakfast: {
      standard: {
        category: 'Breakfast',
        title: '2 Pesarattu with Allam Chutney & Spiced Paneer Bhurji',
        itemsAndPortions: [
          '2 medium whole moong Pesarattu',
          '2 tbsp Allam (Ginger) Chutney',
          '50g fresh Paneer Bhurji with green chillies & turmeric',
          '1 tall glass warm water or spiced ragi java',
        ],
        estimatedMacros: { calories: 380, carbs: 46, protein: 21, fats: 11, fiber: 9 },
        whyThisWorks: 'Whole moong dal combined with fresh paneer delivers 21g clean vegetarian protein and long-lasting satiety.',
        quickAlternative: '3 Idlis with Drumstick Sambar, Coconut Chutney & 1 cup warm milk/ragi malt',
      },
      highProtein: {
        category: 'Breakfast',
        title: '2 Moong Dal Pesarattu with 80g Paneer Bhurji & Ragi Java',
        itemsAndPortions: [
          '2 medium Pesarattu',
          '80g freshly scrambled Paneer with cumin and onions',
          '2 tbsp Allam Chutney',
          '1 cup unsweetened warm ragi porridge',
        ],
        estimatedMacros: { calories: 450, carbs: 48, protein: 27, fats: 15, fiber: 10 },
        whyThisWorks: 'High vegetarian protein density (27g) anchors morning muscle synthesis without any meat or eggs.',
        quickAlternative: 'Sprouted Moong Salad with chopped paneer, tomato, green chillies & 2 Phulkas',
      },
    },
    Lunch: {
      standard: {
        category: 'Lunch',
        title: 'Steamed Rice with Palakura Pappu, 100g Paneer Curry & Fresh Curd',
        itemsAndPortions: [
          '1 cup steamed Sona Masoori rice (~150g cooked)',
          '1 medium bowl Palakura Pappu (Spinach Dal)',
          '100g light Paneer Curry with tomatoes and spices',
          '1 small katori fresh homemade curd (perugu)',
        ],
        estimatedMacros: { calories: 530, carbs: 60, protein: 27, fats: 16, fiber: 8 },
        whyThisWorks: '100% vegetarian Andhra meal pairing lentil and dairy proteins for a complete amino acid profile.',
        quickAlternative: '2 Phulkas with Paneer Bhurji and Dosakaya Pappu',
      },
      highProtein: {
        category: 'Lunch',
        title: 'Steamed Rice with Soya Chunks Curry, Thick Dal Tadka & Fresh Curd',
        itemsAndPortions: [
          '1 cup steamed Sona Masoori rice (~150g cooked)',
          '1 bowl high-protein Soya Chunks Curry in Andhra onion-tomato gravy',
          '1 small bowl Thick Toor Dal Tadka',
          '1 small katori fresh homemade curd (perugu)',
        ],
        estimatedMacros: { calories: 540, carbs: 55, protein: 35, fats: 14, fiber: 10 },
        whyThisWorks: 'Soya chunks deliver an outstanding 35g plant protein with rich prebiotic fiber to fuel training recovery.',
        quickAlternative: '3 Phulkas with Palak Paneer and Thick Dal',
      },
      calorieControlled: {
        category: 'Lunch',
        title: '2 Phulkas with Thick Tomato Pappu, 80g Boiled Chana & Cucumber Salad',
        itemsAndPortions: [
          '2 oil-free wheat Phulkas',
          '1 generous bowl Tomato Pappu (lentils with tomatoes & spices)',
          '80g boiled white or black chickpeas (Chana / Guggillu)',
          '1 bowl sliced cucumbers & tomatoes with lemon juice',
        ],
        estimatedMacros: { calories: 410, carbs: 54, protein: 21, fats: 7, fiber: 11 },
        whyThisWorks: 'High volume and fiber from chickpeas and lentils ensure high fullness on a deficit budget.',
        quickAlternative: '1 cup steamed brown rice with vegetable chaaru and thick moong dal',
      },
    },
    Snacks: {
      standard: {
        category: 'Evening Snacks',
        title: 'Chilled Spiced Buttermilk & Roasted Chana (Putnalu)',
        itemsAndPortions: [
          '1 tall glass spiced majjiga (buttermilk with ginger, curry leaves & hing)',
          '40g roasted chana / putnalu',
          '1 small banana or guava',
        ],
        estimatedMacros: { calories: 210, carbs: 26, protein: 12, fats: 5, fiber: 6 },
        whyThisWorks: 'Refreshing digestive cooling with slow-digesting vegetarian protein and zero heavy fats.',
        quickAlternative: 'Moong sprouts salad with chopped onion, tomato, and lemon juice',
      },
      preWorkout: {
        category: 'Evening Snacks',
        title: 'Moong Sprouts Salad with Paneer & Chilled Buttermilk',
        itemsAndPortions: [
          '1 bowl freshly sprouted moong beans with chopped cucumber, tomato, and lime',
          '40g diced fresh paneer',
          '1 tall glass spiced majjiga',
        ],
        estimatedMacros: { calories: 230, carbs: 20, protein: 16, fats: 8, fiber: 6 },
        whyThisWorks: 'Living enzymes from sprouts plus dairy electrolytes optimize physical stamina before evening workouts.',
        quickAlternative: '1 cup Boiled Black Chana Sundal (Guggillu)',
      },
    },
    Dinner: {
      standard: {
        category: 'Dinner',
        title: '2 Phulkas with 100g Paneer Curry, Yellow Dal & Cucumber Salad',
        itemsAndPortions: [
          '2 hot oil-free phulkas',
          '100g Paneer Curry in light tomato-onion gravy',
          '1 small bowl yellow moong dal',
          'Sliced cucumber and tomato with lemon',
        ],
        estimatedMacros: { calories: 410, carbs: 42, protein: 26, fats: 14, fiber: 7 },
        whyThisWorks: 'Slow-digesting casein from paneer supports overnight muscle repair without weighing down digestion.',
        quickAlternative: '1 cup soft Pongal with vegetable sambar and curd',
      },
      highProteinLight: {
        category: 'Dinner',
        title: '2 Phulkas with 120g Soya Chunks Curry & Tomato Chaaru (Rasam)',
        itemsAndPortions: [
          '2 light wheat phulkas',
          '120g high-protein Soya Chunks Curry',
          '1 cup warm clear tomato rasam',
          'Sliced cucumber & onions with lemon juice',
        ],
        estimatedMacros: { calories: 410, carbs: 40, protein: 32, fats: 9, fiber: 9 },
        whyThisWorks: 'Provides 32g clean plant protein on a light carb baseline to optimize nighttime metabolic rate.',
        quickAlternative: 'Moong dal pesarattu with Paneer Bhurji and fresh chaaru',
      },
      lightRecovery: {
        category: 'Dinner',
        title: '2 Phulkas with Yellow Moong Dal & Spiced Tomato Chaaru',
        itemsAndPortions: [
          '2 light phulkas',
          '1 bowl yellow moong dal with cumin & garlic',
          '1 cup warm clear tomato rasam / chaaru',
          'Cucumber salad with a pinch of black salt',
        ],
        estimatedMacros: { calories: 320, carbs: 44, protein: 16, fats: 6, fiber: 7 },
        whyThisWorks: 'Light on digestion, rehydrates with spiced rasam, and fits comfortably within remaining calorie budget.',
        quickAlternative: '1 bowl vegetable daliya khichdi with curd',
      },
    },
  },

  eggetarian: {
    Breakfast: {
      standard: {
        category: 'Breakfast',
        title: '2 Pesarattu with Allam Chutney & 1 Boiled Egg',
        itemsAndPortions: [
          '2 medium whole moong Pesarattu',
          '2 tbsp Allam (Ginger) Chutney',
          '1 boiled egg with black pepper',
          '1 tall glass warm water or spiced ragi java',
        ],
        estimatedMacros: { calories: 380, carbs: 44, protein: 22, fats: 9, fiber: 9 },
        whyThisWorks: 'Whole moong dal paired with egg protein provides complete amino acids without any meat or poultry.',
        quickAlternative: '3 Idlis with Sambar & 1 boiled egg',
      },
      highProtein: {
        category: 'Breakfast',
        title: 'Andhra Egg Porutu (3 Eggs Scrambled) with 2 Phulkas',
        itemsAndPortions: [
          '3 eggs scrambled with onions, green chillies, turmeric, and curry leaves',
          '2 soft oil-free wheat phulkas',
          '1 cup warm unsweetened ragi porridge',
        ],
        estimatedMacros: { calories: 440, carbs: 36, protein: 28, fats: 16, fiber: 6 },
        whyThisWorks: 'Supplies 28g high-bioavailability egg protein to jumpstart morning muscle repair and satiety.',
        quickAlternative: '2 Pesarattu with 2 boiled eggs and ginger chutney',
      },
    },
    Lunch: {
      standard: {
        category: 'Lunch',
        title: 'Steamed Rice with Palakura Pappu, 2 Boiled Eggs & Curd',
        itemsAndPortions: [
          '1 cup steamed Sona Masoori rice (~150g cooked)',
          '1 medium bowl Palakura Pappu (Spinach Dal)',
          '2 boiled eggs with pepper',
          '1 small katori fresh homemade curd (perugu)',
        ],
        estimatedMacros: { calories: 510, carbs: 58, protein: 26, fats: 14, fiber: 8 },
        whyThisWorks: 'Balanced eggetarian lunch combining lentils, whole eggs, and probiotic curd.',
        quickAlternative: '2 Phulkas with Andhra 2-Egg Curry and cucumber slices',
      },
      highProtein: {
        category: 'Lunch',
        title: '2 Phulkas with 3-Egg Andhra Curry, Spinach Dal & Curd',
        itemsAndPortions: [
          '2 soft phulkas',
          '3-egg Andhra Curry in aromatic onion-tomato gravy',
          '1 small bowl Palakura Pappu',
          '1 small katori fresh homemade curd',
        ],
        estimatedMacros: { calories: 530, carbs: 48, protein: 32, fats: 18, fiber: 7 },
        whyThisWorks: 'Supplies 32g egg and lentil protein with controlled complex carbs.',
        quickAlternative: 'Steamed rice with 3 boiled eggs, dal, and fresh salad',
      },
      calorieControlled: {
        category: 'Lunch',
        title: '2 Phulkas with Tomato Pappu, 3 Boiled Egg Whites & Salad',
        itemsAndPortions: [
          '2 oil-free wheat Phulkas',
          '1 generous bowl Tomato Pappu',
          '3 boiled egg whites with pepper',
          '1 bowl sliced cucumbers & tomatoes with lemon squeeze',
        ],
        estimatedMacros: { calories: 420, carbs: 50, protein: 24, fats: 8, fiber: 9 },
        whyThisWorks: 'High volume and fiber from lentils and fresh salad with clean egg white protein.',
        quickAlternative: '1 cup steamed brown rice with vegetable chaaru and 2 boiled eggs',
      },
    },
    Snacks: {
      standard: {
        category: 'Evening Snacks',
        title: 'Chilled Spiced Buttermilk & Roasted Chana (Putnalu)',
        itemsAndPortions: [
          '1 tall glass spiced buttermilk (majjiga)',
          '35g roasted chana / putnalu (or 2 boiled eggs)',
          '1 small banana or guava',
        ],
        estimatedMacros: { calories: 220, carbs: 22, protein: 15, fats: 6, fiber: 5 },
        whyThisWorks: 'Electrolyte-rich majjiga aids cooling while roasted chana provides steady plant protein.',
        quickAlternative: 'Moong sprouts salad with 1 boiled egg and lime',
      },
      preWorkout: {
        category: 'Evening Snacks',
        title: '2 Boiled Eggs with Black Pepper & Chilled Majjiga',
        itemsAndPortions: [
          '2 boiled eggs with black pepper',
          '1 tall glass spiced majjiga',
          '1 small banana (if training within 45 mins)',
        ],
        estimatedMacros: { calories: 230, carbs: 18, protein: 16, fats: 9, fiber: 3 },
        whyThisWorks: 'Clean, easily digestible protein and electrolytes hydrate muscle tissue before workouts.',
        quickAlternative: '1 cup Boiled Chickpeas / Sundal with 1 boiled egg',
      },
    },
    Dinner: {
      standard: {
        category: 'Dinner',
        title: '2 Phulkas with 2-Egg Andhra Curry & Sliced Cucumber',
        itemsAndPortions: [
          '2 hot oil-free phulkas',
          '2-egg Andhra Curry in light tomato-onion gravy',
          '1 bowl sliced cucumbers and tomatoes with lemon juice',
        ],
        estimatedMacros: { calories: 380, carbs: 38, protein: 24, fats: 12, fiber: 6 },
        whyThisWorks: 'Easy on digestion before bedtime while fulfilling amino acid requirements for recovery.',
        quickAlternative: '1 cup light Jeera Rice or Rasam Rice with 2 boiled eggs',
      },
      highProteinLight: {
        category: 'Dinner',
        title: '2 Phulkas with 3-Egg Porutu (Scramble) & Tomato Chaaru',
        itemsAndPortions: [
          '2 light wheat phulkas',
          '3-egg scramble with green chillies, onions & curry leaves',
          '1 cup warm clear tomato rasam (chaaru)',
          'Sliced cucumber & onions with lime',
        ],
        estimatedMacros: { calories: 410, carbs: 32, protein: 30, fats: 15, fiber: 5 },
        whyThisWorks: 'High protein density (30g) cleanly closes remaining protein needs without meat or fish.',
        quickAlternative: 'Moong dal pesarattu with egg porutu and fresh mint chaaru',
      },
      lightRecovery: {
        category: 'Dinner',
        title: '2 Phulkas with Moong Dal, Tomato Chaaru & 2 Egg Whites',
        itemsAndPortions: [
          '2 light phulkas',
          '1 bowl yellow moong dal with cumin & garlic',
          '1 cup warm clear tomato rasam',
          '2 boiled egg whites with pepper',
        ],
        estimatedMacros: { calories: 340, carbs: 42, protein: 21, fats: 7, fiber: 6 },
        whyThisWorks: 'Gentle on digestion, rehydrates with spiced rasam, and fits comfortably within remaining calorie budget.',
        quickAlternative: '1 cup soft Pongal with vegetable sambar and boiled egg white',
      },
    },
  },

  vegan: {
    Breakfast: {
      standard: {
        category: 'Breakfast',
        title: '2 Green Moong Pesarattu with Allam Chutney & Spiced Ragi Java',
        itemsAndPortions: [
          '2 medium whole moong Pesarattu (no ghee)',
          '2 tbsp Allam (Ginger) Chutney (no dairy)',
          '1 cup warm unsweetened spiced ragi porridge with water/plant milk',
          '1 small bowl sprouted moong salad with lemon',
        ],
        estimatedMacros: { calories: 370, carbs: 54, protein: 19, fats: 5, fiber: 11 },
        whyThisWorks: '100% plant-based breakfast supplying sustained complex carbohydrates and prebiotic fiber without animal products.',
        quickAlternative: '3 Idlis with Drumstick Sambar & Coconut Chutney (no dairy)',
      },
      highProtein: {
        category: 'Breakfast',
        title: '2 Moong Pesarattu with 80g Spiced Tofu Bhurji & Ragi Java',
        itemsAndPortions: [
          '2 medium whole moong Pesarattu',
          '80g scrambled organic Tofu with turmeric, green chillies & onions',
          '2 tbsp Allam Chutney',
          '1 cup warm ragi java',
        ],
        estimatedMacros: { calories: 420, carbs: 50, protein: 25, fats: 10, fiber: 11 },
        whyThisWorks: 'Supplies 25g pure vegan protein from moong dal and tofu to fuel morning muscle protein synthesis.',
        quickAlternative: 'Sprouted Moong & Kala Chana Salad with 2 whole wheat Phulkas',
      },
    },
    Lunch: {
      standard: {
        category: 'Lunch',
        title: 'Steamed Rice with Palakura Pappu, 100g Soya Chunks & Salad',
        itemsAndPortions: [
          '1 cup steamed Sona Masoori rice (~150g cooked)',
          '1 medium bowl Palakura Pappu (Spinach Dal made with vegetable oil, no ghee)',
          '100g Soya Chunks Curry in aromatic tomato gravy',
          '1 bowl fresh cucumber, tomato & onion salad with lemon',
        ],
        estimatedMacros: { calories: 510, carbs: 62, protein: 28, fats: 10, fiber: 11 },
        whyThisWorks: '100% vegan meal pairing lentil and soya proteins for complete plant amino acids.',
        quickAlternative: '2 Phulkas with Soya Chunks Curry and Dosakaya Pappu',
      },
      highProtein: {
        category: 'Lunch',
        title: 'Steamed Rice with High-Protein Soya Chunks & Thick Green Gram Dal',
        itemsAndPortions: [
          '1 cup steamed Sona Masoori rice (~150g cooked)',
          '1 generous bowl Soya Chunks Curry in Andhra spices',
          '1 small bowl Thick Whole Green Gram (Moong) Dal',
          'Raw cucumber & carrot slices with lemon juice',
        ],
        estimatedMacros: { calories: 530, carbs: 58, protein: 34, fats: 11, fiber: 13 },
        whyThisWorks: 'Delivers 34g plant-based protein with exceptional fiber for lasting satiety and glucose control.',
        quickAlternative: '3 Phulkas with Tofu Curry and Thick Toor Dal',
      },
      calorieControlled: {
        category: 'Lunch',
        title: '2 Phulkas with Thick Tomato Pappu, 80g Boiled Chana & Salad',
        itemsAndPortions: [
          '2 oil-free wheat Phulkas',
          '1 generous bowl Tomato Pappu (no ghee/butter)',
          '80g boiled Kala Chana (black chickpeas) with mustard tempering',
          '1 bowl sliced cucumbers & tomatoes with lemon squeeze',
        ],
        estimatedMacros: { calories: 400, carbs: 56, protein: 20, fats: 6, fiber: 12 },
        whyThisWorks: 'High volume and fiber from chickpeas and lentils ensure high fullness on a vegan calorie budget.',
        quickAlternative: '1 cup steamed brown rice with vegetable chaaru and thick moong dal',
      },
    },
    Snacks: {
      standard: {
        category: 'Evening Snacks',
        title: 'Spiced Moong Sprouts Salad & Roasted Chana (Putnalu)',
        itemsAndPortions: [
          '1 bowl fresh moong sprouts with chopped onion, tomato, green chilli & lime',
          '35g roasted chana / putnalu',
          '1 tall glass lemon water or coconut water',
        ],
        estimatedMacros: { calories: 210, carbs: 28, protein: 13, fats: 4, fiber: 7 },
        whyThisWorks: 'Enzyme-rich sprouts and roasted chana provide clean plant protein and hydration with zero dairy.',
        quickAlternative: 'Boiled Peanuts / Kala Chana Sundal with curry leaf tempering',
      },
      preWorkout: {
        category: 'Evening Snacks',
        title: 'Roasted Chana (Putnalu) + 1 Medium Banana & Coconut Water',
        itemsAndPortions: [
          '40g roasted chana (putnalu)',
          '1 medium ripe banana',
          '1 glass tender coconut water or lemon-mint water',
        ],
        estimatedMacros: { calories: 230, carbs: 34, protein: 11, fats: 4, fiber: 6 },
        whyThisWorks: 'Potassium from banana and plant protein from chana prime muscular endurance before workouts.',
        quickAlternative: '1 cup Boiled Black Chana (Guggillu) with lemon',
      },
    },
    Dinner: {
      standard: {
        category: 'Dinner',
        title: '2 Phulkas with 100g Soya Chunks Curry, Moong Dal & Cucumber',
        itemsAndPortions: [
          '2 hot oil-free phulkas',
          '100g Soya Chunks Curry in light tomato-onion gravy',
          '1 small bowl yellow moong dal (no ghee)',
          'Sliced cucumber and tomato with lemon juice',
        ],
        estimatedMacros: { calories: 390, carbs: 46, protein: 27, fats: 8, fiber: 9 },
        whyThisWorks: '100% plant-based dinner that digests easily before sleep while fulfilling recovery protein.',
        quickAlternative: '1 cup light Jeera Rice with Soya Curry and Tomato Chaaru',
      },
      highProteinLight: {
        category: 'Dinner',
        title: '2 Phulkas with 120g Tofu / Soya Masala & Clear Tomato Chaaru',
        itemsAndPortions: [
          '2 light wheat phulkas',
          '120g Tofu or Soya Chunks in Andhra curry spices',
          '1 cup warm clear tomato rasam / chaaru',
          'Sliced cucumber & onions with lime',
        ],
        estimatedMacros: { calories: 410, carbs: 42, protein: 31, fats: 10, fiber: 10 },
        whyThisWorks: 'Provides 31g pure vegan protein on a light carb baseline for optimal nighttime recovery.',
        quickAlternative: 'Moong dal pesarattu with Tofu Bhurji and fresh chaaru',
      },
      lightRecovery: {
        category: 'Dinner',
        title: '2 Phulkas with Yellow Moong Dal & Clear Tomato Chaaru',
        itemsAndPortions: [
          '2 light phulkas',
          '1 bowl yellow moong dal with cumin & garlic (no ghee)',
          '1 cup warm clear tomato rasam / chaaru',
          'Sliced cucumber with lemon juice',
        ],
        estimatedMacros: { calories: 310, carbs: 44, protein: 15, fats: 5, fiber: 7 },
        whyThisWorks: 'Gentle on digestion, rehydrates with spiced rasam, and fits comfortably within remaining calorie budget.',
        quickAlternative: '1 bowl vegetable daliya khichdi with tomato chutney',
      },
    },
  },
};

/**
 * Universal meal template selector respecting DIET and ALLERGIES strictly
 */
export function getDietMealTemplate(category, variant, profile) {
  let diet = (profile?.diet_preference || 'no_preference').toLowerCase();
  if (diet === 'no_preference') diet = 'non_vegetarian';
  if (!DIET_MEAL_TEMPLATES[diet]) diet = 'vegetarian';

  const categoryTemplates = DIET_MEAL_TEMPLATES[diet]?.[category] || DIET_MEAL_TEMPLATES.vegetarian[category];
  const meal = categoryTemplates?.[variant] || categoryTemplates?.standard;

  if (!meal) {
    return DIET_MEAL_TEMPLATES.vegetarian.Lunch.standard;
  }

  // Check for allergy exclusions on dairy / eggs / peanuts / gluten
  const allergies = Array.isArray(profile?.allergies) ? profile.allergies : [];
  let adapted = { ...meal, itemsAndPortions: [...meal.itemsAndPortions] };

  if (allergies.includes('dairy')) {
    adapted.title = adapted.title.replace(/paneer/gi, 'Tofu').replace(/curd/gi, 'Rasam').replace(/buttermilk|majjiga/gi, 'Lemon-Mint Water');
    adapted.itemsAndPortions = adapted.itemsAndPortions.map((item) =>
      item.replace(/paneer/gi, 'Tofu')
          .replace(/curd|perugu/gi, 'warm clear rasam')
          .replace(/buttermilk|majjiga/gi, 'spiced lemon-mint water')
    );
  }

  if (allergies.includes('eggs')) {
    adapted.title = adapted.title.replace(/egg[s]?|boiled egg[s]?|egg porutu/gi, 'Paneer / Dal');
    adapted.itemsAndPortions = adapted.itemsAndPortions.map((item) =>
      item.replace(/boiled egg[s]?|egg whites|egg porutu/gi, 'fresh paneer or thick dal')
    );
  }

  if (allergies.includes('peanuts')) {
    adapted.title = adapted.title.replace(/peanut chutney|peanut podi/gi, 'Allam (Ginger) Chutney');
    adapted.itemsAndPortions = adapted.itemsAndPortions.map((item) =>
      item.replace(/peanut chutney|peanut podi/gi, 'fresh allam or coconut chutney')
    );
  }

  if (allergies.includes('gluten')) {
    adapted.title = adapted.title.replace(/phulkas|chapatis/gi, 'Steamed Rice / Pesarattu');
    adapted.itemsAndPortions = adapted.itemsAndPortions.map((item) =>
      item.replace(/phulkas|chapatis/gi, 'steamed Sona Masoori rice or moong pesarattu')
    );
  }

  return adapted;
}

export const ANDHRA_MEAL_TEMPLATES = {
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
      'If hungry, 1 cup light spiced buttermilk or warm herbal tea',
      'Plan for Tomorrow Breakfast at 7:00 - 8:30 AM',
    ],
    estimatedMacros: { calories: 60, carbs: 4, protein: 6, fats: 1, fiber: 0 },
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
        ? getDietMealTemplate('Breakfast', 'highProtein', profile) 
        : getDietMealTemplate('Breakfast', 'standard', profile);

      const lunchPreview = getDietMealTemplate('Lunch', 'standard', profile);
      const snackPreview = getDietMealTemplate('Snacks', 'standard', profile);
      const dinnerPreview = getDietMealTemplate('Dinner', 'standard', profile);

      laterMeals = [
        {
          category: 'Lunch',
          title: lunchPreview.title,
          portion: lunchPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: lunchPreview.estimatedMacros.calories,
          estProtein: lunchPreview.estimatedMacros.protein,
        },
        {
          category: 'Evening Snacks',
          title: snackPreview.title,
          portion: snackPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: snackPreview.estimatedMacros.calories,
          estProtein: snackPreview.estimatedMacros.protein,
        },
        {
          category: 'Dinner',
          title: dinnerPreview.title,
          portion: dinnerPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: dinnerPreview.estimatedMacros.calories,
          estProtein: dinnerPreview.estimatedMacros.protein,
        },
      ];
    } else {
      // Breakfast is logged; current window is Breakfast, so next meal to prepare is Lunch!
      stage = 'recommend_lunch';
      nextCategory = 'Lunch';
      headline = 'Breakfast Logged • Balanced Andhra Lunch Plan';
      alreadyEatenDiagnosis = `Breakfast logged (${summary.calories} kcal, ${Math.round(summary.protein)}g protein). Plan your lunch around measured rice, protein-dense dal, and healthy sides to stay on target.`;
      primaryFocus = proteinGap > 40 ? 'High Protein Anchor' : 'Balanced Macro Split';

      nextMealData = proteinGap > 40
        ? getDietMealTemplate('Lunch', 'highProtein', profile)
        : getDietMealTemplate('Lunch', 'standard', profile);

      const snackPreview = getDietMealTemplate('Snacks', 'standard', profile);
      const dinnerPreview = getDietMealTemplate('Dinner', 'standard', profile);

      laterMeals = [
        {
          category: 'Evening Snacks',
          title: snackPreview.title,
          portion: snackPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: snackPreview.estimatedMacros.calories,
          estProtein: snackPreview.estimatedMacros.protein,
        },
        {
          category: 'Dinner',
          title: dinnerPreview.title,
          portion: dinnerPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: dinnerPreview.estimatedMacros.calories,
          estProtein: dinnerPreview.estimatedMacros.protein,
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
        ? `Breakfast provided ${summary.calories} kcal. Lunch combines measured Sona Masoori rice with Palakura Pappu and wholesome protein.`
        : `Breakfast was not logged earlier today. Anchor your energy now with a wholesome, protein-rich Andhra lunch to power your afternoon.`;

      primaryFocus = proteinGap > 35 ? 'High Protein Anchor' : 'Glycogen & Recovery';

      nextMealData = proteinGap > 35
        ? getDietMealTemplate('Lunch', 'highProtein', profile)
        : caloriesRemaining < 600
        ? getDietMealTemplate('Lunch', 'calorieControlled', profile)
        : getDietMealTemplate('Lunch', 'standard', profile);

      const snackPreview = getDietMealTemplate('Snacks', 'standard', profile);
      const dinnerPreview = getDietMealTemplate('Dinner', 'standard', profile);
      const tomorrowPreview = getDietMealTemplate('Breakfast', 'standard', profile);

      laterMeals = [
        {
          category: 'Evening Snacks',
          title: snackPreview.title,
          portion: snackPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: snackPreview.estimatedMacros.calories,
          estProtein: snackPreview.estimatedMacros.protein,
        },
        {
          category: 'Dinner',
          title: dinnerPreview.title,
          portion: dinnerPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: dinnerPreview.estimatedMacros.calories,
          estProtein: dinnerPreview.estimatedMacros.protein,
        },
        {
          category: "Tomorrow's Breakfast",
          title: tomorrowPreview.title,
          portion: tomorrowPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: tomorrowPreview.estimatedMacros.calories,
          estProtein: tomorrowPreview.estimatedMacros.protein,
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
        ? getDietMealTemplate('Snacks', 'preWorkout', profile)
        : getDietMealTemplate('Snacks', 'standard', profile);

      const dinnerPreview = getDietMealTemplate('Dinner', 'standard', profile);
      const tomorrowPreview = getDietMealTemplate('Breakfast', 'standard', profile);

      laterMeals = [
        {
          category: 'Dinner',
          title: dinnerPreview.title,
          portion: dinnerPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: dinnerPreview.estimatedMacros.calories,
          estProtein: dinnerPreview.estimatedMacros.protein,
        },
        {
          category: "Tomorrow's Breakfast",
          title: tomorrowPreview.title,
          portion: tomorrowPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: tomorrowPreview.estimatedMacros.calories,
          estProtein: tomorrowPreview.estimatedMacros.protein,
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
        ? getDietMealTemplate('Snacks', 'preWorkout', profile)
        : getDietMealTemplate('Snacks', 'standard', profile);

      const dinnerPreview = getDietMealTemplate('Dinner', 'standard', profile);
      const tomorrowPreview = getDietMealTemplate('Breakfast', 'standard', profile);

      laterMeals = [
        {
          category: 'Dinner',
          title: dinnerPreview.title,
          portion: dinnerPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: dinnerPreview.estimatedMacros.calories,
          estProtein: dinnerPreview.estimatedMacros.protein,
        },
        {
          category: "Tomorrow's Breakfast",
          title: tomorrowPreview.title,
          portion: tomorrowPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: tomorrowPreview.estimatedMacros.calories,
          estProtein: tomorrowPreview.estimatedMacros.protein,
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
        ? getDietMealTemplate('Dinner', 'highProteinLight', profile)
        : getDietMealTemplate('Dinner', 'standard', profile);

      const tomorrowPreview = getDietMealTemplate('Breakfast', 'standard', profile);

      laterMeals = [
        {
          category: "Tomorrow's Breakfast",
          title: tomorrowPreview.title,
          portion: tomorrowPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: tomorrowPreview.estimatedMacros.calories,
          estProtein: tomorrowPreview.estimatedMacros.protein,
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
        ? getDietMealTemplate('Dinner', 'lightRecovery', profile)
        : proteinGap > 25
        ? getDietMealTemplate('Dinner', 'highProteinLight', profile)
        : getDietMealTemplate('Dinner', 'standard', profile);

      const tomorrowPreview = getDietMealTemplate('Breakfast', 'standard', profile);

      laterMeals = [
        {
          category: "Tomorrow's Breakfast",
          title: tomorrowPreview.title,
          portion: tomorrowPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: tomorrowPreview.estimatedMacros.calories,
          estProtein: tomorrowPreview.estimatedMacros.protein,
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
      const tomorrowPreview = getDietMealTemplate('Breakfast', 'standard', profile);

      laterMeals = [
        {
          category: "Tomorrow's Breakfast",
          title: tomorrowPreview.title,
          portion: tomorrowPreview.itemsAndPortions.slice(0, 2).join(' + '),
          estCalories: tomorrowPreview.estimatedMacros.calories,
          estProtein: tomorrowPreview.estimatedMacros.protein,
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

    const tomorrowPreview = getDietMealTemplate('Breakfast', 'standard', profile);

    laterMeals = [
      {
        category: "Tomorrow's Breakfast",
        title: tomorrowPreview.title,
        portion: tomorrowPreview.itemsAndPortions.slice(0, 2).join(' + '),
        estCalories: tomorrowPreview.estimatedMacros.calories,
        estProtein: tomorrowPreview.estimatedMacros.protein,
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
