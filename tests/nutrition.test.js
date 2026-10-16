import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcBMR, calcTDEE, calcCalorieGoal, calcMacroGoals, sumEntries,
  exerciseCalories, remainingCalories, dayTotals,
} from '../js/nutrition.js';

const man = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'moderate', weeklyGoalKg: 0 };

test('BMR follows Mifflin–St Jeor', () => {
  assert.equal(calcBMR(man), 1780);
  assert.equal(calcBMR({ ...man, sex: 'female' }), 1614);
});

test('TDEE applies the activity factor', () => {
  assert.equal(Math.round(calcTDEE(man)), Math.round(1780 * 1.55));
});

test('calorie goal adjusts for weekly change and rounds to 10', () => {
  assert.equal(calcCalorieGoal(man), 2760);
  assert.equal(calcCalorieGoal({ ...man, weeklyGoalKg: -0.5 }), 2210);
  assert.equal(calcCalorieGoal({ ...man, weeklyGoalKg: 0.25 }), 3030);
});

test('aggressive loss goals are floored at a safe minimum', () => {
  const woman = { sex: 'female', age: 30, heightCm: 168, weightKg: 70, activity: 'sedentary', weeklyGoalKg: -1 };
  assert.equal(calcCalorieGoal(woman), 1200);
  // ...but never above maintenance when maintenance itself is below the floor.
  const small = { sex: 'female', age: 60, heightCm: 150, weightKg: 50, activity: 'sedentary', weeklyGoalKg: -1 };
  assert.equal(calcCalorieGoal(small), 1170);
});

test('macro grams from percentages', () => {
  assert.deepEqual(calcMacroGoals(2000, { carbsPct: 50, proteinPct: 20, fatPct: 30 }), { carbs: 250, protein: 100, fat: 67 });
});

test('entries are summed with servings', () => {
  const t = sumEntries([
    { calories: 100, carbs: 10, protein: 5, fat: 2, servings: 2 },
    { calories: 50, carbs: 0, protein: 10, fat: 1, servings: 0.5 },
  ]);
  assert.equal(t.calories, 225);
  assert.equal(t.protein, 15);
  assert.equal(t.sodium, 0);
});

test('exercise calories and remaining', () => {
  assert.equal(exerciseCalories(8, 70, 30), 280);
  assert.equal(remainingCalories(2000, 1500, 300), 800);
  const d = dayTotals({ meals: { lunch: [{ calories: 500, servings: 1 }] }, exercise: [{ calories: 200 }] });
  assert.equal(d.food.calories, 500);
  assert.equal(d.exercise, 200);
});
