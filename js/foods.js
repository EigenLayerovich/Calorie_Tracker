// Built-in food database. Values are per listed serving, based on USDA
// FoodData Central averages. Sodium in mg, everything else in grams/kcal.

// [name, serving, calories, carbs, protein, fat, fiber, sugar, sodium, category]
const RAW = [
  // Fruit
  ['Apple', '1 medium (182 g)', 95, 25, 0.5, 0.3, 4.4, 19, 2, 'Fruit'],
  ['Banana', '1 medium (118 g)', 105, 27, 1.3, 0.4, 3.1, 14, 1, 'Fruit'],
  ['Orange', '1 medium (131 g)', 62, 15, 1.2, 0.2, 3.1, 12, 0, 'Fruit'],
  ['Strawberries', '1 cup (152 g)', 49, 12, 1, 0.5, 3, 7, 2, 'Fruit'],
  ['Blueberries', '1 cup (148 g)', 84, 21, 1.1, 0.5, 3.6, 15, 1, 'Fruit'],
  ['Grapes', '1 cup (151 g)', 104, 27, 1.1, 0.2, 1.4, 23, 3, 'Fruit'],
  ['Avocado', '1/2 fruit (100 g)', 160, 9, 2, 15, 7, 0.7, 7, 'Fruit'],
  ['Watermelon', '1 cup diced (152 g)', 46, 12, 0.9, 0.2, 0.6, 9, 2, 'Fruit'],
  ['Pear', '1 medium (178 g)', 101, 27, 0.6, 0.2, 5.5, 17, 2, 'Fruit'],
  ['Pineapple', '1 cup chunks (165 g)', 82, 22, 0.9, 0.2, 2.3, 16, 2, 'Fruit'],
  ['Mango', '1 cup pieces (165 g)', 99, 25, 1.4, 0.6, 2.6, 23, 2, 'Fruit'],
  // Vegetables
  ['Broccoli, cooked', '1 cup (156 g)', 55, 11, 3.7, 0.6, 5.1, 2.2, 64, 'Vegetables'],
  ['Spinach, raw', '1 cup (30 g)', 7, 1.1, 0.9, 0.1, 0.7, 0.1, 24, 'Vegetables'],
  ['Carrot', '1 medium (61 g)', 25, 6, 0.6, 0.1, 1.7, 2.9, 42, 'Vegetables'],
  ['Tomato', '1 medium (123 g)', 22, 4.8, 1.1, 0.2, 1.5, 3.2, 6, 'Vegetables'],
  ['Cucumber', '1 cup sliced (104 g)', 16, 3.8, 0.7, 0.1, 0.5, 1.7, 2, 'Vegetables'],
  ['Potato, baked', '1 medium (173 g)', 161, 37, 4.3, 0.2, 3.8, 2, 17, 'Vegetables'],
  ['Sweet potato, baked', '1 medium (114 g)', 103, 24, 2.3, 0.2, 3.8, 7.4, 41, 'Vegetables'],
  ['Mixed salad greens', '2 cups (85 g)', 15, 2.9, 1.2, 0.2, 1.8, 0.4, 25, 'Vegetables'],
  ['Bell pepper, red', '1 medium (119 g)', 37, 7.2, 1.2, 0.4, 2.5, 5, 5, 'Vegetables'],
  ['Onion', '1 medium (110 g)', 44, 10, 1.2, 0.1, 1.9, 4.7, 4, 'Vegetables'],
  ['Corn, sweet', '1 ear (90 g)', 77, 17, 2.9, 1.1, 2.4, 5.8, 14, 'Vegetables'],
  ['Green beans, cooked', '1 cup (125 g)', 44, 10, 2.4, 0.4, 4, 4.5, 1, 'Vegetables'],
  // Grains & bread
  ['White rice, cooked', '1 cup (158 g)', 205, 45, 4.3, 0.4, 0.6, 0.1, 2, 'Grains'],
  ['Brown rice, cooked', '1 cup (195 g)', 216, 45, 5, 1.8, 3.5, 0.7, 10, 'Grains'],
  ['Pasta, cooked', '1 cup (140 g)', 221, 43, 8.1, 1.3, 2.5, 0.8, 1, 'Grains'],
  ['Oatmeal, cooked with water', '1 cup (234 g)', 166, 28, 5.9, 3.6, 4, 0.6, 9, 'Grains'],
  ['Rolled oats, dry', '1/2 cup (40 g)', 150, 27, 5, 2.5, 4, 1, 0, 'Grains'],
  ['Whole wheat bread', '1 slice (32 g)', 81, 14, 4, 1.1, 1.9, 1.4, 146, 'Grains'],
  ['White bread', '1 slice (25 g)', 67, 13, 1.9, 0.8, 0.6, 1.4, 127, 'Grains'],
  ['Bagel, plain', '1 medium (105 g)', 277, 55, 11, 1.4, 2.4, 5.5, 443, 'Grains'],
  ['Flour tortilla', '1 medium (45 g)', 138, 23, 3.7, 3.6, 1.6, 0.8, 331, 'Grains'],
  ['Quinoa, cooked', '1 cup (185 g)', 222, 39, 8.1, 3.6, 5.2, 1.6, 13, 'Grains'],
  ['Corn flakes cereal', '1 cup (28 g)', 100, 24, 2, 0, 1, 3, 200, 'Grains'],
  ['Granola', '1/2 cup (61 g)', 290, 32, 8, 15, 5, 12, 15, 'Grains'],
  // Protein
  ['Chicken breast, grilled', '100 g', 165, 0, 31, 3.6, 0, 0, 74, 'Protein'],
  ['Chicken thigh, roasted', '100 g', 209, 0, 26, 11, 0, 0, 95, 'Protein'],
  ['Ground beef 85% lean, cooked', '100 g', 250, 0, 26, 15, 0, 0, 72, 'Protein'],
  ['Steak, sirloin, grilled', '100 g', 206, 0, 30, 9, 0, 0, 60, 'Protein'],
  ['Salmon, baked', '100 g', 206, 0, 22, 12, 0, 0, 61, 'Protein'],
  ['Tuna, canned in water', '1 can drained (142 g)', 179, 0, 39, 1.3, 0, 0, 338, 'Protein'],
  ['Shrimp, cooked', '100 g', 99, 0.2, 24, 0.3, 0, 0, 111, 'Protein'],
  ['Pork chop, cooked', '100 g', 231, 0, 26, 14, 0, 0, 62, 'Protein'],
  ['Turkey breast, deli', '2 oz (56 g)', 60, 2, 10, 1, 0, 1, 500, 'Protein'],
  ['Bacon', '2 slices (16 g)', 86, 0.2, 6, 6.7, 0, 0, 382, 'Protein'],
  ['Egg, large', '1 egg (50 g)', 72, 0.4, 6.3, 4.8, 0, 0.2, 71, 'Protein'],
  ['Egg whites', '3 large (99 g)', 51, 0.7, 11, 0.2, 0, 0.7, 164, 'Protein'],
  ['Tofu, firm', '100 g', 144, 2.8, 17, 8.7, 2.3, 0.6, 14, 'Protein'],
  ['Black beans, cooked', '1 cup (172 g)', 227, 41, 15, 0.9, 15, 0.6, 2, 'Protein'],
  ['Lentils, cooked', '1 cup (198 g)', 230, 40, 18, 0.8, 16, 3.6, 4, 'Protein'],
  ['Chickpeas, cooked', '1 cup (164 g)', 269, 45, 15, 4.2, 12, 7.9, 11, 'Protein'],
  ['Whey protein powder', '1 scoop (30 g)', 120, 3, 24, 1.5, 0, 2, 50, 'Protein'],
  // Dairy
  ['Milk, 2%', '1 cup (244 g)', 122, 12, 8.1, 4.8, 0, 12, 115, 'Dairy'],
  ['Milk, whole', '1 cup (244 g)', 149, 12, 7.7, 7.9, 0, 12, 105, 'Dairy'],
  ['Milk, skim', '1 cup (245 g)', 83, 12, 8.3, 0.2, 0, 12, 103, 'Dairy'],
  ['Almond milk, unsweetened', '1 cup (240 g)', 39, 3.4, 1, 2.5, 0.5, 0, 189, 'Dairy'],
  ['Greek yogurt, plain nonfat', '170 g container', 100, 6, 17, 0.7, 0, 5.5, 61, 'Dairy'],
  ['Yogurt, flavored low-fat', '170 g container', 150, 25, 6, 2, 0, 22, 90, 'Dairy'],
  ['Cheddar cheese', '1 oz (28 g)', 114, 0.4, 7, 9.4, 0, 0.1, 176, 'Dairy'],
  ['Mozzarella, part-skim', '1 oz (28 g)', 72, 0.8, 6.9, 4.5, 0, 0.3, 175, 'Dairy'],
  ['Cottage cheese, 2%', '1/2 cup (113 g)', 92, 5, 12, 2.6, 0, 4.6, 348, 'Dairy'],
  ['Butter', '1 tbsp (14 g)', 102, 0, 0.1, 12, 0, 0, 91, 'Dairy'],
  // Nuts, fats & spreads
  ['Almonds', '1 oz (28 g)', 164, 6.1, 6, 14, 3.5, 1.2, 0, 'Nuts & Fats'],
  ['Peanut butter', '2 tbsp (32 g)', 188, 6.9, 8, 16, 1.9, 3, 147, 'Nuts & Fats'],
  ['Walnuts', '1 oz (28 g)', 185, 3.9, 4.3, 18, 1.9, 0.7, 1, 'Nuts & Fats'],
  ['Olive oil', '1 tbsp (14 g)', 119, 0, 0, 14, 0, 0, 0, 'Nuts & Fats'],
  ['Mayonnaise', '1 tbsp (14 g)', 94, 0.1, 0.1, 10, 0, 0.1, 88, 'Nuts & Fats'],
  ['Hummus', '2 tbsp (30 g)', 70, 4, 2, 5, 1, 0, 130, 'Nuts & Fats'],
  // Meals & fast food
  ['Cheese pizza', '1 slice (107 g)', 285, 36, 12, 10, 2.5, 3.8, 640, 'Meals'],
  ['Hamburger', '1 sandwich (110 g)', 254, 30, 13, 9.3, 1.2, 6, 500, 'Meals'],
  ['French fries', 'medium (117 g)', 365, 48, 4, 17, 4.4, 0.3, 246, 'Meals'],
  ['Caesar salad with chicken', '1 bowl (250 g)', 390, 12, 30, 25, 3, 3, 900, 'Meals'],
  ['Burrito, bean & cheese', '1 burrito (200 g)', 380, 52, 15, 12, 8, 3, 950, 'Meals'],
  ['Spaghetti with meat sauce', '1 cup (250 g)', 330, 40, 17, 11, 4, 8, 680, 'Meals'],
  ['Chicken noodle soup', '1 cup (240 g)', 62, 7.3, 3.2, 2.4, 0.5, 0.7, 640, 'Meals'],
  ['Sushi roll, California', '6 pieces (165 g)', 255, 38, 9, 7, 3.5, 6, 430, 'Meals'],
  ['Turkey sandwich', '1 sandwich (200 g)', 320, 37, 22, 9, 4, 5, 1100, 'Meals'],
  // Snacks & sweets
  ['Potato chips', '1 oz (28 g)', 152, 15, 2, 9.8, 1.2, 0.1, 148, 'Snacks'],
  ['Popcorn, air-popped', '3 cups (24 g)', 93, 19, 3, 1.1, 3.6, 0.2, 2, 'Snacks'],
  ['Dark chocolate 70%', '1 oz (28 g)', 170, 13, 2.2, 12, 3.1, 6.8, 6, 'Snacks'],
  ['Chocolate chip cookie', '1 cookie (30 g)', 148, 19, 1.5, 7.4, 0.6, 11, 102, 'Snacks'],
  ['Ice cream, vanilla', '1/2 cup (66 g)', 137, 16, 2.3, 7.3, 0.5, 14, 53, 'Snacks'],
  ['Protein bar', '1 bar (60 g)', 210, 23, 20, 7, 3, 6, 200, 'Snacks'],
  ['Granola bar', '1 bar (42 g)', 190, 29, 4, 7, 2, 12, 150, 'Snacks'],
  ['Pretzels', '1 oz (28 g)', 108, 22.5, 2.9, 0.8, 0.9, 0.8, 385, 'Snacks'],
  // Drinks
  ['Coffee, black', '1 cup (240 g)', 2, 0, 0.3, 0, 0, 0, 5, 'Drinks'],
  ['Latte with 2% milk', '16 fl oz (grande)', 190, 19, 13, 7, 0, 17, 170, 'Drinks'],
  ['Orange juice', '1 cup (248 g)', 112, 26, 1.7, 0.5, 0.5, 21, 2, 'Drinks'],
  ['Cola', '1 can (355 ml)', 140, 39, 0, 0, 0, 39, 45, 'Drinks'],
  ['Beer, regular', '12 fl oz (355 ml)', 153, 13, 1.6, 0, 0, 0, 14, 'Drinks'],
  ['Red wine', '5 fl oz (148 ml)', 125, 3.8, 0.1, 0, 0, 0.9, 6, 'Drinks'],
  ['Sports drink', '20 fl oz (591 ml)', 140, 36, 0, 0, 0, 34, 270, 'Drinks'],
];

export const FOODS = RAW.map(
  ([name, serving, calories, carbs, protein, fat, fiber, sugar, sodium, category], i) => ({
    id: `db-${i}`,
    name, brand: '', serving, category,
    calories, carbs, protein, fat, fiber, sugar, sodium,
    source: 'database',
  }),
);

// Common activities with MET values (Compendium of Physical Activities).
export const EXERCISES = [
  { name: 'Walking, moderate pace', met: 3.5 },
  { name: 'Walking, brisk', met: 4.3 },
  { name: 'Hiking', met: 6 },
  { name: 'Running, 10 km/h (6 mph)', met: 9.8 },
  { name: 'Running, 12 km/h (7.5 mph)', met: 11.8 },
  { name: 'Cycling, moderate', met: 8 },
  { name: 'Cycling, leisurely', met: 4 },
  { name: 'Stationary bike, moderate', met: 6.8 },
  { name: 'Swimming, laps moderate', met: 5.8 },
  { name: 'Elliptical trainer', met: 5 },
  { name: 'Rowing machine, moderate', met: 7 },
  { name: 'Weight lifting, general', met: 3.5 },
  { name: 'Weight lifting, vigorous', met: 6 },
  { name: 'HIIT / circuit training', met: 8 },
  { name: 'Yoga', met: 2.5 },
  { name: 'Pilates', met: 3 },
  { name: 'Dancing', met: 5 },
  { name: 'Jump rope', met: 11 },
  { name: 'Basketball, game', met: 8 },
  { name: 'Soccer, casual', met: 7 },
  { name: 'Tennis, singles', met: 8 },
  { name: 'Stair climbing', met: 8.8 },
  { name: 'Gardening', met: 3.8 },
  { name: 'House cleaning', met: 3.3 },
];

/** Rank foods by how well their name matches the query. */
export function searchFoods(foods, query, limit = 50) {
  const q = query.trim().toLowerCase();
  if (!q) return foods.slice(0, limit);
  const terms = q.split(/\s+/);
  const scored = [];
  for (const f of foods) {
    const hay = `${f.name} ${f.brand ?? ''} ${f.category ?? ''}`.toLowerCase();
    if (!terms.every((t) => hay.includes(t))) continue;
    const name = f.name.toLowerCase();
    let score = 0;
    if (name === q) score += 100;
    if (name.startsWith(q)) score += 50;
    if (name.split(/[\s,]+/).some((w) => w.startsWith(terms[0]))) score += 20;
    score -= name.length / 100;
    scored.push({ f, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.f);
}
