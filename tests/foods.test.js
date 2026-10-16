import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOODS, searchFoods } from '../js/foods.js';
import { mapProduct } from '../js/openfoodfacts.js';

test('database entries are complete and roughly consistent', () => {
  for (const f of FOODS) {
    for (const k of ['calories', 'carbs', 'protein', 'fat', 'fiber', 'sugar', 'sodium']) {
      assert.equal(typeof f[k], 'number', `${f.name} ${k}`);
    }
    // Calories from macros (4/4/9) should be close to the label value.
    const fromMacros = f.carbs * 4 + f.protein * 4 + f.fat * 9;
    if (f.calories > 40 && !/beer|wine/i.test(f.name)) {
      assert.ok(Math.abs(fromMacros - f.calories) / f.calories < 0.25, `${f.name}: ${fromMacros} vs ${f.calories}`);
    }
  }
});

test('search ranks prefix matches first and needs all terms', () => {
  assert.equal(searchFoods(FOODS, 'banana')[0].name, 'Banana');
  assert.equal(searchFoods(FOODS, 'chicken breast')[0].name, 'Chicken breast, grilled');
  assert.equal(searchFoods(FOODS, 'zzzz').length, 0);
});

test('maps Open Food Facts products, scaling per-100g to the serving', () => {
  const f = mapProduct({
    code: '123', product_name: 'Choco Spread', brands: 'Acme, Other', serving_size: '15 g', serving_quantity: 15,
    nutriments: { 'energy-kcal_100g': 540, carbohydrates_100g: 57, proteins_100g: 6, fat_100g: 30, sodium_100g: 0.04 },
  });
  assert.equal(f.brand, 'Acme');
  assert.equal(f.serving, '15 g');
  assert.equal(f.calories, 81);
  assert.equal(f.fat, 4.5);
  assert.equal(f.sodium, 6);
  assert.equal(mapProduct({ product_name: 'z', brands: ['Brand A'], nutriments: { 'energy-kcal_100g': 1 } }).brand, 'Brand A');
  assert.equal(mapProduct({ product_name: 'x', nutriments: {} }), null);
  assert.equal(mapProduct({ product_name: 'y', nutriments: { 'energy-kcal_100g': 100 } }).serving, '100 g');
});
