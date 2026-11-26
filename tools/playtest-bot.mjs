import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/home/user/Games/package.json')('playwright');
const MIN = +(process.env.MIN || 12), OUT = '/tmp/claude-0/play';
const server = spawn('npx', ['vite', 'preview', '--port', '4181', '--strictPort'], { cwd: '/home/user/Games', stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 3000));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 60000).toFixed(2)}m]`, ...a);
page.on('pageerror', (e) => log('PAGEERROR', e.message));
await page.goto('http://localhost:4181/');
await page.waitForTimeout(4000);
// Test build starts with unlimited materials: turn that off to play like a real player.

const seen = new Set();
const note = async (sel, tag) => { for (const e of await page.locator(sel).all()) { const t = (await e.textContent().catch(() => ''))?.trim().replace(/\s+/g, ' '); if (t && !seen.has(tag + t)) { seen.add(tag + t); log(tag, t.slice(0, 160)); } } };
const click = async (sel) => { const l = page.locator(sel).first(); if (await l.count()) { await l.dispatchEvent('click').catch(() => {}); return true; } return false; };
const hit = async (n) => { const l = page.locator(`.hit[data-hit="${n}"]`); if (!(await l.count())) return false; await l.focus().catch(() => {}); await page.keyboard.press('Enter'); await page.waitForTimeout(300); return true; };
const buyAll = async () => { for (let k = 0; k < 6; k++) { const id = await page.evaluate(() => { const e = document.querySelector('[data-upgrade] .buy:not([disabled]), [data-building] .buy:not([disabled])'); if (!e) return null; const c = e.closest('[data-upgrade],[data-building]'); e.click(); return c.getAttribute('data-upgrade') || c.getAttribute('data-building'); }).catch(() => null); if (!id) return; log('BUY', id); await page.waitForTimeout(200); } };
const mats = () => page.evaluate(() => [...document.querySelectorAll('.hud .mat')].map((e) => e.textContent.trim()).join(' '));
let taps = 0, shot = 0;
while (Date.now() - t0 < MIN * 60000) {
  await note('.goal-text', 'GOAL'); await note('.toast', 'TOAST');
  if (await page.locator('.popup, .discovery').count()) { await note('.popup, .discovery', 'POPUP'); await click('.popup .btn-primary, .discovery button, .popup button'); }
  for (const it of await page.locator('.item:not(.offscreen)').all()) { await it.dispatchEvent('click').catch(() => {}); taps++; }
  await click('.chest');
  if (await page.locator('.boat.laden').count()) { await click('.boat'); log('UNLOAD'); }
  // Follow what the island offers: lighthouse and net cards.
  await hit('light'); await buyAll(); await hit('net'); await buyAll();
  if (await page.locator('.hit[data-hit="build"]').count()) { await hit('build'); await buyAll(); await click('.map-close, .sheet-close'); }
  if (await page.locator('.hit[data-hit="map"]').count()) {
    await hit('map'); await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const out = []; const mb = document.querySelector('.map-bottom .buy:not([disabled])'); if (mb) { out.push('MAP BUY ' + mb.textContent.trim()); mb.click(); } const n = document.querySelector('.node:not(.locked)'); if (n) { n.click(); const sb = document.querySelector('.buy.sail:not([disabled])'); if (sb) { sb.click(); out.push('SAIL ' + (document.querySelector('.map-info')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140)); } } return out; }).catch(() => []);
    for (const x of r) log(x);
    await page.waitForTimeout(300);
    await click('.map-close');
  }
  await page.keyboard.press('Escape').catch(() => {});
  if ((Date.now() - t0) / 60000 > shot) { await page.screenshot({ path: `${OUT}/s${shot}.png` }); log('MATS', await mats(), 'taps', taps); shot += 3; }
  await page.waitForTimeout(1500);
}
log('END MATS', await mats(), 'taps', taps);
log('SAVE', await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lightkeeper.save')); return JSON.stringify({ levels: s.levels, boat: s.boat?.built, disc: s.discovered, bld: s.buildings }); }));
await b.close(); server.kill();
