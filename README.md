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

Requires Node 18+ (run `npm install` once). `server.js` is a tiny static server that also proxies Open Food Facts
text search (`/api/search`), because that API doesn't send CORS headers to browsers.

You can also host the folder on any static host (GitHub Pages, Netlify, etc.).
On a static host, barcode lookup works directly. Online text search falls back to calling
Open Food Facts from the browser, which only works when their API allows it. The built-in
database and custom foods always work.

## iOS app / TestFlight

The `ios/` folder is a native Xcode project ([Capacitor](https://capacitorjs.com) 8) that
wraps the web app. Inside the app:

- Data is saved to a file in the app's private storage, so iOS can't purge it the way it
  can purge web storage.
- Online food search uses native HTTP, so it works without the proxy server.
- *Export backup* opens the iOS share sheet (save to Files, AirDrop, etc.).
- It has a proper app icon and launch screen, safe-area support for the notch and home
  indicator, and runs on iOS 15+ (iPhone and iPad).

After changing any web code, run `npm run ios:sync` to copy it into the iOS project.

You need an [Apple Developer Program](https://developer.apple.com/programs/) membership
and an app record in [App Store Connect](https://appstoreconnect.apple.com)
(*Apps → + → New App*) with the bundle ID `com.eigenlayerovich.calorietracker`, or your
own ID set in `capacitor.config.json` and in Xcode.

### Option A: from a Mac with Xcode 16+

```bash
npm install
npm run ios:sync
npm run ios:open        # opens ios/App/App.xcodeproj in Xcode
```

1. In Xcode, select the **App** target → *Signing & Capabilities* → pick your **Team**.
2. To try it first, choose a simulator or your iPhone and press ▶︎ Run.
3. Choose **Any iOS Device (arm64)** as the destination, then **Product → Archive**.
4. In the Organizer: **Distribute App → TestFlight & App Store → Distribute**.
5. After processing (~10–30 min) the build appears under *TestFlight* in App Store Connect.
   Add yourself as an internal tester and install it with the TestFlight app.

Increase the build number (*General → Identity → Build*) for every upload.

### Option B: no Mac, using GitHub Actions

`.github/workflows/ios-testflight.yml` builds on a GitHub macOS runner and uploads to
TestFlight. Signing is automatic (Apple manages the certificate). Set these repository
secrets (*Settings → Secrets and variables → Actions*):

| Secret | Where to find it |
| --- | --- |
| `APPLE_TEAM_ID` | developer.apple.com → Account → Membership details |
| `ASC_KEY_ID` | App Store Connect → Users and Access → Integrations → App Store Connect API → create a key with **Admin** access |
| `ASC_ISSUER_ID` | Shown at the top of that same page |
| `ASC_API_KEY_P8` | Full contents of the downloaded `AuthKey_XXXX.p8` file |

Then go to *Actions → iOS TestFlight → Run workflow*. The build number comes from the
workflow run number, so each run uploads a new build.

Internal testers (up to 100 people on your App Store Connect team) need no review.
External testers need a short Beta App Review first.

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
js/native.js          iOS integration (file storage, native HTTP, share sheet)
sw.js                 Service worker (offline, web only)
server.js             Dev server + search proxy
scripts/build.js      Copies the web app into www/ for Capacitor
scripts/ios-assets.cjs  Renders the iOS icon and splash images
capacitor.config.json Capacitor (iOS wrapper) config
ios/                  Xcode project
tests/                Unit tests
```

Calorie goals are estimates and not medical advice.
