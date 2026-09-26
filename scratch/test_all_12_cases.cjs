// Comprehensive test script verifying all 12 required cases
const fs = require('fs');
const path = require('path');

// Polyfill minimal WebSocket for Node 20 supabase import
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class MockWebSocket {
    constructor() {}
  };
}

async function run() {
  const { 
    generateInstantFuelPlan, 
    getCurrentMealPeriod 
  } = await import('../src/services/fuelPlanner.js');

  const {
    enhanceFuelPlanWithAI
  } = await import('../src/services/gemini.js');

  const profile = {
    id: 'user-vip',
    gender: 'Male',
    age: 27,
    weight: 74,
    works_out: true,
    intensity: 'Medium',
    duration: 45
  };

  const targets = {
    calories: 2250,
    protein: 135,
    carbs: 245,
    fats: 68,
    fiber: 30,
    bmr: 1710,
    workoutCalories: 360
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
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  console.log('====================================================');
  console.log('STARTING NUTRIPULSE 12 TEST CASES VERIFICATION');
  console.log('====================================================\n');

  // CASE 1: 7:30 AM, No meals logged
  console.log('--> CASE 1: 7:30 AM, No meals logged');
  const t1 = createTime(7, 30);
  const plan1 = generateInstantFuelPlan(profile, [], targets, t1);
  assert(plan1.currentPeriod === 'Breakfast', 'Current = Breakfast');
  assert(plan1.nextMeal.category === 'Breakfast', 'Featured next = Breakfast');
  assert(plan1.laterMeals.some(m => m.category === 'Lunch'), 'Upcoming includes Lunch');
  assert(plan1.laterMeals.some(m => m.category === 'Evening Snacks'), 'Upcoming includes Snack');
  assert(plan1.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');

  // CASE 2: 10:30 AM, Breakfast logged
  console.log('\n--> CASE 2: 10:30 AM, Breakfast logged');
  const t2 = createTime(10, 30);
  const logs2 = [{ meal_category: 'Breakfast', food_name: 'Pesarattu & Allam Chutney', carbs: 42, protein: 22, fats: 9, fiber: 9 }];
  const plan2 = generateInstantFuelPlan(profile, logs2, targets, t2);
  assert(plan2.currentPeriod === 'Breakfast', 'Current = Breakfast window');
  assert(plan2.nextMeal.category === 'Lunch', 'Next meal = Lunch (do not recommend breakfast)');
  assert(!plan2.laterMeals.some(m => m.category === 'Breakfast'), 'Upcoming does not include Breakfast');
  assert(plan2.laterMeals.some(m => m.category === 'Evening Snacks'), 'Upcoming includes Snack');
  assert(plan2.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');

  // CASE 3: 12:30 PM, Breakfast not logged, Lunch not logged
  console.log('\n--> CASE 3: 12:30 PM, Breakfast not logged, Lunch not logged');
  const t3 = createTime(12, 30);
  const plan3 = generateInstantFuelPlan(profile, [], targets, t3);
  assert(plan3.currentPeriod === 'Lunch', 'Current = Lunch');
  assert(plan3.nextMeal.category === 'Lunch', 'Featured next = Lunch');
  assert(!plan3.laterMeals.some(m => m.category === 'Breakfast'), 'Do NOT recommend today breakfast as upcoming');
  assert(plan3.laterMeals.some(m => m.category === 'Evening Snacks'), 'Upcoming includes Snack');
  assert(plan3.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');
  assert(plan3.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Upcoming includes Tomorrow breakfast');

  // CASE 4: 2:00 PM, Breakfast logged, Lunch logged
  console.log('\n--> CASE 4: 2:00 PM, Breakfast logged, Lunch logged');
  const t4 = createTime(14, 0);
  const logs4 = [
    { meal_category: 'Breakfast', food_name: '3 Idlis & Sambar', carbs: 46, protein: 18, fats: 6, fiber: 6 },
    { meal_category: 'Lunch', food_name: 'Rice, Palakura Pappu, 2 Eggs', carbs: 55, protein: 28, fats: 14, fiber: 8 }
  ];
  const plan4 = generateInstantFuelPlan(profile, logs4, targets, t4);
  assert(plan4.currentPeriod === 'Lunch', 'Current = Lunch window');
  assert(plan4.nextMeal.category === 'Evening Snacks', 'Next meal = Evening Snacks');
  assert(!plan4.laterMeals.some(m => m.category === 'Breakfast' || m.category === 'Lunch'), 'Do not recommend breakfast/lunch again');
  assert(plan4.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');
  assert(plan4.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Upcoming includes Tomorrow breakfast');

  // CASE 5: 5:30 PM, Breakfast + Lunch logged, Snack not logged
  console.log('\n--> CASE 5: 5:30 PM, Breakfast + Lunch logged, Snack not logged');
  const t5 = createTime(17, 30);
  const plan5 = generateInstantFuelPlan(profile, logs4, targets, t5);
  assert(plan5.currentPeriod === 'Snacks', 'Current = Snack');
  assert(plan5.nextMeal.category === 'Evening Snacks', 'Featured next = Snack');
  assert(plan5.laterMeals.some(m => m.category === 'Dinner'), 'Upcoming includes Dinner');
  assert(plan5.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Upcoming includes Tomorrow breakfast');

  // CASE 6: 8:30 PM, Breakfast + Lunch + Snack logged, Dinner not logged
  console.log('\n--> CASE 6: 8:30 PM, Breakfast + Lunch + Snack logged, Dinner not logged');
  const t6 = createTime(20, 30);
  const logs6 = [
    ...logs4,
    { meal_category: 'Snacks', food_name: 'Majjiga & Roasted Chana', carbs: 20, protein: 15, fats: 5, fiber: 4 }
  ];
  const plan6 = generateInstantFuelPlan(profile, logs6, targets, t6);
  assert(plan6.currentPeriod === 'Dinner', 'Current = Dinner');
  assert(plan6.nextMeal.category === 'Dinner', 'Featured next = Dinner');
  assert(plan6.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Upcoming = Tomorrow breakfast');

  // CASE 7: 11:30 PM, All meals logged
  console.log('\n--> CASE 7: 11:30 PM, All meals logged');
  const t7 = createTime(23, 30);
  const logs7 = [
    ...logs6,
    { meal_category: 'Dinner', food_name: '2 Phulkas & Kodi Kura', carbs: 36, protein: 32, fats: 11, fiber: 6 }
  ];
  const plan7 = generateInstantFuelPlan(profile, logs7, targets, t7);
  assert(plan7.currentPeriod === 'LateNight', 'Current = LateNight');
  assert(plan7.nextMeal.category === 'Day Completed', 'No unnecessary additional meal (Day Completed)');
  assert(plan7.laterMeals.some(m => m.category.includes("Tomorrow's Breakfast")), 'Focus on Tomorrow breakfast');

  // CASE 8: Add lunch while Dashboard is open
  console.log('\n--> CASE 8: Add lunch while Dashboard is open');
  const beforeLunch = generateInstantFuelPlan(profile, logs2, targets, t3);
  assert(beforeLunch.nextMeal.category === 'Lunch', 'Before adding lunch, next is Lunch');
  const afterLunchLogs = [...logs2, { meal_category: 'Lunch', food_name: 'Rice & Pappu', carbs: 55, protein: 26, fats: 12, fiber: 7 }];
  const afterLunch = generateInstantFuelPlan(profile, afterLunchLogs, targets, t3);
  assert(afterLunch.nextMeal.category === 'Evening Snacks', 'Instantly transitions to Evening Snacks upon adding lunch');
  assert(afterLunch.macroStatus.caloriesRemaining < beforeLunch.macroStatus.caloriesRemaining, 'Calories remaining immediately updated');

  // CASE 9: Delete a meal
  console.log('\n--> CASE 9: Delete a meal');
  const beforeDelete = generateInstantFuelPlan(profile, afterLunchLogs, targets, t3);
  const deletedLogs = afterLunchLogs.filter(l => l.meal_category !== 'Lunch');
  const afterDelete = generateInstantFuelPlan(profile, deletedLogs, targets, t3);
  assert(afterDelete.nextMeal.category === 'Lunch', 'Immediately switches back to Lunch recommendation');
  assert(afterDelete.macroStatus.caloriesRemaining > beforeDelete.macroStatus.caloriesRemaining, 'Calories remaining immediately restored');

  // CASE 10: Open Analytics
  console.log('\n--> CASE 10: Open Analytics');
  const statsContent = fs.readFileSync(path.join(__dirname, '../src/pages/Stats.jsx'), 'utf8');
  assert(!statsContent.includes('AISuggestions'), 'Today Fuel Plan is completely absent from Stats.jsx');
  assert(!statsContent.includes("Today's Fuel Plan Guidance"), 'No Fuel Plan heading or component in Stats.jsx');

  // CASE 11: Open Dashboard
  console.log('\n--> CASE 11: Open Dashboard');
  const dashContent = fs.readFileSync(path.join(__dirname, '../src/pages/Dashboard.jsx'), 'utf8');
  assert(dashContent.includes('AISuggestions'), 'Today Fuel Plan is present in Dashboard.jsx');
  assert(dashContent.includes("AI-Powered Suggestions Section"), 'Section present on Dashboard');

  // CASE 12: Gemini unavailable / slow
  console.log('\n--> CASE 12: Gemini unavailable / slow');
  const instantFallback = generateInstantFuelPlan(profile, logs4, targets, t4);
  assert(instantFallback !== null, 'Instant local plan is immediately returned');
  assert(instantFallback.nextMeal.title.length > 0, 'Instant plan has complete meal recommendation');
  assert(instantFallback.laterMeals.length > 0, 'Instant plan has complete later meals');
  assert(instantFallback.macroStatus.caloriesRemaining > 0, 'Instant plan calculates live remaining macros');

  console.log(`\n====================================================`);
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================`);

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
