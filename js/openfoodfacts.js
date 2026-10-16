// Online food search via the Open Food Facts public API (no key needed).

const BASE = 'https://world.openfoodfacts.org';
const SEARCH = 'https://search.openfoodfacts.org/search';

async function fetchJSON(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

let getJSON = fetchJSON;
let nativeTransport = false;

/** Swap the HTTP transport (the iOS app uses native HTTP, which isn't subject to CORS). */
export function setTransport(fn, { native = false } = {}) {
  getJSON = fn;
  nativeTransport = native;
}
const FIELDS = 'code,product_name,brands,serving_size,serving_quantity,nutriments';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round1 = (v) => Math.round(v * 10) / 10;

/** Convert an Open Food Facts product into our food shape, or null if unusable. */
export function mapProduct(p) {
  if (!p || !p.product_name) return null;
  const n = p.nutriments ?? {};
  const hasServing = n['energy-kcal_serving'] != null;
  const per100 = n['energy-kcal_100g'] != null;
  if (!hasServing && !per100) return null;

  const pick = (key) => {
    if (hasServing) return num(n[`${key}_serving`]);
    // Scale per-100 g values to the serving size when we know it.
    const grams = num(p.serving_quantity);
    const factor = grams > 0 ? grams / 100 : 1;
    return num(n[`${key}_100g`]) * factor;
  };
  const servingGrams = num(p.serving_quantity);
  const serving = hasServing || servingGrams > 0 ? (p.serving_size || `${servingGrams} g`) : '100 g';

  return {
    id: `off-${p.code}`,
    name: p.product_name.trim(),
    brand: (Array.isArray(p.brands) ? p.brands.join(',') : (p.brands ?? '')).split(',')[0].trim(),
    serving,
    calories: Math.round(pick('energy-kcal')),
    carbs: round1(pick('carbohydrates')),
    protein: round1(pick('proteins')),
    fat: round1(pick('fat')),
    fiber: round1(pick('fiber')),
    sugar: round1(pick('sugars')),
    // OFF stores sodium in grams.
    sodium: Math.round(pick('sodium') * 1000),
    source: 'openfoodfacts',
  };
}

/**
 * Full-text search. Open Food Facts' search endpoints don't reliably send CORS
 * headers. The iOS app calls them directly over native HTTP; in a browser we
 * first try the same-origin proxy in server.js (`npm start`), then the public
 * API directly (works on static hosts whenever OFF allows it).
 */
export async function searchOnline(query, { signal, pageSize = 25 } = {}) {
  const q = encodeURIComponent(query);
  const attempts = nativeTransport
    ? [`${SEARCH}?q=${q}&page_size=${pageSize}&fields=${FIELDS}`]
    : [
      `api/search?q=${q}&page_size=${pageSize}`,
      `${BASE}/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=${FIELDS}`,
    ];
  let lastError;
  for (const url of attempts) {
    try {
      const data = await getJSON(url, { signal });
      return (data.products ?? data.hits ?? []).map(mapProduct).filter(Boolean);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  throw lastError;
}

export async function lookupBarcode(code, { signal } = {}) {
  const clean = String(code).replace(/\D/g, '');
  if (!clean) throw new Error('Enter a numeric barcode.');
  let data;
  try {
    data = await getJSON(`${BASE}/api/v2/product/${clean}.json?fields=${FIELDS}`, { signal });
  } catch (err) {
    // OFF answers unknown barcodes with a 404.
    if (/\(404\)/.test(err.message)) return null;
    throw err;
  }
  if (data.status !== 1) return null;
  return mapProduct({ code: clean, ...data.product });
}
