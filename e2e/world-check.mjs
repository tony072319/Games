// Robustness checks for the 3D world (plan Task 4 step 5). Needs the dev server: npx vite --port 5199
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.WORLD_URL || 'http://localhost:5199/tools/world-check.html';
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = async (q) => { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); await p.goto(`${BASE}?${q}`); return p; };
const pixel = async (p) => { const png = (await p.screenshot()).toString('base64'); return p.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const g = document.createElement('canvas'); g.width = img.width; g.height = img.height; const x = g.getContext('2d'); x.drawImage(img, 0, 0); // The colour of a small patch, not one dot: the grass sways, so a single dot can land on a blade one moment and not the next.
  const n = 15; const d = x.getImageData(Math.floor(img.width / 2) - 7, Math.floor(img.height * 0.45) - 7, n, n).data; const sum = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; } return sum.map((v) => Math.round(v / (n * n))); }, png); };

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

// Context lost and never given back (iOS after the tab was in the background): the world rebuilds itself.
{ const p = await page('light=5');
  await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
  await p.waitForTimeout(1500);
  const before = await pixel(p);
  await p.evaluate(() => document.querySelector('canvas.world').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  // The new world has every model to load again: wait until it says it is ready, then a moment for things to settle into place.
  await p.waitForFunction(() => window.__remade, null, { timeout: 40000 }).catch(() => fail('the rebuilt world never became ready'));
  await p.waitForTimeout(2500);
  const after = await pixel(p);
  const calls = await p.evaluate(() => window.__lostCalls || 0);
  console.log('never restored: rebuilds', calls, 'pixel', after);
  if (!calls || after.some((v, i) => Math.abs(v - before[i]) > 8)) fail('a context that never comes back should rebuild the world');
  await p.close(); }

// Upgrade pulse: shows on the new model after a level-up, and two quick pulses never leave it bigger.
{ const p = await page('light=5');
  await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const lightObj = () => { let f = null; window.__world.scene.traverse((o) => { if (o.userData.tag === 'light') f = o; }); return f; };
    const w = window.__world;
    // Level-up then pulse, as the game does: the pulse must land on the new lighthouse.
    w.pulse('light'); window.__bump(); // the game asks for the pulse, then its next frame updates the world
    let grew = false; const t0 = performance.now();
    while (performance.now() - t0 < 2500) { await new Promise((r) => setTimeout(r, 30)); const o = lightObj(); if (o && o.userData.baseScale && o.scale.x > o.userData.baseScale * 1.03) grew = true; }
    const o = lightObj(); const base = o.scale.x;
    w.pulse('light'); await new Promise((r) => setTimeout(r, 120)); w.pulse('light');
    await new Promise((r) => setTimeout(r, 1500));
    return { grew, base, after: lightObj().scale.x };
  });
  console.log('pulse', JSON.stringify(r));
  if (!r.grew) fail('a pulse right after a level-up should show on the new model');
  if (Math.abs(r.after - r.base) > 1e-6) fail('two quick pulses left the lighthouse a different size');
  await p.close(); }

// Dispose frees everything it made: every geometry and material in the scene (after a level change too) is disposed.
{ const p = await page('light=5');
  await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
  await p.waitForTimeout(1500);
  const left = await p.evaluate(async () => {
    const T = window.__THREE;
    const freed = new Set();
    const g0 = T.BufferGeometry.prototype.dispose; T.BufferGeometry.prototype.dispose = function () { freed.add(this); return g0.call(this); };
    const m0 = T.Material.prototype.dispose; T.Material.prototype.dispose = function () { freed.add(this); return m0.call(this); };
    const w = window.__world;
    const seen = new Set();
    const owner = new Map();
    const collect = () => w.scene.traverse((o) => { if (o.isSprite) return; if (o.geometry) { seen.add(o.geometry); owner.set(o.geometry, o.type + '/' + (o.name || o.parent?.name || '?') + '/' + o.geometry.type); } if (o.material) [].concat(o.material).forEach((m) => { seen.add(m); owner.set(m, o.type + '/' + (o.name || '?') + '/' + m.type); }); });
    collect();
    window.__bump(); await new Promise((r) => setTimeout(r, 2500)); collect(); // a level change swaps models, lamps and glows
    w.dispose();
    const left = [...seen].filter((x) => !freed.has(x)).map((x) => owner.get(x)); const c = {}; left.forEach((k) => (c[k] = (c[k] || 0) + 1)); return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v}x ${k}`);
  });
  console.log('not freed after dispose:', left.length, left.slice(0, 12).join(' | '));
  if (left.length) fail(`${left.length} geometries/materials were not freed`);
  await p.close(); }
await b.close();
console.log(process.exitCode ? 'world-check FAILED' : 'world-check OK');
