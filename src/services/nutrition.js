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
const MET_VALUES = {
  intensive: 8.5, // HIIT, heavy resistance training, fast running
  medium: 6.0,    // Moderate lifting, jogging, cycling
  small: 3.5,     // Light walking, yoga, mobility
  none: 1.0,
};

/**
 * Calculate dynamic, personalized daily nutritional targets based on EVERY profile factor:
 * - gender (Male, Female, Other)
 * - age (years)
 * - weight (kg)
 * - works_out (boolean)
 * - intensity (Intensive, Medium, Small)
 * - duration (minutes)
 */
export function calculateDailyTargets(profile) {
  if (!profile) {
    return {
      calories: 2000,
      protein: 120,
      carbs: 220,
      fats: 65,
      fiber: 28,
      bmr: 1650,
      workoutCalories: 0,
      factors: {
        weight: 70,
        age: 25,
        gender: 'Male',
        works_out: false,
        intensity: 'None',
        duration: 0,
        proteinPerKg: 1.4,
      },
    };
  }

  const age = Math.max(12, Math.min(120, Number(profile.age) || 25));
  const weight = Math.max(20, Math.min(300, Number(profile.weight) || 70)); // kg
  const gender = (profile.gender || 'male').toLowerCase();
  const worksOut = Boolean(profile.works_out);
  const intensity = (profile.intensity || 'Medium').toLowerCase();
  const duration = Math.max(0, Number(profile.duration) || 0); // minutes

  // 1. Basal Metabolic Rate (BMR) using Mifflin-St Jeor formula
  // Approximating height based on gender: Men ~176cm, Women ~163cm, Other ~170cm
  let heightCm = 170;
  if (gender === 'male') heightCm = 176;
  else if (gender === 'female') heightCm = 163;

  let bmr = 10 * weight + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else if (gender === 'female') {
    bmr -= 161;
  } else {
    bmr -= 78; // neutral midpoint
  }
  bmr = Math.round(bmr);

  // 2. Base Sedentary Energy Expenditure (Non-exercise daily burn)
  const sedentaryBurn = Math.round(bmr * 1.2);

  // 3. Exercise Energy Expenditure (Workout Calories burned)
  // Calories burned = MET * 3.5 * weight (kg) / 200 * duration (mins)
  let workoutCalories = 0;
  let met = 0;
  if (worksOut && duration > 0) {
    met = MET_VALUES[intensity] || MET_VALUES.medium;
    workoutCalories = Math.round((met * 3.5 * weight) / 200 * duration);
  }

  // Total Daily Energy Expenditure (Target Calories)
  const targetCalories = sedentaryBurn + workoutCalories;

  // 4. Protein calculation based on Weight, Workout Status, Intensity, and Duration
  // Grams of protein per kg of bodyweight:
  let proteinPerKg = 1.0; // Sedentary baseline
  if (worksOut) {
    if (intensity === 'intensive') {
      proteinPerKg = 2.1;
    } else if (intensity === 'medium') {
      proteinPerKg = 1.7;
    } else {
      proteinPerKg = 1.4;
    }

    // Additional recovery boost if workout duration exceeds 60 minutes
    if (duration >= 60) {
      proteinPerKg += 0.15;
    }
  }
  const targetProtein = Math.round(weight * proteinPerKg);

  // 5. Fat calculation: ~25% of total calories for hormonal and cellular health
  // 1g fat = 9 kcal
  const targetFats = Math.round((targetCalories * 0.25) / 9);

  // 6. Carbohydrate calculation: Remaining calories dedicated to glycogen & workout fuel
  // 1g carb = 4 kcal
  const caloriesFromProteinAndFat = targetProtein * 4 + targetFats * 9;
  const remainingCaloriesForCarbs = Math.max(0, targetCalories - caloriesFromProteinAndFat);
  const targetCarbs = Math.round(remainingCaloriesForCarbs / 4);

  // 7. Dietary Fiber calculation: 14g per 1000 kcal
  const targetFiber = Math.round((targetCalories / 1000) * 14);

  return {
    calories: targetCalories,
    protein: targetProtein,
    carbs: targetCarbs,
    fats: targetFats,
    fiber: targetFiber,
    bmr,
    sedentaryBurn,
    workoutCalories,
    factors: {
      weight,
      age,
      gender: profile.gender || 'Male',
      works_out: worksOut,
      intensity: profile.intensity || 'Medium',
      duration,
      proteinPerKg: Math.round(proteinPerKg * 10) / 10,
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
