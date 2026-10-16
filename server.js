// Minimal static file server for local development: `npm start`.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT) || 8080;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

const SEARCH_FIELDS = 'code,product_name,brands,serving_size,serving_quantity,nutriments';

// Proxy for Open Food Facts text search, which browsers can't call directly (no CORS headers).
async function proxySearch(url, res) {
  const q = url.searchParams.get('q') ?? '';
  const size = Math.min(50, Number(url.searchParams.get('page_size')) || 25);
  try {
    const upstream = await fetch(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=${size}&fields=${SEARCH_FIELDS}`,
      { headers: { 'User-Agent': 'CalorieTracker/1.0 (self-hosted)' }, signal: AbortSignal.timeout(15000) },
    );
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const data = await upstream.json();
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ products: data.hits ?? [] }));
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: String(err.message || err) }));
  }
}

createServer(async (req, res) => {
  const reqUrl = new URL(req.url, 'http://x');
  if (reqUrl.pathname === '/api/search') { await proxySearch(reqUrl, res); return; }
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, path.endsWith('/') ? `${path}index.html` : path);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`Calorie Tracker running at http://localhost:${port}`));
