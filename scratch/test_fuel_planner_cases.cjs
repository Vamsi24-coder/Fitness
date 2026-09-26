// Node.js test for Fuel Planner day-aware & time-aware test cases
const path = require('path');

async function run() {
  const { 
    generateInstantFuelPlan, 
    getCurrentMealPeriod 
  } = await import('../src/services/fuelPlanner.js');

  const profile = {
    id: 'test-user',
    gender: 'Male',
    age: 26,
    weight: 72,
    works_out: true,
    intensity: 'Medium',
    duration: 45
  };

  const targets = {
    calories: 2200,
    protein: 130,
    carbs: 240,
    fats: 65,
    fiber: 30,
    bmr: 1680,
    workoutCalories: 350
  };

  function createTime(hour, minute) {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  console.log('====================================================');
  console.log('VERIFYING FUEL PLANNER 7 CORE TIME-AWARE CASES');
  console.log('====================================================\n');

  // CASE 1: 7:30 AM, No meals logged
  console.log('--> CASE 1: 7:30 AM, No meals logged');
  const t1 = createTime(7, 30);
  const plan1 = generateInstantFuelPlan(profile, [], targets, t1);
  assert(plan1.currentPeriod === 'Breakfast', 'Current period is Breakfast');
  assert(plan1.nextMeal.category === 'Breakfast', 'Next meal is Breakfast');
  assert(plan1.laterMeals.some(m => m.category === 'Lunch'), 'Upcoming includes Lunch');
  assert(plan1.laterMeals.some(m => m.category === 'Evening Snacks'), 'Upcoming includes Snacks');
  assert(plan1.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');
  assert(!plan1.laterMeals.some(m => m.category.includes('Breakfast')), 'Upcoming does not duplicate Breakfast');

  // CASE 2: 10:30 AM, Breakfast logged
  console.log('\n--> CASE 2: 10:30 AM, Breakfast logged');
  const t2 = createTime(10, 30);
  const logs2 = [{ meal_category: 'Breakfast', food_name: 'Pesarattu & Eggs', carbs: 40, protein: 22, fats: 10, fiber: 8 }];
  const plan2 = generateInstantFuelPlan(profile, logs2, targets, t2);
  assert(plan2.currentPeriod === 'Breakfast', 'Current period is Breakfast');
  assert(plan2.nextMeal.category === 'Lunch', 'Next meal is Lunch (not breakfast)');
  assert(!plan2.laterMeals.some(m => m.category === 'Breakfast'), 'Do NOT recommend another breakfast');
  assert(plan2.laterMeals.some(m => m.category === 'Evening Snacks'), 'Upcoming includes Snacks');
  assert(plan2.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');

  // CASE 3: 12:30 PM, Breakfast not logged, Lunch not logged
  console.log('\n--> CASE 3: 12:30 PM, Breakfast not logged, Lunch not logged');
  const t3 = createTime(12, 30);
  const plan3 = generateInstantFuelPlan(profile, [], targets, t3);
  assert(plan3.currentPeriod === 'Lunch', 'Current period is Lunch');
  assert(plan3.nextMeal.category === 'Lunch', 'Next meal is Lunch');
  assert(!plan3.laterMeals.some(m => m.category === 'Breakfast'), 'Do NOT recommend today breakfast as upcoming');
  assert(plan3.laterMeals.some(m => m.category === 'Evening Snacks'), 'Upcoming includes Snacks');
  assert(plan3.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');
  assert(plan3.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Upcoming includes Tomorrow Breakfast');
  assert(plan3.alreadyEatenDiagnosis.toLowerCase().includes('breakfast'), 'Mentions breakfast was not logged/missed');

  // CASE 4: 2:00 PM, Breakfast logged, Lunch logged
  console.log('\n--> CASE 4: 2:00 PM, Breakfast logged, Lunch logged');
  const t4 = createTime(14, 0);
  const logs4 = [
    { meal_category: 'Breakfast', food_name: 'Idli Sambar', carbs: 45, protein: 12, fats: 4, fiber: 5 },
    { meal_category: 'Lunch', food_name: 'Rice & Pappu', carbs: 60, protein: 25, fats: 12, fiber: 7 }
  ];
  const plan4 = generateInstantFuelPlan(profile, logs4, targets, t4);
  assert(plan4.currentPeriod === 'Lunch', 'Current period is Lunch');
  assert(plan4.nextMeal.category === 'Evening Snacks', 'Next meal is Evening Snacks');
  assert(!plan4.laterMeals.some(m => m.category === 'Breakfast' || m.category === 'Lunch'), 'Do not recommend breakfast/lunch again');
  assert(plan4.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');
  assert(plan4.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Upcoming includes Tomorrow Breakfast');

  // CASE 5: 5:30 PM, Breakfast + Lunch logged, Snack not logged
  console.log('\n--> CASE 5: 5:30 PM, Breakfast + Lunch logged, Snack not logged');
  const t5 = createTime(17, 30);
  const plan5 = generateInstantFuelPlan(profile, logs4, targets, t5);
  assert(plan5.currentPeriod === 'Snacks', 'Current period is Snacks');
  assert(plan5.nextMeal.category === 'Evening Snacks', 'Current/next meal is Evening Snacks');
  assert(plan5.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');
  assert(plan5.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Upcoming includes Tomorrow Breakfast');
  assert(!plan5.laterMeals.some(m => m.category === 'Breakfast' || m.category === 'Lunch'), 'No past meals in upcoming');

  // CASE 6: 8:30 PM, Breakfast + Lunch + Snack logged, Dinner not logged
  console.log('\n--> CASE 6: 8:30 PM, Breakfast + Lunch + Snack logged, Dinner not logged');
  const t6 = createTime(20, 30);
  const logs6 = [
    ...logs4,
    { meal_category: 'Snacks', food_name: 'Majjiga & Chana', carbs: 18, protein: 12, fats: 5, fiber: 4 }
  ];
  const plan6 = generateInstantFuelPlan(profile, logs6, targets, t6);
  assert(plan6.currentPeriod === 'Dinner', 'Current period is Dinner');
  assert(plan6.nextMeal.category === 'Dinner', 'Next meal is Dinner');
  assert(plan6.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Upcoming is Tomorrow Breakfast');
  assert(!plan6.laterMeals.some(m => ['Breakfast', 'Lunch', 'Evening Snacks'].includes(m.category)), 'No past meals in upcoming');

  // CASE 7: 11:30 PM, All meals logged
  console.log('\n--> CASE 7: 11:30 PM, All meals logged');
  const t7 = createTime(23, 30);
  const logs7 = [
    ...logs6,
    { meal_category: 'Dinner', food_name: 'Phulkas & Kodi Kura', carbs: 35, protein: 30, fats: 10, fiber: 5 }
  ];
  const plan7 = generateInstantFuelPlan(profile, logs7, targets, t7);
  assert(plan7.currentPeriod === 'LateNight', 'Current period is LateNight');
  assert(plan7.nextMeal.category === 'Day Completed', 'Next meal is Day Completed');
  assert(plan7.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Focus on Tomorrow Breakfast');

  console.log(`\n====================================================`);
  console.log(`TEST CASES SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================`);

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
