// New-player playtest: plays the real build in a phone-sized browser and logs what it sees (needs `npm run build` first).
// Run: MIN=16 OUT=/some/dir node tools/playtest-bot.mjs
//   SAVE=file.json   start from a save ({ now, save } as written by the simulator's onVisit hook); the clock starts at `now`
//   AWAY=8           after MIN minutes, close the game, come back AWAY hours later and play MIN2 more minutes
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const MIN = +(process.env.MIN || 12);
const MIN2 = +(process.env.MIN2 || 4);
const AWAY = process.env.AWAY ? +process.env.AWAY : 0;
const OUT = process.env.OUT || '.';
const PORT = +(process.env.PORT || 4181);
const start = process.env.SAVE ? JSON.parse(readFileSync(process.env.SAVE, 'utf8')) : null;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 3000));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 60000).toFixed(2)}m]`, ...a);

let page;
const seen = new Set();
async function open(at) {
  page = await ctx.newPage();
  page.on('pageerror', (e) => log('PAGEERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && log('CONSOLE', m.text().slice(0, 200)));
  if (at) await page.clock.install({ time: at });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(4000);
  seen.clear();
}

const note = async (sel, tag) => {
  for (const e of await page.locator(sel).all()) {
    const t = (await e.textContent().catch(() => ''))?.trim().replace(/\s+/g, ' ');
    if (t && !seen.has(tag + t)) { seen.add(tag + t); log(tag, t.slice(0, 220)); }
  }
};
// Clicks go through the page itself: the DOM changes under the bot all the time.
const click = (sel) => page.evaluate((q) => { const e = document.querySelector(q); if (e) e.click(); return !!e; }, sel).catch(() => false);
const hit = async (n) => {
  const l = page.locator(`.hit[data-hit="${n}"]`);
  if (!(await l.count())) return false;
  await l.focus().catch(() => {});
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForTimeout(300);
  return true;
};
const BUYABLE = '[data-upgrade] .buy:not([disabled]), [data-building] .buy:not([disabled]), [data-decor] .buy:not([disabled]), [data-talent] .buy:not([disabled])';
const buyAll = async () => {
  for (let k = 0; k < 8; k++) {
    const id = await page.evaluate((q) => {
      const e = document.querySelector(q);
      if (!e) return null;
      const c = e.closest('[data-upgrade],[data-building],[data-decor],[data-talent]');
      e.click();
      return ['data-upgrade', 'data-building', 'data-decor', 'data-talent'].map((a) => c.getAttribute(a) && `${a.slice(5)}:${c.getAttribute(a)}`).find(Boolean);
    }, BUYABLE).catch(() => null);
    if (!id) return;
    log('BUY', id);
    await page.waitForTimeout(200);
  }
};
const status = () => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('lightkeeper.save') || '{}');
  const m = [...document.querySelectorAll('.hud .mat')].map((e) => e.textContent.trim()).join(' ');
  return `${s.sea} light ${s.levels?.light}+${s.lightParts} net ${s.levels?.net} | ${m} | boats ${s.boat?.built ? 1 : 0}${s.boat2?.built ? '+1' : ''} disc ${(s.discovered || []).join(',')} land ${s.land} decor ${Object.keys(s.decor || {}).length} bld ${Object.keys(s.buildings || {}).length}`;
}).catch(() => '?');

async function play(minutes, label) {
  const end = Date.now() + minutes * 60000;
  let taps = 0, shot = 0, round = 0;
  const p0 = Date.now();
  while (Date.now() < end) {
    round++;
    await note('.goal-text', 'GOAL');
    await note('.toast', 'TOAST');
    if (await page.locator('.popup, .discovery').count()) {
      await note('.popup, .discovery', 'POPUP');
      await click('.popup .btn-primary, .discovery button, .popup .actions button, .popup button');
    }
    taps += await page.evaluate(() => { const it = [...document.querySelectorAll('.item:not(.offscreen)')]; it.forEach((e) => e.click()); return it.length; }).catch(() => 0);
    await click('.chest');
    if (await click('.boat.laden')) log('UNLOAD');
    await hit('light'); await buyAll();
    await hit('net'); await buyAll();
    if (await page.locator('.hit[data-hit="build"]').count()) { await hit('build'); await buyAll(); await click('.map-close'); }
    if (await page.locator('.hit[data-hit="map"]').count()) {
      await hit('map');
      await page.waitForTimeout(300);
      const r = await page.evaluate((rnd) => {
        const out = [];
        for (const mb of document.querySelectorAll('.map-bottom .buy:not([disabled])')) { out.push('MAP BUY ' + mb.textContent.trim().slice(0, 40)); mb.click(); }
        const nodes = [...document.querySelectorAll('.node.found, .node.unknown')];
        if (nodes.length) {
          nodes[rnd % nodes.length].click();
          const give = document.querySelector('.buy.deliver:not([disabled])');
          if (give) { out.push('DELIVER ' + (document.querySelector('.map-info')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160)); give.click(); }
          const sb = document.querySelector('.buy.sail:not([disabled])');
          if (sb) { out.push('SAIL ' + (document.querySelector('.map-info')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200)); sb.click(); }
        }
        return out;
      }, round).catch(() => []);
      for (const x of r) log(x);
      // Go ashore now and then and build.
      if (round % 4 === 0 && (await click('.land'))) { await page.waitForTimeout(400); await buyAll(); await click('.island-scene .map-close, .map-close'); }
      await click('.map-close');
    }
    await page.keyboard.press('Escape').catch(() => {});
    if ((Date.now() - p0) / 60000 >= shot) {
      await page.screenshot({ path: `${OUT}/${label}-${shot}.png` });
      log('STATUS', await status(), 'taps', taps);
      shot += 4;
    }
    await page.waitForTimeout(1500);
  }
  log('END', label, await status(), 'taps', taps);
}

// The save goes in before the game's own script runs (once per browser context).
if (start) await ctx.addInitScript((v) => { if (!localStorage.getItem('__seeded')) { localStorage.setItem('lightkeeper.save', v); localStorage.setItem('__seeded', '1'); } }, start.save);
await open(start?.now);
await play(MIN, 'a');
if (AWAY) {
  const back = (await page.evaluate(() => Date.now())) + AWAY * 3600e3;
  await page.close();
  log(`--- away ${AWAY} h ---`);
  await open(back);
  await play(MIN2, 'b');
}
await b.close();
server.kill();
