# Calorie Tracker

A MyFitnessPal-style calorie and macro tracker that runs entirely in the browser.
No accounts, no build step, no dependencies. Your data stays on your device (localStorage).

## Features

- **Food diary**: Breakfast, Lunch, Dinner and Snacks, with a day-by-day navigator and
  the familiar *Goal − Food + Exercise = Remaining* summary.
- **Macro tracking**: carbs, protein and fat progress bars, plus fiber, sugar and sodium totals.
- **Food search**:
  - A built-in database of ~95 common foods (USDA-based values).
  - Online search of millions of packaged products via [Open Food Facts](https://world.openfoodfacts.org).
  - Barcode lookup by number.
  - Recent foods, and your own custom foods ("My Foods").
- **Quick add** calories/macros without picking a food.
- **Edit entries**: change servings, move an entry to another meal, or delete it.
- **Copy a meal from the previous day** in one click.
- **Exercise log** with calorie estimates from MET values and your body weight.
- **Water tracker** with 250 ml glasses.
- **Goals**: a personalised calorie goal from the Mifflin–St Jeor equation, your activity
  level and weekly target (lose/maintain/gain), with a safe minimum. Or set it manually.
  Adjustable macro split and water goal.
- **Progress**: logging streak, 7/30-day calorie chart against your goal, weight log and chart.
- Metric or imperial units, light and dark themes, mobile-friendly, installable (PWA) with offline support.
- **Export / import** a JSON backup, or erase everything.

## Running it

```bash
npm start          # http://localhost:8080
```

Requires Node 18+. `server.js` is a tiny static server that also proxies Open Food Facts
text search (`/api/search`), because that API doesn't send CORS headers to browsers.

You can also host the folder on any static host (GitHub Pages, Netlify, etc.).
On a static host, barcode lookup works directly. Online text search falls back to calling
Open Food Facts from the browser, which only works when their API allows it. The built-in
database and custom foods always work.

## Tests

```bash
npm test
```

Uses Node's built-in test runner to cover the nutrition math, the data store
(persistence, editing, copying meals, weights, import/export) and food search/mapping.

## Project layout

```
index.html            App shell
css/styles.css        Styles (light + dark)
js/app.js             UI: views, modals, event handling
js/store.js           State + persistence
js/nutrition.js       BMR/TDEE, goals, macro and exercise math
js/foods.js           Built-in food and exercise database, search
js/openfoodfacts.js   Online search and barcode lookup
js/charts.js          SVG bar and line charts
js/dates.js           Date helpers
sw.js                 Service worker (offline)
server.js             Dev server + search proxy
tests/                Unit tests
```

Calorie goals are estimates and not medical advice.
