import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY } from '../js/store.js';
import { dayTotals } from '../js/nutrition.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), map: m };
}

const banana = { id: 'db-1', name: 'Banana', serving: '1 medium', calories: 105, carbs: 27, protein: 1.3, fat: 0.4 };
const D = '2026-10-16';

test('adds, edits, moves and removes diary entries', () => {
  const s = createStore(memoryStorage());
  const e = s.addFood(D, 'breakfast', banana, 2);
  assert.equal(dayTotals(s.getDay(D)).food.calories, 210);
  s.updateEntry(D, e.id, { servings: 1, meal: 'snacks' });
  assert.equal(s.getDay(D).meals.breakfast.length, 0);
  assert.equal(s.getDay(D).meals.snacks[0].servings, 1);
  s.removeEntry(D, e.id);
  assert.equal(dayTotals(s.getDay(D)).food.calories, 0);
});

test('persists to storage and reloads', () => {
  const storage = memoryStorage();
  const s = createStore(storage);
  s.addFood(D, 'lunch', banana);
  s.setWater(D, 750);
  const again = createStore(storage);
  assert.equal(again.getDay(D).meals.lunch[0].name, 'Banana');
  assert.equal(again.getDay(D).waterMl, 750);
});

test('corrupt storage falls back to defaults', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, '{not json');
  const s = createStore(storage);
  assert.equal(s.state.version, 1);
});

test('entries keep their nutrition when the custom food changes', () => {
  const s = createStore(memoryStorage());
  const food = s.saveCustomFood({ name: 'Shake', serving: '1 bottle', calories: '200', protein: '30' });
  s.addFood(D, 'snacks', food);
  s.saveCustomFood({ ...food, calories: 999 });
  assert.equal(s.getDay(D).meals.snacks[0].calories, 200);
  assert.equal(s.state.customFoods.length, 1);
  assert.equal(s.state.customFoods[0].calories, 999);
});

test('copies a meal from the previous day', () => {
  const s = createStore(memoryStorage());
  s.addFood('2026-10-15', 'dinner', banana);
  assert.equal(s.copyMeal('2026-10-15', D, 'dinner'), 1);
  const [a] = s.getDay('2026-10-15').meals.dinner;
  const [b] = s.getDay(D).meals.dinner;
  assert.equal(b.name, 'Banana');
  assert.notEqual(a.id, b.id);
});

test('weigh-ins update profile weight and the auto calorie goal', () => {
  const s = createStore(memoryStorage());
  const before = s.state.goals.calories;
  s.logWeight('2026-10-01', 90);
  s.logWeight('2026-09-01', 95);
  assert.deepEqual(s.state.weights.map((w) => w.date), ['2026-09-01', '2026-10-01']);
  assert.equal(s.state.profile.weightKg, 90);
  assert.ok(s.state.goals.calories > before);
});

test('manual calorie goal is not overwritten by profile changes', () => {
  const s = createStore(memoryStorage());
  s.setGoals({ autoCalories: false, calories: 1800 });
  s.setProfile({ weightKg: 120 });
  assert.equal(s.state.goals.calories, 1800);
});

test('export and import round-trip; invalid import throws', () => {
  const s = createStore(memoryStorage());
  s.addExercise(D, { name: 'Run', minutes: 30, calories: 300 });
  const json = s.exportJSON();
  const t = createStore(memoryStorage());
  t.importJSON(json);
  assert.equal(dayTotals(t.getDay(D)).exercise, 300);
  assert.throws(() => t.importJSON('{"foo":1}'));
});
