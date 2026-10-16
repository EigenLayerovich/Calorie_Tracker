import { createStore, MEALS, MEAL_LABELS } from './store.js';
import { FOODS, EXERCISES, searchFoods } from './foods.js';
import { searchOnline, lookupBarcode } from './openfoodfacts.js';
import { lineChart, barChart } from './charts.js';
import { toKey, addDays, formatLong, formatShort, lastNDays } from './dates.js';
import {
  ACTIVITY_LEVELS, WEEKLY_GOALS, calcBMR, calcTDEE, calcCalorieGoal, calcMacroGoals,
  dayTotals, entryNutrients, exerciseCalories, remainingCalories,
  kgToLb, lbToKg, cmToIn, inToCm,
} from './nutrition.js';
import { isNative, createPlatformStorage, setupNetworking, saveFile } from './native.js';

await setupNetworking();
const store = createStore(await createPlatformStorage());
const ui = { view: 'diary', date: toKey() };
const $ = (sel, root = document) => root.querySelector(sel);
const main = $('#main');
const dialog = $('#modal');

// ---------- helpers ----------

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const fmt = (n, d = 0) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
const round1 = (n) => Math.round(n * 10) / 10;
const metric = () => store.state.profile.units !== 'imperial';
const weightUnit = () => (metric() ? 'kg' : 'lb');
const showWeight = (kg) => (metric() ? kg : kgToLb(kg));
const readWeight = (v) => (metric() ? Number(v) : lbToKg(Number(v)));

function macroGoals() {
  const g = store.state.goals;
  return calcMacroGoals(g.calories, g);
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
}

function openModal(html, mount) {
  dialog.innerHTML = `<div class="modal-inner">${html}</div>`;
  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
  if (!dialog.open) dialog.showModal();
  mount?.(dialog);
}

dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

function bar(value, goal, cls = '') {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const over = goal > 0 && value > goal;
  return `<div class="bar-track"><div class="bar-fill ${cls}${over ? ' over' : ''}" style="width:${pct}%"></div></div>`;
}

// ---------- navigation ----------

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => { ui.view = btn.dataset.view; render(); });
});

function render() {
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
  const views = { diary: renderDiary, progress: renderProgress, foods: renderFoods, goals: renderGoals };
  (views[ui.view] ?? renderDiary)();
}

store.subscribe(render);

// ---------- diary ----------

function renderDiary() {
  const key = ui.date;
  const day = store.getDay(key);
  const goals = store.state.goals;
  const mg = macroGoals();
  const { food, exercise } = dayTotals(day);
  const remaining = remainingCalories(goals.calories, food.calories, exercise);
  const yesterday = store.getDay(addDays(key, -1));

  const mealHtml = MEALS.map((meal) => {
    const entries = day.meals[meal];
    const total = entries.reduce((s, e) => s + entryNutrients(e).calories, 0);
    const canCopy = yesterday.meals[meal].length > 0;
    return `<section class="card meal">
      <header class="meal-head">
        <h3>${MEAL_LABELS[meal]}</h3>
        <span class="kcal">${fmt(total)} kcal</span>
      </header>
      ${entries.length ? `<ul class="entries">${entries.map((e) => {
        const n = entryNutrients(e);
        return `<li><button class="entry" data-edit="${e.id}">
          <span class="entry-main"><span class="entry-name">${esc(e.name)}</span>
          <span class="entry-sub">${e.brand ? `${esc(e.brand)}, ` : ''}${fmt(e.servings, 2)} × ${esc(e.serving)}</span></span>
          <span class="entry-kcal">${fmt(n.calories)}</span></button></li>`;
      }).join('')}</ul>` : ''}
      <footer class="meal-foot">
        <button class="link" data-add="${meal}">+ Add food</button>
        ${canCopy ? `<button class="link muted" data-copy="${meal}">Copy from previous day</button>` : ''}
        ${entries.length ? `<span class="macro-line">C ${fmt(sumKey(entries, 'carbs'))}g · P ${fmt(sumKey(entries, 'protein'))}g · F ${fmt(sumKey(entries, 'fat'))}g</span>` : ''}
      </footer>
    </section>`;
  }).join('');

  const glasses = Math.round(day.waterMl / 250);
  const glassGoal = Math.max(1, Math.round(goals.waterMl / 250));

  main.innerHTML = `
    <div class="date-nav">
      <button class="icon-btn" data-day="-1" aria-label="Previous day">‹</button>
      <div class="date-label">
        <strong>${esc(formatLong(key))}</strong>
        ${key !== toKey() ? '<button class="link small" data-day="today">Jump to today</button>' : ''}
      </div>
      <button class="icon-btn" data-day="1" aria-label="Next day">›</button>
    </div>

    <section class="card summary">
      <h2 class="card-title">Calories remaining</h2>
      <div class="equation">
        <div><strong>${fmt(goals.calories)}</strong><span>Goal</span></div>
        <div class="op">−</div>
        <div><strong>${fmt(food.calories)}</strong><span>Food</span></div>
        <div class="op">+</div>
        <div><strong>${fmt(exercise)}</strong><span>Exercise</span></div>
        <div class="op">=</div>
        <div class="remaining ${remaining < 0 ? 'neg' : ''}"><strong>${fmt(remaining)}</strong><span>Remaining</span></div>
      </div>
      ${bar(food.calories, goals.calories + exercise)}
      <div class="macros">
        ${[['carbs', 'Carbs'], ['protein', 'Protein'], ['fat', 'Fat']].map(([k, label]) => `
          <div class="macro">
            <div class="macro-head"><span>${label}</span><span>${fmt(food[k])} / ${fmt(mg[k])} g</span></div>
            ${bar(food[k], mg[k], k)}
          </div>`).join('')}
      </div>
    </section>

    ${mealHtml}

    <section class="card">
      <header class="meal-head"><h3>Exercise</h3><span class="kcal">${fmt(exercise)} kcal</span></header>
      ${day.exercise.length ? `<ul class="entries">${day.exercise.map((x) => `
        <li><div class="entry static">
          <span class="entry-main"><span class="entry-name">${esc(x.name)}</span>
          <span class="entry-sub">${fmt(x.minutes)} minutes</span></span>
          <span class="entry-kcal">${fmt(x.calories)}</span>
          <button class="icon-btn small" data-del-ex="${x.id}" aria-label="Remove exercise">✕</button>
        </div></li>`).join('')}</ul>` : ''}
      <footer class="meal-foot"><button class="link" data-add-ex>+ Add exercise</button></footer>
    </section>

    <section class="card">
      <header class="meal-head"><h3>Water</h3><span class="kcal">${fmt(day.waterMl)} / ${fmt(goals.waterMl)} ml</span></header>
      <div class="water">
        <button class="icon-btn" data-water="-250" aria-label="Remove a glass">−</button>
        <div class="glasses">${Array.from({ length: Math.max(glassGoal, glasses) }, (_, i) => `<span class="glass ${i < glasses ? 'full' : ''}"></span>`).join('')}</div>
        <button class="icon-btn" data-water="250" aria-label="Add a glass">+</button>
      </div>
      <p class="hint">Each glass is 250 ml.</p>
    </section>

    <section class="card">
      <h3>Nutrition details</h3>
      <table class="nutrition">
        <tr><th>Nutrient</th><th>Total</th><th>Goal</th><th>Left</th></tr>
        ${[['Calories', food.calories, goals.calories, 'kcal'], ['Carbohydrates', food.carbs, mg.carbs, 'g'],
    ['Protein', food.protein, mg.protein, 'g'], ['Fat', food.fat, mg.fat, 'g'],
    ['Fiber', food.fiber, 28, 'g'], ['Sugar', food.sugar, 50, 'g'], ['Sodium', food.sodium, 2300, 'mg']]
    .map(([label, v, g, u]) => `<tr><td>${label}</td><td>${fmt(v)} ${u}</td><td>${fmt(g)} ${u}</td><td class="${g - v < 0 ? 'neg' : ''}">${fmt(g - v)} ${u}</td></tr>`).join('')}
      </table>
      <p class="hint">Fiber, sugar and sodium use general daily reference values.</p>
    </section>`;

  main.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => {
    ui.date = b.dataset.day === 'today' ? toKey() : addDays(ui.date, Number(b.dataset.day));
    render();
  }));
  main.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => openAddFood(b.dataset.add)));
  main.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEditEntry(b.dataset.edit)));
  main.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    const n = store.copyMeal(addDays(key, -1), key, b.dataset.copy);
    toast(`Copied ${n} item${n === 1 ? '' : 's'} to ${MEAL_LABELS[b.dataset.copy]}`);
  }));
  main.querySelector('[data-add-ex]').addEventListener('click', openAddExercise);
  main.querySelectorAll('[data-del-ex]').forEach((b) => b.addEventListener('click', () => store.removeExercise(key, b.dataset.delEx)));
  main.querySelectorAll('[data-water]').forEach((b) => b.addEventListener('click', () => store.setWater(key, day.waterMl + Number(b.dataset.water))));
}

function sumKey(entries, k) {
  return entries.reduce((s, e) => s + entryNutrients(e)[k], 0);
}

// ---------- add food modal ----------

function allLocalFoods() {
  return [...store.state.customFoods, ...FOODS];
}

function nutritionPreview(food, servings) {
  const n = entryNutrients({ ...food, servings });
  return `<div class="preview">
    <div class="preview-kcal"><strong>${fmt(n.calories)}</strong><span>kcal</span></div>
    <div><strong>${fmt(n.carbs, 1)} g</strong><span>Carbs</span></div>
    <div><strong>${fmt(n.protein, 1)} g</strong><span>Protein</span></div>
    <div><strong>${fmt(n.fat, 1)} g</strong><span>Fat</span></div>
  </div>
  <p class="hint">Fiber ${fmt(n.fiber, 1)} g · Sugar ${fmt(n.sugar, 1)} g · Sodium ${fmt(n.sodium)} mg</p>`;
}

function foodRow(f, i) {
  const tag = f.source === 'custom' ? '<span class="tag">My food</span>'
    : f.source === 'openfoodfacts' ? '<span class="tag online">Online</span>' : '';
  return `<li><button class="entry" data-pick="${i}">
    <span class="entry-main"><span class="entry-name">${esc(f.name)} ${tag}</span>
    <span class="entry-sub">${f.brand ? `${esc(f.brand)}, ` : ''}${esc(f.serving)}</span></span>
    <span class="entry-kcal">${fmt(f.calories)}</span></button></li>`;
}

function openAddFood(meal) {
  const st = { meal, tab: 'search', query: '', list: [], online: null, onlineError: '', loading: false, abort: null };

  const mealSelect = (id) => `<label>Meal<select id="${id}">${MEALS.map((m) => `<option value="${m}" ${m === st.meal ? 'selected' : ''}>${MEAL_LABELS[m]}</option>`).join('')}</select></label>`;

  function shell(body) {
    const tabs = [['search', 'Search'], ['barcode', 'Barcode'], ['quick', 'Quick add'], ['create', 'Create food']];
    openModal(`
      <header class="modal-head"><h2>Add to ${MEAL_LABELS[st.meal]}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></header>
      <nav class="subtabs">${tabs.map(([t, l]) => `<button data-tab="${t}" class="${st.tab === t ? 'active' : ''}">${l}</button>`).join('')}</nav>
      <div class="modal-body">${body}</div>`, (root) => {
      root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; show(); }));
    });
  }

  function show() {
    if (st.abort) st.abort.abort();
    ({ search: showSearch, barcode: showBarcode, quick: showQuick, create: showCreate })[st.tab]();
  }

  function showSearch() {
    shell(`
      <div class="search-row">
        <input id="q" type="search" placeholder="Search foods, e.g. banana, chicken breast" value="${esc(st.query)}" autocomplete="off">
        <button class="btn secondary" id="online">Search online</button>
      </div>
      <div id="results"></div>`);
    const q = $('#q', dialog);
    q.focus();
    q.addEventListener('input', () => { st.query = q.value; st.online = null; st.onlineError = ''; drawResults(); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') runOnline(); });
    $('#online', dialog).addEventListener('click', runOnline);
    drawResults();
  }

  async function runOnline() {
    const query = st.query.trim();
    if (!query) { toast('Type something to search for'); return; }
    st.abort?.abort();
    st.abort = new AbortController();
    st.loading = true; st.onlineError = '';
    drawResults();
    try {
      st.online = await searchOnline(query, { signal: st.abort.signal });
    } catch (err) {
      if (err.name === 'AbortError') return;
      st.onlineError = 'Online search is unavailable right now. Check your connection and try again.';
    } finally {
      st.loading = false;
    }
    drawResults();
  }

  function drawResults() {
    const box = $('#results', dialog);
    if (!box) return;
    const local = st.query.trim()
      ? searchFoods(allLocalFoods(), st.query, 40)
      : null;
    let html = '';
    st.list = [];
    const section = (title, foods) => {
      if (!foods.length) return '';
      const start = st.list.length;
      st.list.push(...foods);
      return `<h4 class="list-title">${title}</h4><ul class="entries">${foods.map((f, i) => foodRow(f, start + i)).join('')}</ul>`;
    };
    if (local === null) {
      html += section('Recent', store.state.recentFoods.slice(0, 10));
      html += section('My foods', store.state.customFoods);
      if (!st.list.length) html += '<p class="empty">Start typing to search the food database.</p>';
    } else {
      html += section('Food database', local);
      if (st.loading) html += '<p class="empty">Searching Open Food Facts…</p>';
      else if (st.onlineError) html += `<p class="empty error">${esc(st.onlineError)}</p>`;
      else if (st.online) html += st.online.length ? section('Open Food Facts', st.online) : '<p class="empty">No online results.</p>';
      if (!local.length && !st.online && !st.loading && !st.onlineError) {
        html += '<p class="empty">No matches in the built-in database. Try <b>Search online</b>, or create the food yourself.</p>';
      }
    }
    box.innerHTML = html;
    box.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => showDetail(st.list[Number(b.dataset.pick)])));
  }

  function showDetail(food) {
    shell(`
      <button class="link back" id="back">‹ Back</button>
      <h3 class="detail-name">${esc(food.name)}</h3>
      ${food.brand ? `<p class="hint">${esc(food.brand)}</p>` : ''}
      <div class="form-grid">
        <label>Number of servings<input id="servings" type="number" min="0" step="0.25" value="1" inputmode="decimal"></label>
        <label>Serving size<input value="${esc(food.serving)}" disabled></label>
        ${mealSelect('meal')}
      </div>
      <div id="preview">${nutritionPreview(food, 1)}</div>
      <div class="actions"><button class="btn" id="add">Add to diary</button></div>`);
    const servings = $('#servings', dialog);
    servings.select();
    servings.addEventListener('input', () => { $('#preview', dialog).innerHTML = nutritionPreview(food, Number(servings.value) || 0); });
    $('#back', dialog).addEventListener('click', show);
    $('#add', dialog).addEventListener('click', () => {
      const n = Number(servings.value);
      if (!(n > 0)) { toast('Enter a number of servings above zero'); return; }
      const m = $('#meal', dialog).value;
      store.addFood(ui.date, m, food, n);
      dialog.close();
      toast(`Added ${food.name} to ${MEAL_LABELS[m]}`);
    });
  }

  function showBarcode() {
    shell(`
      <p class="hint">Enter the number under the barcode on the package. Products are looked up in the Open Food Facts database.</p>
      <div class="search-row">
        <input id="code" inputmode="numeric" placeholder="e.g. 3017620422003" autocomplete="off">
        <button class="btn" id="lookup">Look up</button>
      </div>
      <div id="bc-status"></div>`);
    const input = $('#code', dialog);
    input.focus();
    const go = async () => {
      const status = $('#bc-status', dialog);
      status.innerHTML = '<p class="empty">Looking up…</p>';
      st.abort = new AbortController();
      try {
        const food = await lookupBarcode(input.value, { signal: st.abort.signal });
        if (food) showDetail(food);
        else status.innerHTML = '<p class="empty">Product not found. You can create it under <b>Create food</b>.</p>';
      } catch (err) {
        if (err.name !== 'AbortError') status.innerHTML = `<p class="empty error">${esc(err.message || 'Lookup failed.')}</p>`;
      }
    };
    $('#lookup', dialog).addEventListener('click', go);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }

  function showQuick() {
    shell(`
      <p class="hint">Log calories without looking up a food.</p>
      <form id="quick" class="form-grid">
        <label class="wide">Description (optional)<input name="name" placeholder="Quick add"></label>
        <label>Calories<input name="calories" type="number" min="0" required inputmode="numeric"></label>
        <label>Carbs (g)<input name="carbs" type="number" min="0" step="0.1"></label>
        <label>Protein (g)<input name="protein" type="number" min="0" step="0.1"></label>
        <label>Fat (g)<input name="fat" type="number" min="0" step="0.1"></label>
        ${mealSelect('qmeal')}
        <div class="actions wide"><button class="btn">Add</button></div>
      </form>`);
    const form = $('#quick', dialog);
    form.elements.calories.focus();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const m = $('#qmeal', dialog).value;
      store.quickAdd(ui.date, m, {
        name: f.name.trim(), calories: Number(f.calories), carbs: Number(f.carbs), protein: Number(f.protein), fat: Number(f.fat),
      });
      dialog.close();
      toast(`Added ${fmt(f.calories)} kcal to ${MEAL_LABELS[m]}`);
    });
  }

  function showCreate() {
    shell(`${foodForm()}<p class="hint">The food is saved to <b>My Foods</b> so you can reuse it.</p>`);
    bindFoodForm((food) => showDetail(food));
  }

  show();
}

function openEditEntry(entryId) {
  const day = store.getDay(ui.date);
  const meal = MEALS.find((m) => day.meals[m].some((e) => e.id === entryId));
  const entry = day.meals[meal].find((e) => e.id === entryId);
  openModal(`
    <header class="modal-head"><h2>Edit entry</h2><button class="icon-btn" data-close aria-label="Close">✕</button></header>
    <div class="modal-body">
      <h3 class="detail-name">${esc(entry.name)}</h3>
      <div class="form-grid">
        <label>Number of servings<input id="servings" type="number" min="0" step="0.25" value="${entry.servings}" inputmode="decimal"></label>
        <label>Serving size<input value="${esc(entry.serving)}" disabled></label>
        <label>Meal<select id="meal">${MEALS.map((m) => `<option value="${m}" ${m === meal ? 'selected' : ''}>${MEAL_LABELS[m]}</option>`).join('')}</select></label>
      </div>
      <div id="preview">${nutritionPreview(entry, entry.servings)}</div>
      <div class="actions">
        <button class="btn danger" id="del">Delete</button>
        <button class="btn" id="save">Save</button>
      </div>
    </div>`, (root) => {
    const servings = $('#servings', root);
    servings.addEventListener('input', () => { $('#preview', root).innerHTML = nutritionPreview(entry, Number(servings.value) || 0); });
    $('#save', root).addEventListener('click', () => {
      const n = Number(servings.value);
      if (!(n > 0)) { toast('Enter a number of servings above zero'); return; }
      store.updateEntry(ui.date, entryId, { servings: n, meal: $('#meal', root).value });
      dialog.close();
    });
    $('#del', root).addEventListener('click', () => {
      store.removeEntry(ui.date, entryId);
      dialog.close();
      toast(`Removed ${entry.name}`);
    });
  });
}

// ---------- exercise modal ----------

function openAddExercise() {
  const weight = store.state.profile.weightKg;
  openModal(`
    <header class="modal-head"><h2>Add exercise</h2><button class="icon-btn" data-close aria-label="Close">✕</button></header>
    <form id="ex" class="modal-body form-grid">
      <label class="wide">Activity<select name="activity">
        ${EXERCISES.map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join('')}
        <option value="custom">Other (enter calories)</option>
      </select></label>
      <label class="wide hidden" id="custom-name">Name<input name="name" placeholder="e.g. Rock climbing"></label>
      <label>Minutes<input name="minutes" type="number" min="1" value="30" required inputmode="numeric"></label>
      <label>Calories burned<input name="calories" type="number" min="0" required inputmode="numeric"></label>
      <p class="hint wide">Estimated from your weight (${fmt(showWeight(weight), 1)} ${weightUnit()}). You can override it.</p>
      <div class="actions wide"><button class="btn">Add exercise</button></div>
    </form>`, (root) => {
    const form = $('#ex', root);
    const { activity, minutes, calories } = form.elements;
    let touched = false;
    const estimate = () => {
      const custom = activity.value === 'custom';
      $('#custom-name', root).classList.toggle('hidden', !custom);
      if (!custom && !touched) calories.value = exerciseCalories(EXERCISES[activity.value].met, weight, Number(minutes.value) || 0);
    };
    activity.addEventListener('change', () => { touched = false; estimate(); });
    minutes.addEventListener('input', estimate);
    calories.addEventListener('input', () => { touched = true; });
    estimate();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const custom = activity.value === 'custom';
      const name = custom ? (form.elements.name.value.trim() || 'Exercise') : EXERCISES[activity.value].name;
      store.addExercise(ui.date, { name, minutes: minutes.value, calories: calories.value });
      dialog.close();
      toast(`Added ${name}`);
    });
  });
}

// ---------- custom food form (shared) ----------

function foodForm(food = {}) {
  const v = (k) => esc(food[k] ?? '');
  return `<form id="food-form" class="form-grid">
    <label class="wide">Name<input name="name" required value="${v('name')}" placeholder="e.g. Grandma's lasagna"></label>
    <label>Brand (optional)<input name="brand" value="${v('brand')}"></label>
    <label>Serving size<input name="serving" required value="${v('serving') || '1 serving'}"></label>
    <label>Calories<input name="calories" type="number" min="0" required value="${v('calories')}" inputmode="numeric"></label>
    <label>Carbs (g)<input name="carbs" type="number" min="0" step="0.1" value="${v('carbs')}"></label>
    <label>Protein (g)<input name="protein" type="number" min="0" step="0.1" value="${v('protein')}"></label>
    <label>Fat (g)<input name="fat" type="number" min="0" step="0.1" value="${v('fat')}"></label>
    <label>Fiber (g)<input name="fiber" type="number" min="0" step="0.1" value="${v('fiber')}"></label>
    <label>Sugar (g)<input name="sugar" type="number" min="0" step="0.1" value="${v('sugar')}"></label>
    <label>Sodium (mg)<input name="sodium" type="number" min="0" value="${v('sodium')}"></label>
    <input type="hidden" name="id" value="${v('id')}">
    <div class="actions wide"><button class="btn">Save food</button></div>
  </form>`;
}

function bindFoodForm(onSaved) {
  const form = $('#food-form', dialog);
  form.elements.name.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const saved = store.saveCustomFood({ ...f, name: f.name.trim(), brand: f.brand.trim(), serving: f.serving.trim() });
    toast(`Saved ${saved.name}`);
    onSaved(saved);
  });
}

// ---------- my foods ----------

function renderFoods() {
  const foods = store.state.customFoods;
  main.innerHTML = `
    <div class="view-head"><h2>My Foods</h2><button class="btn" id="new-food">+ Create food</button></div>
    <section class="card">
      ${foods.length ? `<ul class="entries">${foods.map((f) => `
        <li><div class="entry static">
          <span class="entry-main"><span class="entry-name">${esc(f.name)}</span>
          <span class="entry-sub">${f.brand ? `${esc(f.brand)}, ` : ''}${esc(f.serving)} · C ${fmt(f.carbs, 1)}g P ${fmt(f.protein, 1)}g F ${fmt(f.fat, 1)}g</span></span>
          <span class="entry-kcal">${fmt(f.calories)}</span>
          <button class="icon-btn small" data-edit-food="${f.id}" aria-label="Edit">✎</button>
          <button class="icon-btn small" data-del-food="${f.id}" aria-label="Delete">✕</button>
        </div></li>`).join('')}</ul>`
    : '<p class="empty">You haven\'t created any foods yet. Custom foods show up first when you search.</p>'}
    </section>
    <section class="card">
      <h3>Built-in database</h3>
      <p class="hint">${FOODS.length} common foods are included, plus millions of packaged products through online search and barcode lookup (Open Food Facts).</p>
    </section>`;
  const edit = (food) => openModal(`
    <header class="modal-head"><h2>${food ? 'Edit food' : 'Create food'}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></header>
    <div class="modal-body">${foodForm(food)}</div>`, () => bindFoodForm(() => dialog.close()));
  $('#new-food').addEventListener('click', () => edit());
  main.querySelectorAll('[data-edit-food]').forEach((b) => b.addEventListener('click', () => edit(foods.find((f) => f.id === b.dataset.editFood))));
  main.querySelectorAll('[data-del-food]').forEach((b) => b.addEventListener('click', () => {
    const f = foods.find((x) => x.id === b.dataset.delFood);
    if (confirm(`Delete "${f.name}"? Diary entries that used it are kept.`)) store.deleteCustomFood(f.id);
  }));
}

// ---------- progress ----------

function renderProgress() {
  const range = ui.range ?? 7;
  const today = toKey();
  const keys = lastNDays(today, range);
  const goal = store.state.goals.calories;
  const cals = keys.map((k) => ({ label: formatShort(k), value: dayTotals(store.getDay(k)).food.calories }));
  const logged = cals.filter((c) => c.value > 0);
  const avg = logged.length ? logged.reduce((s, c) => s + c.value, 0) / logged.length : 0;
  const weights = store.state.weights;
  const wPoints = weights.slice(-60).map((w) => ({ label: formatShort(w.date), value: Math.round(showWeight(w.kg) * 10) / 10 }));
  const change = weights.length > 1 ? showWeight(weights[weights.length - 1].kg - weights[0].kg) : 0;
  const streak = (() => {
    let n = 0;
    for (let k = today; ; k = addDays(k, -1)) {
      if (dayTotals(store.getDay(k)).food.calories > 0) n += 1; else break;
    }
    return n;
  })();

  main.innerHTML = `
    <div class="view-head"><h2>Progress</h2></div>
    <div class="stats">
      <div class="card stat"><strong>${streak}</strong><span>Day logging streak</span></div>
      <div class="card stat"><strong>${fmt(avg)}</strong><span>Avg kcal (logged days, ${range}d)</span></div>
      <div class="card stat"><strong>${weights.length ? fmt(showWeight(weights[weights.length - 1].kg), 1) : '—'}</strong><span>Current weight (${weightUnit()})</span></div>
      <div class="card stat"><strong>${weights.length > 1 ? `${change > 0 ? '+' : ''}${fmt(change, 1)}` : '—'}</strong><span>Total change (${weightUnit()})</span></div>
    </div>

    <section class="card">
      <header class="meal-head"><h3>Calories</h3>
        <div class="seg">${[7, 30].map((r) => `<button data-range="${r}" class="${r === range ? 'active' : ''}">${r} days</button>`).join('')}</div>
      </header>
      ${barChart(cals, { goal, unit: 'kcal' })}
    </section>

    <section class="card">
      <h3>Weight</h3>
      <form id="weigh" class="inline-form">
        <label>Date<input type="date" name="date" value="${today}" max="${today}" required></label>
        <label>Weight (${weightUnit()})<input type="number" name="weight" step="0.1" min="1" required inputmode="decimal" value="${round1(showWeight(store.state.profile.weightKg))}"></label>
        <button class="btn">Log weight</button>
      </form>
      ${lineChart(wPoints, { unit: weightUnit() })}
      ${weights.length ? `<ul class="entries compact">${[...weights].reverse().slice(0, 10).map((w) => `
        <li><div class="entry static"><span class="entry-main">${esc(formatLong(w.date))}</span>
        <span class="entry-kcal">${fmt(showWeight(w.kg), 1)} ${weightUnit()}</span>
        <button class="icon-btn small" data-del-w="${w.date}" aria-label="Remove weigh-in">✕</button></div></li>`).join('')}</ul>` : ''}
    </section>`;

  main.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => { ui.range = Number(b.dataset.range); render(); }));
  $('#weigh').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    store.logWeight(f.get('date'), readWeight(f.get('weight')));
    toast('Weight logged');
  });
  main.querySelectorAll('[data-del-w]').forEach((b) => b.addEventListener('click', () => store.removeWeight(b.dataset.delW)));
}

// ---------- goals & profile ----------

function renderGoals() {
  const { profile: p, goals: g, onboarded } = store.state;
  const imperial = !metric();
  const totalIn = cmToIn(p.heightCm);
  const bmr = calcBMR(p);
  const tdee = calcTDEE(p);
  const mg = macroGoals();

  main.innerHTML = `
    ${onboarded ? '' : `<section class="card welcome">
      <h2>Welcome to Calorie Tracker</h2>
      <p>Tell us a little about yourself and we'll work out a daily calorie goal. Everything is stored privately on this device.</p>
    </section>`}
    <div class="view-head"><h2>Goals &amp; profile</h2></div>
    <form id="profile" class="card form-grid">
      <h3 class="wide">About you</h3>
      <label>Units<select name="units">
        <option value="metric" ${!imperial ? 'selected' : ''}>Metric (kg, cm)</option>
        <option value="imperial" ${imperial ? 'selected' : ''}>Imperial (lb, ft/in)</option>
      </select></label>
      <label>Sex<select name="sex">
        <option value="female" ${p.sex === 'female' ? 'selected' : ''}>Female</option>
        <option value="male" ${p.sex === 'male' ? 'selected' : ''}>Male</option>
      </select></label>
      <label>Age<input name="age" type="number" min="13" max="110" required value="${p.age}"></label>
      ${imperial
    ? `<label>Height<span class="pair"><input name="ft" type="number" min="3" max="8" required value="${Math.floor(Math.round(totalIn) / 12)}"> ft
           <input name="in" type="number" min="0" max="11" required value="${Math.round(totalIn) % 12}"> in</span></label>`
    : `<label>Height (cm)<input name="heightCm" type="number" min="100" max="250" required value="${Math.round(p.heightCm)}"></label>`}
      <label>Weight (${weightUnit()})<input name="weight" type="number" step="0.1" min="25" required value="${round1(showWeight(p.weightKg))}"></label>
      <label class="wide">Activity level<select name="activity">
        ${Object.entries(ACTIVITY_LEVELS).map(([k, v]) => `<option value="${k}" ${p.activity === k ? 'selected' : ''}>${v.label}</option>`).join('')}
      </select></label>
      <label class="wide">Weekly goal<select name="weeklyGoalKg">
        ${WEEKLY_GOALS.map((w) => `<option value="${w.value}" ${Number(p.weeklyGoalKg) === w.value ? 'selected' : ''}>${w.label}</option>`).join('')}
      </select></label>
      <div class="actions wide"><button class="btn">${onboarded ? 'Save profile' : 'Save and start tracking'}</button></div>
    </form>

    <section class="card">
      <h3>Your numbers</h3>
      <div class="stats inner">
        <div class="stat"><strong>${fmt(bmr)}</strong><span>BMR (kcal at rest)</span></div>
        <div class="stat"><strong>${fmt(tdee)}</strong><span>Maintenance (TDEE)</span></div>
        <div class="stat"><strong>${fmt(calcCalorieGoal(p))}</strong><span>Recommended goal</span></div>
      </div>
      <p class="hint">Mifflin–St Jeor equation. Loss goals never go below 1,200 kcal (women) or 1,500 kcal (men). This is an estimate, not medical advice.</p>
    </section>

    <form id="goals" class="card form-grid">
      <h3 class="wide">Daily goals</h3>
      <label class="wide check"><input type="checkbox" name="autoCalories" ${g.autoCalories ? 'checked' : ''}> Use the recommended calorie goal</label>
      <label>Calories<input name="calories" type="number" min="800" max="10000" required value="${g.calories}" ${g.autoCalories ? 'disabled' : ''}></label>
      <label>Water (ml)<input name="waterMl" type="number" min="0" step="250" required value="${g.waterMl}"></label>
      <label>Carbs %<input name="carbsPct" type="number" min="0" max="100" required value="${g.carbsPct}"></label>
      <label>Protein %<input name="proteinPct" type="number" min="0" max="100" required value="${g.proteinPct}"></label>
      <label>Fat %<input name="fatPct" type="number" min="0" max="100" required value="${g.fatPct}"></label>
      <p class="hint wide" id="macro-sum">Currently ${fmt(mg.carbs)} g carbs · ${fmt(mg.protein)} g protein · ${fmt(mg.fat)} g fat</p>
      <div class="actions wide"><button class="btn">Save goals</button></div>
    </form>

    <section class="card">
      <h3>Your data</h3>
      <p class="hint">Data lives on this ${isNative ? 'device' : 'browser'} only. Export a backup to move it to another device.</p>
      <div class="actions left">
        <button class="btn secondary" id="export">Export backup</button>
        <label class="btn secondary file">Import backup<input type="file" id="import" accept="application/json,.json" hidden></label>
        <button class="btn danger" id="reset">Erase all data</button>
      </div>
    </section>`;

  const profileForm = $('#profile');
  profileForm.elements.units.addEventListener('change', (e) => {
    store.setProfile({ units: e.target.value });
  });
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(profileForm));
    const heightCm = imperial ? inToCm(Number(f.ft) * 12 + Number(f.in)) : Number(f.heightCm);
    const weightKg = Math.round(readWeight(f.weight) * 10) / 10;
    const weightChanged = Math.abs(weightKg - p.weightKg) >= 0.05;
    store.setProfile({
      sex: f.sex, age: Number(f.age), heightCm, weightKg,
      activity: f.activity, weeklyGoalKg: Number(f.weeklyGoalKg),
    });
    if (weightChanged || !store.state.weights.length) store.logWeight(toKey(), weightKg);
    if (!store.state.onboarded) {
      store.completeOnboarding();
      ui.view = 'diary';
      render();
      toast(`Your daily goal is ${fmt(store.state.goals.calories)} kcal`);
    } else {
      toast('Profile saved');
    }
  });

  const goalsForm = $('#goals');
  const { autoCalories, calories } = goalsForm.elements;
  autoCalories.addEventListener('change', () => {
    calories.disabled = autoCalories.checked;
    if (autoCalories.checked) calories.value = calcCalorieGoal(p);
  });
  goalsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const el = goalsForm.elements;
    const pct = ['carbsPct', 'proteinPct', 'fatPct'].map((k) => Number(el[k].value));
    const sum = pct.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      $('#macro-sum').innerHTML = `<span class="neg">Macro percentages add up to ${sum}%. They need to total 100%.</span>`;
      return;
    }
    store.setGoals({
      autoCalories: el.autoCalories.checked,
      calories: el.autoCalories.checked ? g.calories : Number(el.calories.value),
      waterMl: Number(el.waterMl.value),
      carbsPct: pct[0], proteinPct: pct[1], fatPct: pct[2],
    });
    toast('Goals saved');
  });

  $('#export').addEventListener('click', async () => {
    try {
      await saveFile(`calorie-tracker-backup-${toKey()}.json`, store.exportJSON());
    } catch (err) {
      if (!/cancel/i.test(err?.message ?? '')) toast('Could not export the backup');
    }
  });
  $('#import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      store.importJSON(await file.text());
      toast('Backup imported');
    } catch (err) {
      toast(err.message || 'Could not import that file');
    }
  });
  $('#reset').addEventListener('click', () => {
    if (confirm('Erase all diary entries, foods, weights and settings? This cannot be undone.')) {
      store.reset();
      toast('All data erased');
    }
  });
}

// ---------- boot ----------

if (!store.state.onboarded) ui.view = 'goals';
render();

if (isNative) document.documentElement.classList.add('native');

if (!isNative && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
