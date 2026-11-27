// Takes the cards' pictures of the world's models and saves them in public/thumbs.
// Needs the dev server:  npx vite --port 5199   then   node tools/make-thumbs.mjs
// Run it again whenever a look in src/world/looks.ts changes (tests/ui/thumbs.test.ts says when one is missing).
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.WORLD_URL || 'http://localhost:5199';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'thumbs');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
page.on('pageerror', (e) => console.error('page error:', String(e)));
await page.goto(`${BASE}/tools/thumbs.html?quiet`);
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const names = await page.evaluate(() => window.__names);
for (const name of names) {
  const url = await page.evaluate((n) => window.__thumb(n), name);
  if (!url.startsWith('data:image/webp')) throw new Error(`${name}: the browser did not give a webp picture`);
  writeFileSync(join(out, `${name}.webp`), Buffer.from(url.split(',')[1], 'base64'));
}
// Pictures nothing asks for any more go.
for (const f of readdirSync(out)) if (f.endsWith('.webp') && !names.includes(f.slice(0, -5))) rmSync(join(out, f));
await browser.close();
console.log(`${names.length} pictures in public/thumbs`);
