// Robustness checks for the 3D world (plan Task 4 step 5). Needs the dev server: npx vite --port 5199
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.WORLD_URL || 'http://localhost:5199/tools/world-check.html';
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = async (q) => { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); await p.goto(`${BASE}?${q}`); return p; };
const pixel = async (p) => { const png = (await p.screenshot()).toString('base64'); return p.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const g = document.createElement('canvas'); g.width = img.width; g.height = img.height; const x = g.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(Math.floor(img.width / 2), Math.floor(img.height * 0.45), 1, 1).data; return [d[0], d[1], d[2]]; }, png); };

// A model that fails to load: the world still becomes ready within 10 s.
{ const p = await page('light=5&bad');
  const t0 = Date.now();
  await p.waitForFunction(() => window.__ready, null, { timeout: 11000 }).catch(() => fail('world not ready with a missing model'));
  console.log('ready with missing model in', Date.now() - t0, 'ms'); await p.close(); }

// Context lost and restored: the canvas draws again.
{ const p = await page('light=5');
  await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
  await p.waitForTimeout(1500);
  const before = await pixel(p);
  await p.evaluate(() => { const gl = document.querySelector('canvas.world').getContext('webgl2'); window.__lc = gl.getExtension('WEBGL_lose_context'); window.__lc.loseContext(); });
  await p.waitForTimeout(500);
  const during = await pixel(p);
  console.log('pixel while lost', during);
  if (during.join() === before.join()) fail('context loss did not take effect (test is not testing anything)');
  await p.evaluate(() => window.__lc.restoreContext());
  await p.waitForTimeout(2500);
  const after = await pixel(p);
  console.log('pixel before', before, 'after', after);
  if (after.some((v, i) => Math.abs(v - before[i]) > 8)) fail('canvas not drawn the same after context restore');
  await p.close(); }

// Dispose and rebuild: GPU memory returns to the same counts.
{ const p = await page('light=5');
  await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    window.__world.dispose();
    const a = window.__make(); await new Promise((r) => setTimeout(r, 2500)); const m1 = a.info(); a.dispose();
    const c = window.__make(); await new Promise((r) => setTimeout(r, 2500)); const m2 = c.info(); c.dispose();
    return [m1, m2];
  });
  console.log('memory', JSON.stringify(r));
  if (Math.abs(r[0].geometries - r[1].geometries) > 5) fail('geometries leak across rebuilds');
  await p.close(); }
await b.close();
console.log(process.exitCode ? 'world-check FAILED' : 'world-check OK');
