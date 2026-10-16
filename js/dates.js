// Date helpers. Diary days are keyed by local calendar date "YYYY-MM-DD".

const pad = (n) => String(n).padStart(2, '0');

export function toKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function lastNDays(endKey, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endKey, -i));
  return out;
}

export function formatLong(key, todayKey = toKey()) {
  if (key === todayKey) return 'Today';
  if (key === addDays(todayKey, -1)) return 'Yesterday';
  if (key === addDays(todayKey, 1)) return 'Tomorrow';
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatShort(key) {
  return fromKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
