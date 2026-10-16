// Renders the iOS app icon and splash images from the logo, using Playwright's Chromium.
// Usage: node scripts/ios-assets.cjs   (requires `playwright` installed globally or locally)
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')));
}

const BLUE = '#0b6bcb';
const mark = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <circle cx="32" cy="34" r="17" fill="none" stroke="#fff" stroke-width="5"/>
  <path d="M32 34 L32 21" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  <path d="M26 10h12" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`;

const assets = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets');
const jobs = [
  { file: 'AppIcon.appiconset/AppIcon-512@2x.png', size: 1024, markSize: 1024 },
  ...['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']
    .map((f) => ({ file: `Splash.imageset/${f}`, size: 2732, markSize: 520 })),
];

(async () => {
  const browser = await chromium.launch();
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.size, height: j.size } });
    await page.setContent(`<body style="margin:0;width:${j.size}px;height:${j.size}px;background:${BLUE};display:grid;place-items:center">${mark(j.markSize)}</body>`);
    await page.screenshot({ path: path.join(assets, j.file), omitBackground: false });
    await page.close();
    console.log('wrote', j.file);
  }
  await browser.close();
})();
