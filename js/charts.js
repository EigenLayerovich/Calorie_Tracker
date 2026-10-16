// Tiny dependency-free SVG charts.

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

function niceRange(min, max) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step = 10 ** Math.floor(Math.log10(span / 4));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => span / s <= 5) ?? step * 10;
  return { lo: Math.floor(min / nice) * nice, hi: Math.ceil(max / nice) * nice, step: nice };
}

function axes(lo, hi, step, y, labels, x) {
  let out = '';
  for (let v = lo; v <= hi + step / 2; v += step) {
    const yy = y(v);
    out += `<line class="grid" x1="${PAD.left}" x2="${W - PAD.right}" y1="${yy}" y2="${yy}"/>`;
    out += `<text class="tick" x="${PAD.left - 6}" y="${yy + 4}" text-anchor="end">${Math.round(v * 10) / 10}</text>`;
  }
  const every = Math.ceil(labels.length / 8);
  labels.forEach((l, i) => {
    if (i % every === 0 || i === labels.length - 1) {
      out += `<text class="tick" x="${x(i)}" y="${H - 8}" text-anchor="middle">${l}</text>`;
    }
  });
  return out;
}

/** Line chart for a series like weight. points: [{label, value}] */
export function lineChart(points, { unit = '' } = {}) {
  if (points.length === 0) return '<p class="empty">No data yet.</p>';
  const vals = points.map((p) => p.value);
  const { lo, hi, step } = niceRange(Math.min(...vals), Math.max(...vals));
  const innerW = W - PAD.left - PAD.right;
  const x = (i) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const dots = points.map((p, i) => `<circle class="dot" cx="${x(i)}" cy="${y(p.value)}" r="4"><title>${p.label}: ${p.value} ${unit}</title></circle>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart">
    ${axes(lo, hi, step, y, points.map((p) => p.label), x)}
    <path class="line" d="${path}"/>${dots}
  </svg>`;
}

/** Bar chart with an optional goal line. bars: [{label, value}] */
export function barChart(bars, { goal = null, unit = '' } = {}) {
  const max = Math.max(goal ?? 0, ...bars.map((b) => b.value), 1);
  const { hi, step } = niceRange(0, max);
  const innerW = W - PAD.left - PAD.right;
  const slot = innerW / bars.length;
  const x = (i) => PAD.left + slot * i + slot / 2;
  const y = (v) => PAD.top + (1 - v / hi) * (H - PAD.top - PAD.bottom);
  const bw = Math.max(4, slot * 0.6);
  const rects = bars.map((b, i) => {
    const over = goal != null && b.value > goal;
    return `<rect class="bar${over ? ' over' : ''}" x="${x(i) - bw / 2}" y="${y(b.value)}" width="${bw}" height="${y(0) - y(b.value)}" rx="3"><title>${b.label}: ${Math.round(b.value)} ${unit}</title></rect>`;
  }).join('');
  const goalLine = goal != null
    ? `<line class="goal" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(goal)}" y2="${y(goal)}"/><text class="tick goal-label" x="${W - PAD.right}" y="${y(goal) - 5}" text-anchor="end">Goal ${Math.round(goal)}</text>`
    : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">
    ${axes(0, hi, step, y, bars.map((b) => b.label), x)}${rects}${goalLine}
  </svg>`;
}
