// Pure nutrition math: energy needs, macro targets, totals.

export const KCAL_PER_KG_FAT = 7700;
export const KCAL_PER_GRAM = { carbs: 4, protein: 4, fat: 9 };

export const ACTIVITY_LEVELS = {
  sedentary: { label: 'Sedentary (little or no exercise)', factor: 1.2 },
  light: { label: 'Lightly active (1–3 days/week)', factor: 1.375 },
  moderate: { label: 'Moderately active (3–5 days/week)', factor: 1.55 },
  active: { label: 'Very active (6–7 days/week)', factor: 1.725 },
  extra: { label: 'Extra active (physical job + training)', factor: 1.9 },
};

// Weekly weight change in kg; negative = lose.
export const WEEKLY_GOALS = [
  { value: -1, label: 'Lose 1 kg (2 lb) per week' },
  { value: -0.75, label: 'Lose 0.75 kg (1.5 lb) per week' },
  { value: -0.5, label: 'Lose 0.5 kg (1 lb) per week' },
  { value: -0.25, label: 'Lose 0.25 kg (0.5 lb) per week' },
  { value: 0, label: 'Maintain weight' },
  { value: 0.25, label: 'Gain 0.25 kg (0.5 lb) per week' },
  { value: 0.5, label: 'Gain 0.5 kg (1 lb) per week' },
];

export const NUTRIENTS = ['calories', 'carbs', 'protein', 'fat', 'fiber', 'sugar', 'sodium'];

/** Basal metabolic rate, Mifflin–St Jeor equation (kcal/day). */
export function calcBMR({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'female' ? base - 161 : base + 5;
}

export function calcTDEE(profile) {
  const level = ACTIVITY_LEVELS[profile.activity] ?? ACTIVITY_LEVELS.sedentary;
  return calcBMR(profile) * level.factor;
}

/** Daily calorie goal from profile, with a safety floor for weight loss. */
export function calcCalorieGoal(profile) {
  const tdee = calcTDEE(profile);
  const delta = ((profile.weeklyGoalKg ?? 0) * KCAL_PER_KG_FAT) / 7;
  const floor = profile.sex === 'female' ? 1200 : 1500;
  let goal = tdee + delta;
  if (delta < 0) goal = Math.max(goal, Math.min(floor, tdee));
  return Math.round(goal / 10) * 10;
}

/** Macro gram targets from calories and percentage split. */
export function calcMacroGoals(calories, { carbsPct, proteinPct, fatPct }) {
  return {
    carbs: Math.round((calories * carbsPct) / 100 / KCAL_PER_GRAM.carbs),
    protein: Math.round((calories * proteinPct) / 100 / KCAL_PER_GRAM.protein),
    fat: Math.round((calories * fatPct) / 100 / KCAL_PER_GRAM.fat),
  };
}

/** Nutrients for one diary entry (per-serving values × servings). */
export function entryNutrients(entry) {
  const out = {};
  for (const k of NUTRIENTS) out[k] = (Number(entry[k]) || 0) * (Number(entry.servings) || 0);
  return out;
}

export function sumEntries(entries) {
  const total = Object.fromEntries(NUTRIENTS.map((k) => [k, 0]));
  for (const e of entries) {
    const n = entryNutrients(e);
    for (const k of NUTRIENTS) total[k] += n[k];
  }
  return total;
}

/** Calories burned for an activity: MET × body weight (kg) × hours. */
export function exerciseCalories(met, weightKg, minutes) {
  return Math.round(met * weightKg * (minutes / 60));
}

export function dayTotals(day) {
  const meals = day?.meals ?? {};
  const food = sumEntries(Object.values(meals).flat());
  const exercise = (day?.exercise ?? []).reduce((s, x) => s + (Number(x.calories) || 0), 0);
  return { food, exercise };
}

/** MyFitnessPal-style "Goal − Food + Exercise = Remaining". */
export function remainingCalories(goal, foodCalories, exerciseCalories) {
  return Math.round(goal - foodCalories + exerciseCalories);
}

export const kgToLb = (kg) => kg * 2.20462;
export const lbToKg = (lb) => lb / 2.20462;
export const cmToIn = (cm) => cm / 2.54;
export const inToCm = (inch) => inch * 2.54;
