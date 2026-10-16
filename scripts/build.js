// Copies the web app into www/ (the folder Capacitor bundles into the iOS app).
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'www');
const files = ['index.html', 'icon.svg', 'apple-touch-icon.png', 'manifest.webmanifest', 'sw.js', 'css', 'js'];

await rm(out, { recursive: true, force: true });
await mkdir(out);
for (const f of files) await cp(join(root, f), join(out, f), { recursive: true });
// Capacitor's JS bridge, loaded by js/native.js only inside the iOS app.
await mkdir(join(out, 'vendor'));
await cp(join(root, 'node_modules/@capacitor/core/dist/index.js'), join(out, 'vendor/capacitor-core.js'));
console.log(`Built ${files.length} entries into www/`);
