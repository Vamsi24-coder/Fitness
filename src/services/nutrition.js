/**
 * NutriPulse Nutrition & Health Personalization Engine
 * 
 * Multi-layer energy and macronutrient calculation architecture:
 * 1. Mifflin-St Jeor Basal Metabolic Rate (BMR)
 * 2. Baseline Sedentary Energy Expenditure (1.2x multiplier)
 * 3. Incremental Non-Resting Walking / General Movement Burn
 * 4. General Daily Activity Adjustment (outside workouts)
 * 5. Structured Training (Strength vs Cardio partitioned to avoid double-counting)
 * 6. Estimated Maintenance Calories (TDEE)
 * 7. Goal-Calibrated Caloric Adjustment (Fat Loss, Muscle Gain, Recomp, Performance, Competition)
 * 8. Dynamic Macronutrient Partitioning (Protein, Essential Fats, Performance Carbs, Fiber)
 */

/**
 * Calculate calories from macronutrients
 * Carbs: 4 kcal/g, Protein: 4 kcal/g, Fats: 9 kcal/g
 */
export function calculateCalories(carbs = 0, protein = 0, fats = 0) {
  const c = Math.max(0, Number(carbs) || 0);
  const p = Math.max(0, Number(protein) || 0);
  const f = Math.max(0, Number(fats) || 0);
  return Math.round(c * 4 + p * 4 + f * 9);
}

/**
 * MET (Metabolic Equivalent of Task) values for workout intensities
 */
export const MET_VALUES = {
  intensive: 8.5, // Heavy resistance training, HIIT, fast athletics
  medium: 6.0,    // Moderate lifting, jogging, cycling
  small: 3.5,     // Light mobility, yoga, casual movement
  none: 1.0,
};

/**
 * MET values for specific cardio disciplines
 */
export const CARDIO_MET_VALUES = {
  treadmill: 8.5,
  running: 9.5,
  cycling: 7.0,
  elliptical: 7.0,
  'stair climber': 8.5,
  stairclimber: 8.5,
  swimming: 7.5,
  hiit: 9.0,
  walking: 3.8,
  other: 7.0,
};

/**
 * Walking duration map in minutes
 */
export const WALKING_MINUTES_MAP = {
  less_15: 10,
  '15_30': 22,
  '30_60': 45,
  '60_90': 75,
  '90_plus': 100,
};

/**
 * General daily activity factor (percentage of BMR added beyond 1.2 baseline)
 */
export const GENERAL_ACTIVITY_MULTIPLIERS = {
  mostly_sitting: 0.0,    // Desk job, standard sedentary baseline
  lightly_active: 0.08,   // Standing, teaching, light office movement (+8% BMR)
  moderately_active: 0.18,// On feet most of the day, retail, nursing (+18% BMR)
  highly_active: 0.28,    // Heavy physical labor, construction, farming (+28% BMR)
};

/**
 * Approximate caloric energy density of 1 kg human tissue / fat loss
 */
export const APPROX_KCAL_PER_KG_CHANGE = 7700;

/**
 * Goal metadata & descriptive content
 */
export const GOAL_DETAILS = {
  lose_fat: {
    id: 'lose_fat',
    label: 'Lose Body Fat',
    shortDesc: 'Burn fat while preserving lean muscle mass',
    tagline: 'Sustainable calorie deficit tailored to your metabolic burn',
    category: 'Deficit',
    color: '#ff2d55',
  },
  gain_muscle: {
    id: 'gain_muscle',
    label: 'Gain Weight / Muscle',
    shortDesc: 'Build lean muscle with a controlled surplus',
    tagline: 'Controlled anabolic surplus for hypertrophy without excess fat',
    category: 'Surplus',
    color: '#30d158',
  },
  maintain: {
    id: 'maintain',
    label: 'Maintain Weight',
    shortDesc: 'Stabilize bodyweight & optimize daily metabolic health',
    tagline: 'Exact energy balance matching total daily expenditure',
    category: 'Balance',
    color: '#0a84ff',
  },
  recomposition: {
    id: 'recomposition',
    label: 'Body Recomposition',
    shortDesc: 'Build muscle and lose fat at the same time',
    tagline: 'High protein energy partitioning for simultaneous recomp',
    category: 'Recomposition',
    color: '#bf5af2',
  },
  performance: {
    id: 'performance',
    label: 'Improve Performance',
    shortDesc: 'Maximize endurance, power, and athletic recovery',
    tagline: 'Carb-optimized fuel availability for intense training sessions',
    category: 'Performance',
    color: '#ffd60a',
  },
  competition: {
    id: 'competition',
    label: 'Competition Prep',
    shortDesc: 'Targeted conditioning & weight-category readiness',
    tagline: 'Disciplined timeline preparation for athletic or physique competition',
    category: 'Conditioning',
    color: '#ff9f0a',
  },
};

/**
 * Goal calorie adjustments (kcal/day)
 */
export const GOAL_CALORIE_ADJUSTMENTS = {
  lose_fat: -400,        // Controlled, sustainable deficit preserving lean tissue
  gain_muscle: 300,      // Controlled lean surplus for hypertrophy without excess fat
  maintain: 0,           // Exact energy balance
  recomposition: 0,      // Recomp baseline (adjusted by priority)
  performance: 50,       // Energy availability focus
  competition: -200,     // Contextual competition adjustment
};

/**
 * Protein multipliers per kg of bodyweight
 */
export const PROTEIN_MULTIPLIERS = {
  sedentary: 1.1,
  small: 1.4,
  medium: 1.7,
  intensive: 2.1,
  durationBonus: 0.15, // Added if workout duration >= 60 mins
  goalBonus: {
    lose_fat: 0.2,       // Muscle protein preservation in deficit
    gain_muscle: 0.1,    // Anabolic support
    recomposition: 0.2,  // High satiety & nitrogen balance
    competition: 0.2,
    performance: 0.1,
    maintain: 0.0,
  },
};

/**
 * Calculate healthy BMI weight reference range (BMI 18.5 - 24.9) from height in cm
 * 
 * @param {number} heightCm - Height in cm
 * @param {string} [gender] - Biological gender (fallback if height is missing)
 * @returns {{ minWeight: number, maxWeight: number, bmiMin: number, bmiMax: number, heightCm: number }}
 */
export function calculateHealthyWeightRange(heightCm, gender = 'male') {
  let h = Number(heightCm);
  if (!h || isNaN(h) || h <= 0) {
    h = (gender?.toLowerCase() === 'female') ? 163 : 176;
  }
  const heightM = h / 100;
  const heightSq = heightM * heightM;
  const minWeight = Math.round(18.5 * heightSq * 10) / 10;
  const maxWeight = Math.round(24.9 * heightSq * 10) / 10;
  return {
    minWeight,
    maxWeight,
    bmiMin: 18.5,
    bmiMax: 24.9,
    heightCm: h,
  };
}

/**
 * Intelligent, dynamic suggested target weight derivation based on current weight,
 * height-calibrated healthy BMI reference range, and selected primary goal.
 * 
 * @param {number} currentWeight - Current weight in kg
 * @param {number} heightCm - Height in cm
 * @param {string} primaryGoal - Selected goal (lose_fat, gain_muscle, maintain, etc.)
 * @param {string} [gender] - Biological gender
 * @returns {number} Suggested target weight in kg
 */
export function getSuggestedTargetWeight(currentWeight, heightCm, primaryGoal = 'lose_fat', gender = 'male') {
  const cur = Number(currentWeight) || 70;
  const { minWeight, maxWeight } = calculateHealthyWeightRange(heightCm, gender);
  const goal = (primaryGoal || 'maintain').toLowerCase();

  if (goal.includes('lose') || goal === 'lose_fat') {
    if (cur > maxWeight) {
      // If above healthy range, recommend a realistic starting step toward upper healthy boundary
      const stepTarget = Math.round((cur - 4.0) * 10) / 10;
      return Math.max(maxWeight, stepTarget);
    } else if (cur >= minWeight) {
      // If inside healthy range, suggest a gentle 5% deficit target (never below minWeight)
      return Math.max(minWeight, Math.round(cur * 0.95 * 10) / 10);
    } else {
      return cur;
    }
  }

  if (goal.includes('gain') || goal === 'gain_muscle') {
    if (cur < minWeight) {
      // If below healthy range, recommend step into healthy range
      const stepTarget = Math.round((cur + 3.0) * 10) / 10;
      return Math.min(minWeight + 2.0, stepTarget);
    } else if (cur <= maxWeight) {
      // If inside healthy range, suggest a gentle 5% lean surplus target
      return Math.min(maxWeight + 3.0, Math.round(cur * 1.05 * 10) / 10);
    } else {
      return Math.round((cur + 2.0) * 10) / 10;
    }
  }

  return cur;
}

/**
 * Context-aware profile completion calculator (0-100%)
 * Intelligently accounts for conditional branches (e.g., non-exerciser does not require gym duration).
 * 
 * @param {Object} profile 
 * @returns {{ percentage: number, isComplete: boolean, missingFields: string[], firstMissingSection: string, completedSections: string[], totalSections: number }}
 */
export function calculateProfileCompletion(profile) {
  if (!profile) {
    return {
      percentage: 0,
      isComplete: false,
      missingFields: ['gender', 'age', 'height', 'weight', 'daily_activity_level', 'walking_duration', 'works_out', 'primary_goal', 'diet_preference', 'allergies'],
      firstMissingSection: 'biometrics',
      completedSections: [],
      totalSections: 5,
    };
  }

  const missingFields = [];
  const completedSections = [];
  let score = 0;
  const maxScore = 100;

  // 1. Biometrics (20 points max: 5 pts each)
  let bioScore = 0;
  if (profile.gender) bioScore += 5; else missingFields.push('gender');
  if (profile.age) bioScore += 5; else missingFields.push('age');
  if (profile.height || profile.height_cm) bioScore += 5; else missingFields.push('height');
  if (profile.weight) bioScore += 5; else missingFields.push('weight');
  score += bioScore;
  if (bioScore === 20) completedSections.push('biometrics');

  // 2. Daily Activity (20 points max: 10 pts each)
  let actScore = 0;
  if (profile.daily_activity_level) actScore += 10; else missingFields.push('daily_activity_level');
  if (profile.walking_duration) actScore += 10; else missingFields.push('walking_duration');
  score += actScore;
  if (actScore === 20) completedSections.push('activity');

  // 3. Training & Routine (20 points max)
  let trainScore = 0;
  if (profile.works_out === false) {
    trainScore = 20; // Non-exerciser answered completely
  } else if (profile.works_out === true) {
    trainScore += 10;
    if (profile.goes_to_gym) {
      if (profile.gym_duration && profile.gym_frequency) trainScore += 10;
      else if (profile.duration) trainScore += 10;
      else missingFields.push('gym_details');
    } else {
      if (profile.duration && profile.intensity) trainScore += 10;
      else missingFields.push('workout_details');
    }
  } else {
    missingFields.push('works_out');
  }
  score += trainScore;
  if (trainScore === 20) completedSections.push('training');

  // 4. Goals (20 points max)
  let goalScore = 0;
  const goal = (profile.primary_goal || '').toLowerCase();
  if (goal) {
    goalScore += 10;
    if (goal === 'lose_fat' || goal === 'gain_muscle') {
      if (profile.target_weight) goalScore += 10;
      else missingFields.push('target_weight');
    } else if (goal === 'recomposition') {
      if (profile.recomp_priorities?.length || profile.recomp_priority) goalScore += 10;
      else missingFields.push('recomp_priority');
    } else if (goal === 'performance') {
      if (profile.performance_focuses?.length || profile.performance_focus) goalScore += 10;
      else missingFields.push('performance_focus');
    } else if (goal === 'competition') {
      if (profile.competition_type || profile.competition_date) goalScore += 10;
      else missingFields.push('competition_details');
    } else {
      goalScore += 10; // maintain requires no sub-fields
    }
  } else {
    missingFields.push('primary_goal');
  }
  score += goalScore;
  if (goalScore === 20) completedSections.push('goals');

  // 5. Nutrition Preferences (20 points max: 10 pts each)
  let nutScore = 0;
  if (profile.diet_preference) nutScore += 10; else missingFields.push('diet_preference');
  if (profile.allergies !== undefined && profile.allergies !== null) nutScore += 10; else missingFields.push('allergies');
  score += nutScore;
  if (nutScore === 20) completedSections.push('nutrition');

  const percentage = Math.min(100, Math.max(0, score));
  const isComplete = percentage === 100;

  let firstMissingSection = 'biometrics';
  if (bioScore < 20) firstMissingSection = 'biometrics';
  else if (actScore < 20) firstMissingSection = 'activity';
  else if (trainScore < 20) firstMissingSection = 'training';
  else if (goalScore < 20) firstMissingSection = 'goals';
  else if (nutScore < 20) firstMissingSection = 'nutrition';

  return {
    percentage,
    isComplete,
    missingFields,
    firstMissingSection,
    completedSections,
    totalSections: 5,
  };
}

/**
 * Check if a profile is complete with all new personalization fields
 * @param {Object} profile 
 * @returns {boolean}
 */
export function isProfileComplete(profile) {
  return calculateProfileCompletion(profile).isComplete;
}

/**
 * Detect which fields are missing from an existing profile
 * @param {Object} profile 
 * @returns {Array<string>} List of missing field keys
 */
export function getMissingProfileFields(profile) {
  return calculateProfileCompletion(profile).missingFields;
}

/**
 * Convert height between cm and feet/inches
 */
export function cmToFeetInches(cm) {
  const totalInches = Math.round((Number(cm) || 170) / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches, totalInches };
}

export function feetInchesToCm(feet, inches) {
  const totalInches = (Number(feet) || 0) * 12 + (Number(inches) || 0);
  return Math.round(totalInches * 2.54 * 10) / 10;
}

export function inchesToCm(inches) {
  return Math.round((Number(inches) || 0) * 2.54 * 10) / 10;
}

/**
 * Calculate dynamic, personalized daily nutritional targets based on EVERY profile factor.
 * 
 * Supports both legacy and extended profiles seamlessly.
 *
 * @param {Object} profile - User biometric & fitness profile
 * @returns {Object} Calculated blueprint targets and transparent math breakdown
 */
export function calculateDailyTargets(profile) {
  // Graceful defaults when profile is not yet available
  if (!profile) {
    return {
      calories: 2000,
      protein: 120,
      carbs: 220,
      fats: 65,
      fiber: 28,
      bmr: 1650,
      baselineEnergy: 1980,
      generalActivityBurn: 0,
      incrementalWalkingBurn: 70,
      workoutCalories: 300,
      maintenanceCalories: 2350,
      goalAdjustment: 0,
      factors: {
        height: 175,
        height_cm: 175,
        height_unit: 'cm',
        weight: 70,
        age: 25,
        gender: 'Male',
        works_out: false,
        intensity: 'Medium',
        duration: 30,
        walking_duration: '15_30',
        daily_activity_level: 'mostly_sitting',
        primary_goal: 'maintain',
        diet_preference: 'no_preference',
        proteinPerKg: 1.4,
      },
    };
  }

  // 1. Sanitize & Normalize Inputs
  const age = Math.max(10, Math.min(120, Number(profile.age) || 26));
  const weight = Math.max(20, Math.min(350, Number(profile.weight) || 70)); // kg
  const gender = (profile.gender || 'male').toLowerCase();
  
  // Height calculation (supports cm or total inches/feet+inches)
  let rawHeight = Number(profile.height || profile.height_cm);
  let heightUnit = (profile.height_unit || 'cm').toLowerCase();
  let heightCm = 170;

  if (!isNaN(rawHeight) && rawHeight > 0) {
    if (heightUnit === 'in' || heightUnit === 'inches') {
      heightCm = Math.round(rawHeight * 2.54 * 10) / 10;
    } else {
      heightCm = rawHeight;
    }
  } else {
    // Standard population defaults if not provided
    if (gender === 'male') heightCm = 176;
    else if (gender === 'female') heightCm = 163;
  }
  heightCm = Math.max(50, Math.min(250, heightCm));

  const worksOut = Boolean(profile.works_out);
  const intensity = (profile.intensity || 'Medium').toLowerCase();
  const duration = Math.max(0, Number(profile.duration) || 0); // minutes
  const workoutFrequency = Math.min(7, Math.max(1, Number(profile.workout_frequency) || (worksOut ? 4 : 0)));

  // Extended activity & gym inputs
  const dailyActivityLevel = (profile.daily_activity_level || 'mostly_sitting').toLowerCase();
  const rawWalkDuration = profile.walking_duration || '15_30';
  const walkingMinutes = typeof rawWalkDuration === 'number' 
    ? rawWalkDuration 
    : (WALKING_MINUTES_MAP[rawWalkDuration] || 22);

  const goesToGym = Boolean(profile.goes_to_gym);
  const gymFrequency = Math.min(7, Math.max(0, Number(profile.gym_frequency) || (goesToGym ? 4 : 0)));
  const gymDuration = Math.max(0, Number(profile.gym_duration) || (goesToGym ? 60 : 0));
  const cardioDuration = Math.min(gymDuration, Math.max(0, Number(profile.cardio_duration) || 0));
  
  // Multi-cardio modalities support
  const rawCardioTypes = profile.cardio_types || (profile.cardio_type ? (Array.isArray(profile.cardio_type) ? profile.cardio_type : [profile.cardio_type]) : ['Treadmill']);
  const cardioTypes = (Array.isArray(rawCardioTypes) ? rawCardioTypes : [String(rawCardioTypes)]).map(t => String(t).trim()).filter(Boolean);
  const primaryCardioType = (cardioTypes[0] || 'Treadmill').toLowerCase();

  // Goal & Diet inputs
  const primaryGoal = (profile.primary_goal || 'maintain').toLowerCase();
  const targetWeight = profile.target_weight ? Number(profile.target_weight) : null;
  
  // Recomposition multi-priority support
  const rawRecomp = profile.recomp_priorities || profile.recomp_priority || 'both_equally';
  const recompPriorities = (Array.isArray(rawRecomp) ? rawRecomp : [String(rawRecomp)]).map(p => String(p).toLowerCase().trim());
  const hasFatLossPriority = recompPriorities.some(p => p.includes('fat') || p === 'fat_loss' || p === 'reduce_body_fat');
  const hasMusclePriority = recompPriorities.some(p => p.includes('muscle') || p === 'muscle_gain' || p === 'build_muscle');
  const recompPriorityCanonical = (hasFatLossPriority && hasMusclePriority) || (!hasFatLossPriority && !hasMusclePriority)
    ? 'both_equally'
    : (hasFatLossPriority ? 'fat_loss' : 'muscle_gain');

  // Performance multi-focus support
  const rawPerfFocus = profile.performance_focuses || profile.performance_focus || ['strength'];
  const performanceFocus = (Array.isArray(rawPerfFocus) ? rawPerfFocus : [String(rawPerfFocus)]).map(f => String(f).toLowerCase().trim());

  const dietPreference = profile.diet_preference || 'no_preference';
  const allergies = Array.isArray(profile.allergies) ? profile.allergies : [];

  // =========================================================================
  // STEP A: Basal Metabolic Rate (BMR) - Mifflin-St Jeor Equation
  // =========================================================================
  let bmr = 10 * weight + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else if (gender === 'female') {
    bmr -= 161;
  } else {
    bmr -= 78; // Neutral midpoint
  }
  bmr = Math.round(bmr);

  // =========================================================================
  // STEP B: Baseline Sedentary Energy Expenditure (Resting + Desk baseline)
  // =========================================================================
  const baselineEnergy = Math.round(bmr * 1.2);

  // =========================================================================
  // STEP C: General Daily Activity (NEAT outside workouts)
  // =========================================================================
  const activityMultiplier = GENERAL_ACTIVITY_MULTIPLIERS[dailyActivityLevel] || 0;
  const generalActivityBurn = Math.round(bmr * activityMultiplier);

  // =========================================================================
  // STEP D: Incremental Non-Resting Walking Calories
  // Avoid double counting resting burn already embedded in the 1.2x baseline:
  // Net Walking = Gross Walking - (BMR / 1440 * Walking Minutes)
  // =========================================================================
  const MET_WALKING = 3.5;
  const grossWalkingCalories = (MET_WALKING * 3.5 * weight / 200) * walkingMinutes;
  const restingCaloriesDuringWalking = (bmr / 1440) * walkingMinutes;
  const incrementalWalkingBurn = Math.round(
    Math.max(0, grossWalkingCalories - restingCaloriesDuringWalking)
  );

  // =========================================================================
  // STEP E: Structured Workout (Gym vs Standard Workout without double-counting)
  // Gym duration represents full session; Cardio duration is a subset of it.
  // =========================================================================
  let workoutCalories = 0;
  let strengthMins = 0;
  let cardioMins = 0;
  let strengthBurn = 0;
  let cardioBurn = 0;

  if (worksOut) {
    if (goesToGym && gymDuration > 0) {
      cardioMins = Math.min(gymDuration, cardioDuration);
      strengthMins = Math.max(0, gymDuration - cardioMins);

      // Strength / Resistance Training portion
      const strengthMET = MET_VALUES[intensity] || MET_VALUES.medium;
      const grossStrength = (strengthMET * 3.5 * weight / 200) * strengthMins;
      const restingStrength = (bmr / 1440) * strengthMins;
      strengthBurn = Math.max(0, grossStrength - restingStrength);

      // Cardio portion: compute blended MET across user's selected modalities to avoid double counting
      const cardioMETList = cardioTypes.length > 0 
        ? cardioTypes.map((t) => CARDIO_MET_VALUES[t.toLowerCase()] || 7.0)
        : [7.0];
      const avgCardioMET = cardioMETList.reduce((a, b) => a + b, 0) / cardioMETList.length;

      const grossCardio = (avgCardioMET * 3.5 * weight / 200) * cardioMins;
      const restingCardio = (bmr / 1440) * cardioMins;
      cardioBurn = Math.max(0, grossCardio - restingCardio);

      workoutCalories = Math.round(strengthBurn + cardioBurn);
    } else {
      // General structured workout
      const sessionMins = duration > 0 ? duration : 30;
      const workoutMET = MET_VALUES[intensity] || MET_VALUES.medium;
      const grossWorkout = (workoutMET * 3.5 * weight / 200) * sessionMins;
      const restingWorkout = (bmr / 1440) * sessionMins;
      workoutCalories = Math.round(Math.max(0, grossWorkout - restingWorkout));
    }
  }

  // =========================================================================
  // STEP F: Estimated Maintenance Calories (TDEE)
  // =========================================================================
  const maintenanceCalories = Math.round(
    baselineEnergy + generalActivityBurn + incrementalWalkingBurn + workoutCalories
  );

  // =========================================================================
  // STEP G: Goal-Based Calorie Adjustment
  // =========================================================================
  let goalAdjustment = 0;
  if (primaryGoal === 'lose_fat' || primaryGoal === 'lose body fat') {
    // Controlled deficit: ~400 kcal (capped within 15-20% of maintenance)
    goalAdjustment = Math.max(-600, Math.min(-300, -Math.round(maintenanceCalories * 0.18)));
  } else if (primaryGoal === 'gain_muscle' || primaryGoal === 'gain weight / muscle') {
    // Lean surplus: ~300 kcal (capped within 10-15% of maintenance)
    goalAdjustment = Math.min(450, Math.max(250, Math.round(maintenanceCalories * 0.12)));
  } else if (primaryGoal === 'recomposition' || primaryGoal === 'body recomposition') {
    if (recompPriorityCanonical === 'fat_loss') {
      goalAdjustment = -150;
    } else if (recompPriorityCanonical === 'muscle_gain') {
      goalAdjustment = 100;
    } else {
      goalAdjustment = 0;
    }
  } else if (primaryGoal === 'performance' || primaryGoal === 'improve fitness / performance') {
    goalAdjustment = 50; // Slight surplus for optimal recovery
  } else if (primaryGoal === 'competition' || primaryGoal === 'competition preparation') {
    goalAdjustment = -200; // Targeted pre-competition deficit
  } else {
    goalAdjustment = 0; // Maintenance
  }

  const targetCalories = Math.max(1200, Math.round(maintenanceCalories + goalAdjustment));

  // =========================================================================
  // STEP H: Protein Calculation (Bodyweight-based with intensity, duration, & goal bonuses)
  // =========================================================================
  let baseProteinPerKg = PROTEIN_MULTIPLIERS.sedentary;
  if (worksOut) {
    if (intensity === 'intensive') {
      baseProteinPerKg = PROTEIN_MULTIPLIERS.intensive;
    } else if (intensity === 'medium') {
      baseProteinPerKg = PROTEIN_MULTIPLIERS.medium;
    } else {
      baseProteinPerKg = PROTEIN_MULTIPLIERS.small;
    }

    // Extended workout duration bonus (>= 60 mins)
    const activeWorkoutMins = goesToGym ? gymDuration : duration;
    if (activeWorkoutMins >= 60) {
      baseProteinPerKg += PROTEIN_MULTIPLIERS.durationBonus;
    }
  }

  // Goal adjustment to protein
  let goalProteinBonus = 0;
  if (primaryGoal.includes('lose') || primaryGoal.includes('recomp') || primaryGoal.includes('competition')) {
    goalProteinBonus = PROTEIN_MULTIPLIERS.goalBonus.lose_fat;
  } else if (primaryGoal.includes('gain')) {
    goalProteinBonus = PROTEIN_MULTIPLIERS.goalBonus.gain_muscle;
  }

  const finalProteinMultiplier = Math.min(2.5, Math.max(1.0, baseProteinPerKg + goalProteinBonus));
  const targetProtein = Math.round(weight * finalProteinMultiplier);

  // =========================================================================
  // STEP I: Fat Calculation (25% of Target Calories for hormonal baseline)
  // 1g fat = 9 kcal
  // =========================================================================
  const fatCalories = Math.round(targetCalories * 0.25);
  const targetFats = Math.round(fatCalories / 9);

  // =========================================================================
  // STEP J: Carbohydrate Calculation (Remaining calories for glycogen & training fuel)
  // 1g carb = 4 kcal
  // =========================================================================
  const proteinCalories = targetProtein * 4;
  const remainingCaloriesForCarbs = Math.max(0, targetCalories - (proteinCalories + fatCalories));
  const targetCarbs = Math.round(remainingCaloriesForCarbs / 4);

  // =========================================================================
  // STEP K: Dietary Fiber Calculation (14g per 1000 kcal consumed)
  // =========================================================================
  const targetFiber = Math.round((targetCalories / 1000) * 14);

  return {
    calories: targetCalories,
    protein: targetProtein,
    carbs: targetCarbs,
    fats: targetFats,
    fiber: targetFiber,
    bmr,
    baselineEnergy,
    generalActivityBurn,
    incrementalWalkingBurn,
    workoutCalories,
    maintenanceCalories,
    goalAdjustment,
    factors: {
      height: heightCm,
      height_cm: heightCm,
      height_unit: heightUnit,
      weight,
      age,
      gender: profile.gender || 'Male',
      works_out: worksOut,
      workout_frequency: workoutFrequency,
      intensity: profile.intensity || 'Medium',
      duration: duration || (goesToGym ? gymDuration : 30),
      daily_activity_level: dailyActivityLevel,
      walking_duration: rawWalkDuration,
      walkingMinutes,
      goes_to_gym: goesToGym,
      gym_frequency: gymFrequency,
      gym_duration: gymDuration,
      cardio_duration: cardioMins,
      cardio_type: cardioTypes.join(', '),
      cardio_types: cardioTypes,
      strengthMins,
      primary_goal: primaryGoal,
      target_weight: targetWeight,
      recomp_priority: recompPriorityCanonical,
      recomp_priorities: recompPriorities,
      performance_focus: performanceFocus,
      diet_preference: dietPreference,
      allergies,
      proteinPerKg: Math.round(finalProteinMultiplier * 10) / 10,
    },
  };
}

/**
 * Summarize a list of food logs
 */
export function summarizeLogs(logs = []) {
  return logs.reduce(
    (acc, log) => {
      const carbs = Number(log.carbs) || 0;
      const protein = Number(log.protein) || 0;
      const fats = Number(log.fats) || 0;
      const fiber = Number(log.fiber) || 0;
      const cals = calculateCalories(carbs, protein, fats);

      acc.carbs += carbs;
      acc.protein += protein;
      acc.fats += fats;
      acc.fiber += fiber;
      acc.calories += cals;
      acc.itemCount += 1;
      return acc;
    },
    { calories: 0, carbs: 0, protein: 0, fats: 0, fiber: 0, itemCount: 0 }
  );
}

/**
 * Generate human-readable, motivating explanation and projected pace for a user's calculated blueprint
 * 
 * @param {Object} blueprint - Calculated daily targets object from calculateDailyTargets
 * @param {Object} [profile] - Optional profile override
 * @returns {Object} Human-friendly insights, pace projections, and actionable coach summary
 */
export function generateGoalExplanation(blueprint, profile) {
  if (!blueprint) {
    return {
      goalId: 'maintain',
      title: 'Personalized Daily Blueprint',
      summary: 'Your blueprint is calibrated to your baseline metabolism and daily movement.',
      paceBadge: 'Metabolic Balance',
      paceText: 'Balanced daily energy intake',
      disclaimer: 'Actual weight change varies between individuals and may not follow a linear pattern.',
      highlights: [],
    };
  }

  const factors = blueprint.factors || profile || {};
  const primaryGoal = (factors.primary_goal || profile?.primary_goal || 'maintain').toLowerCase();
  const maintenance = blueprint.maintenanceCalories || 2000;
  const targetCalories = blueprint.calories || 2000;
  const goalAdjustment = blueprint.goalAdjustment || 0;
  const protein = blueprint.protein || 120;
  const carbs = blueprint.carbs || 200;
  const fats = blueprint.fats || 60;
  const proteinPerKg = factors.proteinPerKg || 1.6;
  const currentWeight = Number(factors.weight || profile?.weight) || 70;
  const heightCm = Number(factors.height || factors.height_cm || profile?.height || profile?.height_cm) || 170;
  const gender = factors.gender || profile?.gender || 'Male';
  const targetWeight = factors.target_weight ? Number(factors.target_weight) : null;
  const competitionDate = factors.competition_date || profile?.competition_date || '';

  const healthyRange = calculateHealthyWeightRange(heightCm, gender);

  let title = 'Personalized Nutrition Blueprint';
  let summary = '';
  let paceBadge = '';
  let paceText = '';
  let daysPerKg = 0;
  let weeklyRateKg = 0;
  let disclaimer = 'Actual weight change varies between individuals due to metabolic adaptation, fluid shifts, and activity consistency.';
  const highlights = [];

  if (primaryGoal.includes('lose') || primaryGoal === 'lose_fat') {
    const deficit = Math.abs(goalAdjustment) || Math.max(1, maintenance - targetCalories);
    daysPerKg = Math.round(APPROX_KCAL_PER_KG_CHANGE / deficit);
    weeklyRateKg = Math.round((deficit * 7 / APPROX_KCAL_PER_KG_CHANGE) * 100) / 100;

    title = 'Fat Loss Calibrated Blueprint';
    summary = `Your body burns approximately ${maintenance.toLocaleString()} kcal/day including your baseline metabolism, daily walking, and structured workouts (Maintenance TDEE). To lose body fat steadily while protecting lean muscle, your personalized intake is set to ${targetCalories.toLocaleString()} kcal/day — creating a healthy daily deficit of ~${deficit.toLocaleString()} kcal.`;
    paceBadge = `Estimated Pace: ~1 kg every ${daysPerKg} days (~${weeklyRateKg} kg / week)`;
    paceText = `At a ~${deficit} kcal/day deficit, you are projected to lose approximately 1 kg of body mass every ${daysPerKg} days (~${weeklyRateKg} kg per week).`;
    disclaimer = 'Actual weight change varies between individuals and may not follow a perfect linear pattern due to fluid retention, hormonal shifts, and metabolic rate.';

    highlights.push({
      label: 'Daily Deficit',
      value: `-${deficit} kcal/day`,
      desc: 'Below maintenance burn for steady fat breakdown',
      color: '#ff2d55',
    });
    highlights.push({
      label: 'Muscle Protection',
      value: `${protein}g protein (${proteinPerKg}g/kg)`,
      desc: 'High protein intake to safeguard lean tissue',
      color: '#30d158',
    });
    highlights.push({
      label: 'Projected Rate',
      value: `~${weeklyRateKg} kg / week`,
      desc: `Approx. ~1 kg every ${daysPerKg} days`,
      color: '#0a84ff',
    });

  } else if (primaryGoal.includes('gain') || primaryGoal === 'gain_muscle') {
    const surplus = Math.abs(goalAdjustment) || Math.max(1, targetCalories - maintenance);
    daysPerKg = Math.round(APPROX_KCAL_PER_KG_CHANGE / surplus);
    weeklyRateKg = Math.round((surplus * 7 / APPROX_KCAL_PER_KG_CHANGE) * 100) / 100;

    title = 'Lean Hypertrophy & Muscle Growth Blueprint';
    summary = `Your body expends approximately ${maintenance.toLocaleString()} kcal/day to maintain current bodyweight. To support progressive resistance training, muscle protein synthesis, and recovery without excess fat accumulation, your target is set to ${targetCalories.toLocaleString()} kcal/day (+${surplus.toLocaleString()} kcal lean surplus).`;
    paceBadge = `Estimated Pace: ~1 kg every ${daysPerKg} days (~${weeklyRateKg} kg / week)`;
    paceText = `With a controlled +${surplus} kcal/day surplus, your projected growth rate is approximately 1 kg every ${daysPerKg} days (~${weeklyRateKg} kg per week).`;
    disclaimer = 'Rate of muscle gain is influenced by training intensity, progressive overload, sleep quality, and individual training experience.';

    highlights.push({
      label: 'Lean Surplus',
      value: `+${surplus} kcal/day`,
      desc: 'Anabolic energy support for progressive hypertrophy',
      color: '#30d158',
    });
    highlights.push({
      label: 'Protein Anabolism',
      value: `${protein}g protein (${proteinPerKg}g/kg)`,
      desc: 'Continuous amino acid supply for muscle repair',
      color: '#0a84ff',
    });
    highlights.push({
      label: 'Projected Gain',
      value: `~${weeklyRateKg} kg / week`,
      desc: `Approx. ~1 kg every ${daysPerKg} days`,
      color: '#ffd60a',
    });

  } else if (primaryGoal === 'recomposition' || primaryGoal.includes('recomp')) {
    title = 'Body Recomposition Blueprint';
    summary = `Your target is calibrated right around your maintenance expenditure (${maintenance.toLocaleString()} kcal/day) paired with a high protein distribution (${protein}g/day). This fuels intense strength training and muscle building while prompting your body to mobilize stored body fat for energy.`;
    paceBadge = 'Simultaneous Muscle Gain & Fat Loss';
    paceText = 'Prioritizes body composition remodeling (recomp) without aggressive scale weight swings.';
    disclaimer = 'Body recomposition changes fat-to-muscle ratio. The scale may stay stable while waist measurements decrease and muscle definition increases.';

    highlights.push({
      label: 'Energy Equilibrium',
      value: `${targetCalories.toLocaleString()} kcal/day`,
      desc: 'Balanced calories to fuel workouts & burn fat',
      color: '#bf5af2',
    });
    highlights.push({
      label: 'High Protein Priority',
      value: `${protein}g (${proteinPerKg}g/kg)`,
      desc: 'Supports continuous muscle remodeling & satiety',
      color: '#30d158',
    });
    highlights.push({
      label: 'Metabolic Focus',
      value: 'Muscle ↑ Fat ↓',
      desc: 'Best paired with progressive resistance training',
      color: '#0a84ff',
    });

  } else if (primaryGoal === 'performance' || primaryGoal.includes('fitness')) {
    title = 'Athletic Performance & Endurance Blueprint';
    summary = `Your target provides ${targetCalories.toLocaleString()} kcal/day with optimized carbohydrate availability (${carbs}g/day) to fully top off muscle glycogen stores, maximize training output, and accelerate systemic recovery between sessions.`;
    paceBadge = 'Peak Glycogen & Training Fuel';
    paceText = 'Optimized for high athletic output, endurance capacity, and fast recovery.';
    disclaimer = 'Caloric expenditure fluctuates on heavy training days vs active recovery days; prioritize nutrient timing around workouts.';

    highlights.push({
      label: 'Carb Availability',
      value: `${carbs}g carbohydrates`,
      desc: 'Fast-accessible glycogen for explosive power & stamina',
      color: '#ffd60a',
    });
    highlights.push({
      label: 'Recovery Density',
      value: `${protein}g protein (${proteinPerKg}g/kg)`,
      desc: 'Accelerated soft-tissue repair and muscular recovery',
      color: '#30d158',
    });
    highlights.push({
      label: 'Full Daily Energy',
      value: `${targetCalories.toLocaleString()} kcal/day`,
      desc: 'Sustains high work capacity without chronic fatigue',
      color: '#0a84ff',
    });

  } else if (primaryGoal === 'competition' || primaryGoal.includes('comp')) {
    let competitionNote = '';
    let compDaysRemaining = null;
    if (competitionDate) {
      const eventTime = new Date(competitionDate).getTime();
      const nowTime = Date.now();
      compDaysRemaining = Math.ceil((eventTime - nowTime) / (1000 * 60 * 60 * 24));
      if (compDaysRemaining > 0) {
        competitionNote = ` Event countdown: ${compDaysRemaining} days remaining.`;
      } else if (compDaysRemaining === 0) {
        competitionNote = ' Event is today!';
      } else {
        competitionNote = ' Target event date has passed. Please update your target competition date.';
      }
    }

    title = 'Competition Conditioning & Peaking Blueprint';
    summary = `Calibrated for structured pre-competition preparation with disciplined energy targets of ${targetCalories.toLocaleString()} kcal/day. Formulated to achieve peak conditioning and weight-category readiness while preserving muscular density.${competitionNote}`;
    paceBadge = compDaysRemaining !== null && compDaysRemaining > 0 
      ? `Timeline: ${compDaysRemaining} Days Out`
      : 'Precision Conditioning & Readiness';
    paceText = 'Disciplined timeline preparation for athletic or physique competition.';
    disclaimer = 'Adhere closely to sodium, hydration, and planned refeed strategies as your event date approaches.';

    highlights.push({
      label: 'Disciplined Target',
      value: `${targetCalories.toLocaleString()} kcal/day`,
      desc: 'Structured energy target for staged peaking',
      color: '#ff9f0a',
    });
    highlights.push({
      label: 'Peak Lean Density',
      value: `${protein}g protein (${proteinPerKg}g/kg)`,
      desc: 'Maximal lean tissue retention in conditioning phases',
      color: '#30d158',
    });
    highlights.push({
      label: compDaysRemaining !== null && compDaysRemaining > 0 ? 'Countdown' : 'Performance Carbs',
      value: compDaysRemaining !== null && compDaysRemaining > 0 ? `${compDaysRemaining} Days` : `${carbs}g Carbs`,
      desc: compDaysRemaining !== null && compDaysRemaining > 0 ? 'Disciplined timeline execution' : 'Targeted carb allocation',
      color: '#0a84ff',
    });

  } else {
    // Maintain weight
    title = 'Energy Balance & Metabolic Stability Blueprint';
    summary = `Your daily target is calibrated directly to your estimated daily expenditure of ${maintenance.toLocaleString()} kcal/day. This maintains your current bodyweight while supporting optimal metabolic rate, cellular health, and daily energy levels.`;
    paceBadge = 'Metabolic Equilibrium (Weight Stable)';
    paceText = 'Calibrated for zero intentional surplus or deficit to keep your weight steady.';
    disclaimer = 'Daily weight variations of 0.5–1.5 kg are completely normal due to hydration, glycogen storage, and digestion.';

    highlights.push({
      label: 'Energy In = Energy Out',
      value: `${targetCalories.toLocaleString()} kcal/day`,
      desc: 'Exact match with total daily energy expenditure',
      color: '#0a84ff',
    });
    highlights.push({
      label: 'Tissue Maintenance',
      value: `${protein}g protein (${proteinPerKg}g/kg)`,
      desc: 'Maintains lean body mass and cellular repair',
      color: '#30d158',
    });
    highlights.push({
      label: 'Balanced Macros',
      value: `${carbs}g C • ${fats}g F`,
      desc: 'Steady blood sugar and hormone regulation',
      color: '#ffd60a',
    });
  }

  return {
    goalId: primaryGoal,
    title,
    summary,
    maintenanceCalories: maintenance,
    targetCalories,
    goalAdjustment,
    isDeficit: goalAdjustment < 0,
    isSurplus: goalAdjustment > 0,
    isNeutral: goalAdjustment === 0,
    deficitOrSurplusValue: Math.abs(goalAdjustment),
    paceBadge,
    paceText,
    daysPerKg,
    weeklyRateKg,
    disclaimer,
    highlights,
    healthyRange,
    currentWeight,
    targetWeight,
  };
}

// Alias for flexibility
export const getPersonalizedBlueprintInsights = generateGoalExplanation;


