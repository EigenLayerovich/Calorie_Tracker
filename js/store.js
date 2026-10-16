// Application state, persisted to a key/value storage (localStorage in the
// browser). All mutations go through the store so subscribers can re-render.

import { calcCalorieGoal, NUTRIENTS } from './nutrition.js';

export const STORAGE_KEY = 'calorie-tracker:v1';
export const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
export const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

export function defaultState() {
  const profile = {
    sex: 'female', age: 30, heightCm: 168, weightKg: 70,
    activity: 'light', weeklyGoalKg: -0.5, units: 'metric',
  };
  return {
    version: 1,
    profile,
    goals: {
      calories: calcCalorieGoal(profile),
      autoCalories: true,
      carbsPct: 50, proteinPct: 20, fatPct: 30,
      waterMl: 2000,
    },
    customFoods: [],
    recentFoods: [],
    days: {},
    weights: [],
    onboarded: false,
  };
}

export function emptyDay() {
  return { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [], waterMl: 0 };
}

let idCounter = 0;
export function uid(prefix = 'id') {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Copy the nutrient snapshot of a food so later edits don't rewrite history. */
function foodSnapshot(food) {
  const snap = { name: food.name, brand: food.brand ?? '', serving: food.serving ?? '1 serving', foodId: food.id ?? null };
  for (const k of NUTRIENTS) snap[k] = Number(food[k]) || 0;
  return snap;
}

function mergeState(saved) {
  const base = defaultState();
  return {
    ...base,
    ...saved,
    profile: { ...base.profile, ...saved.profile },
    goals: { ...base.goals, ...saved.goals },
  };
}

export function createStore(storage) {
  let state;
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    state = raw ? mergeState(JSON.parse(raw)) : defaultState();
  } catch {
    state = defaultState();
  }
  const listeners = new Set();

  function commit() {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable; keep working in memory.
    }
    for (const fn of listeners) fn(state);
  }

  function day(key) {
    if (!state.days[key]) state.days[key] = emptyDay();
    return state.days[key];
  }

  function findEntry(key, entryId) {
    const d = state.days[key];
    if (!d) return null;
    for (const meal of MEALS) {
      const idx = d.meals[meal].findIndex((e) => e.id === entryId);
      if (idx !== -1) return { meal, idx, list: d.meals[meal] };
    }
    return null;
  }

  function touchRecent(food) {
    const snap = { ...foodSnapshot(food), id: food.id ?? uid('recent') };
    state.recentFoods = [snap, ...state.recentFoods.filter((f) => !(f.name === snap.name && f.brand === snap.brand && f.serving === snap.serving))].slice(0, 30);
  }

  function syncAutoCalories() {
    if (state.goals.autoCalories) state.goals.calories = calcCalorieGoal(state.profile);
  }

  return {
    get state() { return state; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    getDay(key) { return state.days[key] ?? emptyDay(); },

    addFood(key, meal, food, servings = 1) {
      const entry = { id: uid('e'), ...foodSnapshot(food), servings: Number(servings) || 1 };
      day(key).meals[meal].push(entry);
      touchRecent(food);
      commit();
      return entry;
    },

    quickAdd(key, meal, { name, calories, carbs = 0, protein = 0, fat = 0 }) {
      return this.addFood(key, meal, { name: name || 'Quick add', serving: 'quick add', calories, carbs, protein, fat }, 1);
    },

    updateEntry(key, entryId, changes) {
      const found = findEntry(key, entryId);
      if (!found) return;
      const entry = found.list[found.idx];
      if (changes.servings !== undefined) entry.servings = Math.max(0, Number(changes.servings) || 0);
      if (changes.meal && changes.meal !== found.meal && MEALS.includes(changes.meal)) {
        found.list.splice(found.idx, 1);
        state.days[key].meals[changes.meal].push(entry);
      }
      commit();
    },

    removeEntry(key, entryId) {
      const found = findEntry(key, entryId);
      if (!found) return;
      found.list.splice(found.idx, 1);
      commit();
    },

    /** Copy all entries of a meal from one day onto another (MFP's "copy from yesterday"). */
    copyMeal(fromKey, toKey, meal) {
      const src = state.days[fromKey]?.meals[meal] ?? [];
      if (!src.length) return 0;
      const dst = day(toKey).meals[meal];
      for (const e of src) dst.push({ ...e, id: uid('e') });
      commit();
      return src.length;
    },

    addExercise(key, { name, minutes, calories }) {
      const item = { id: uid('x'), name, minutes: Number(minutes) || 0, calories: Math.round(Number(calories) || 0) };
      day(key).exercise.push(item);
      commit();
      return item;
    },

    removeExercise(key, id) {
      const d = state.days[key];
      if (!d) return;
      d.exercise = d.exercise.filter((x) => x.id !== id);
      commit();
    },

    setWater(key, ml) {
      day(key).waterMl = Math.max(0, Math.round(Number(ml) || 0));
      commit();
    },

    saveCustomFood(food) {
      const clean = { ...foodSnapshot(food), id: food.id || uid('custom'), source: 'custom', category: 'My Foods' };
      const i = state.customFoods.findIndex((f) => f.id === clean.id);
      if (i === -1) state.customFoods.push(clean); else state.customFoods[i] = clean;
      commit();
      return clean;
    },

    deleteCustomFood(id) {
      state.customFoods = state.customFoods.filter((f) => f.id !== id);
      commit();
    },

    setProfile(changes) {
      state.profile = { ...state.profile, ...changes };
      syncAutoCalories();
      commit();
    },

    setGoals(changes) {
      state.goals = { ...state.goals, ...changes };
      syncAutoCalories();
      commit();
    },

    completeOnboarding() {
      state.onboarded = true;
      commit();
    },

    logWeight(dateKey, kg) {
      const value = Math.round(Number(kg) * 10) / 10;
      if (!(value > 0)) return;
      state.weights = state.weights.filter((w) => w.date !== dateKey);
      state.weights.push({ date: dateKey, kg: value });
      state.weights.sort((a, b) => a.date.localeCompare(b.date));
      // The latest weigh-in becomes the current profile weight.
      const latest = state.weights[state.weights.length - 1];
      state.profile.weightKg = latest.kg;
      syncAutoCalories();
      commit();
    },

    removeWeight(dateKey) {
      state.weights = state.weights.filter((w) => w.date !== dateKey);
      commit();
    },

    exportJSON() { return JSON.stringify(state, null, 2); },

    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.days || !parsed.profile) {
        throw new Error('This file does not look like a Calorie Tracker backup.');
      }
      state = mergeState(parsed);
      commit();
    },

    reset() {
      state = defaultState();
      commit();
    },
  };
}
