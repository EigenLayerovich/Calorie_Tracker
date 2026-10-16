// Native (iOS via Capacitor) integration. In a normal browser everything here
// falls back to web APIs, so the same code runs on both.

import { STORAGE_KEY } from './store.js';
import { setTransport } from './openfoodfacts.js';

export const isNative = Boolean(window.Capacitor?.isNativePlatform?.());

let cap = null;
async function capacitor() {
  // Only bundled into the iOS build (see scripts/build.js).
  if (!cap) cap = await import('../vendor/capacitor-core.js');
  return cap;
}

const DATA_FILE = 'calorie-tracker.json';

/**
 * Storage for the store. On iOS, WKWebView localStorage can be purged by the
 * system, so data is mirrored to a JSON file in the app's Data directory and
 * that file is the source of truth on launch.
 */
export async function createPlatformStorage() {
  const local = window.localStorage;
  if (!isNative) return local;

  const { registerPlugin } = await capacitor();
  const Filesystem = registerPlugin('Filesystem');
  const fileOpts = { path: DATA_FILE, directory: 'DATA', encoding: 'utf8' };

  try {
    const { data } = await Filesystem.readFile(fileOpts);
    if (data) local.setItem(STORAGE_KEY, data);
  } catch {
    // First launch: no file yet. Keep whatever localStorage has.
  }

  let pending = null;
  let timer = null;
  const flush = () => {
    clearTimeout(timer);
    if (pending === null) return;
    const data = pending;
    pending = null;
    Filesystem.writeFile({ ...fileOpts, data }).catch((err) => console.error('Saving data failed', err));
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  return {
    getItem: (k) => local.getItem(k),
    setItem(k, v) {
      try { local.setItem(k, v); } catch { /* quota; file still gets it */ }
      if (k !== STORAGE_KEY) return;
      pending = v;
      clearTimeout(timer);
      timer = setTimeout(flush, 400);
    },
  };
}

/** Use native HTTP on iOS: Open Food Facts search doesn't send CORS headers. */
export async function setupNetworking() {
  if (!isNative) return;
  const { CapacitorHttp } = await capacitor();
  setTransport(async (url, { signal } = {}) => {
    const res = await CapacitorHttp.get({ url, headers: { Accept: 'application/json' } });
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (res.status < 200 || res.status >= 300) throw new Error(`Request failed (${res.status})`);
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  }, { native: true });
}

/** Save a backup file: download in the browser, share sheet on iOS. */
export async function saveFile(filename, text) {
  if (isNative) {
    const { registerPlugin } = await capacitor();
    const Filesystem = registerPlugin('Filesystem');
    const Share = registerPlugin('Share');
    const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: 'CACHE', encoding: 'utf8' });
    await Share.share({ title: 'Calorie Tracker backup', files: [uri] });
    return;
  }
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
