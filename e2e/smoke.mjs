// End-to-end smoke test: builds nothing, expects `vite preview` output in dist/.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
// Playwright is pre-installed globally in the dev container, so load it via require.
const { chromium } = createRequire(import.meta.url)('playwright');

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS_DIR;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const fail = (msg) => {
  console.error('FAIL:', msg);
  server.kill();
  process.exit(1);
};

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  fail('preview server did not start');
}

const total = (page) =>
  page.$$eval('.hud .mat span', (els) => els.reduce((a, e) => a + Number(e.textContent || 0), 0));

try {
  await waitForServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE);
  if ((await page.locator('.hud .mat:visible').count()) !== 4) fail('HUD should show 4 materials (glow hidden until found)');
  if ((await page.locator('.hud .sound').count()) !== 1) fail('HUD should have a sound toggle');
  await page.locator('.hud .sound').click();
  if ((await page.locator('.hud .sound').getAttribute('aria-pressed')) !== 'false') fail('sound toggle should turn sound off');

  const before = await total(page);
  const item = page.locator('.item').first();
  await item.waitFor({ timeout: 5000 });
  if (SHOTS) { await page.waitForTimeout(6500); await page.screenshot({ path: `${SHOTS}/phone-zh-drift.png` }); }
  await item.dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  if (!((await total(page)) > before)) fail('tapping flotsam should add material');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-zh.png` });

  // Test build: separate save, infinite materials on by default.
  await page.goto(BASE + '?debug=1');
  if (!(await page.locator('.debug-badge').count())) fail('test build should show its badge');
  await page.locator('.debug-badge').click(); // open the test panel
  for (let i = 0; i < 3; i++) await page.locator('[data-upgrade="net"] .buy').click();
  if ((await page.locator('.toast').count()) < 1) fail('upgrading should show a toast');
  const lvl = await page.locator('[data-upgrade="net"] .level').textContent();
  if (!lvl?.includes('4')) fail(`infinite materials should allow buying net to 4, got ${lvl}`);

  const savedTotal = () =>
    page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('test:lightkeeper.save') || '{}');
      return Object.values(s.materials || {}).reduce((a, b) => a + b, 0);
    });

  await page.getByText('无限材料：开').click();
  const beforeAway = await savedTotal();
  await page.getByText('+8 小时').click();
  await page.locator('.popup').waitFor({ timeout: 3000 });
  await page.waitForTimeout(500);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/popup-zh.png` });
  await page.locator('.popup button.primary').click();
  if ((await page.locator('.popup').count()) !== 0) fail('popup should close');
  if (!((await savedTotal()) > beforeAway + 100)) fail('collecting from the popup should empty the chest into materials');

  // Chest fills while away; tapping it collects.
  await page.getByText('+1 小时').click();
  await page.locator('.popup').waitFor({ timeout: 3000 });
  await page.evaluate(() => document.querySelector('.overlay')?.remove());
  await page.waitForTimeout(100);
  const fillPct = await page.$eval('.chest .bar i', (e) => parseFloat(e.style.width));
  if (!(fillPct >= 45 && fillPct <= 55)) fail(`an hour away should half-fill a 2-hour chest, got ${fillPct}%`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/chest-half.png` });
  const beforeChest = await savedTotal();
  await page.locator('.chest').dispatchEvent('pointerdown');
  if (!((await savedTotal()) > beforeChest + 100)) fail('tapping the chest should collect it');
  const emptyPct = await page.$eval('.chest .bar i', (e) => parseFloat(e.style.width));
  if (emptyPct !== 0) fail(`chest should be empty after collecting, got ${emptyPct}%`);

  // Lighthouse to 3 → build boat → sail to the wreck → bring it home → unload → discovery.
  for (let i = 0; i < 2; i++) await page.locator('[data-upgrade="light"] .buy').click();
  if (!(await page.locator('.dock-slot .dock').count())) fail('lighthouse 3 should show the dock');
  await page.locator('.map-btn').click();
  await page.locator('.seamap').waitFor();
  await page.locator('.map-bottom .buy').click();
  if (!(await page.locator('.map-bottom [data-upgrade="speed"]').count())) fail('after building, boat upgrades should show');
  await page.locator('.node[data-dest="wreck"]').click();
  await page.locator('.buy.sail').click();
  if (!(await page.locator('.map-info .status').count())) fail('sailing should show the voyage status');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/map.png` });
  await page.locator('.map-close').click();
  if (await page.locator('.boat').isVisible()) fail('boat should be away from the dock');
  await page.getByText('小船立即返航').click();
  await page.locator('.boat.laden').waitFor({ timeout: 3000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/boat-laden.png` });
  await page.locator('.boat').dispatchEvent('pointerdown');
  await page.locator('.discovery').waitFor({ timeout: 3000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/discovery.png` });
  await page.locator('.discovery button').click();
  const disc = await page.evaluate(() => JSON.parse(localStorage.getItem('test:lightkeeper.save')).discovered);
  if (!disc.includes('wreck')) fail('unloading should record the wreck as discovered');
  await page.locator('.map-btn').click();
  if (!(await page.locator('.node.found[data-dest="wreck"]').count())) fail('the map should show the discovered wreck');

  // Go ashore, build the breaking bench, and see the island save up metal.
  await page.locator('.node[data-dest="wreck"]').click();
  await page.locator('.land').click();
  await page.locator('.island-scene').waitFor();
  await page.locator('.plot-btn[data-b="dismantler"]').click();
  await page.locator('[data-building="dismantler"] .buy').click();
  await page.locator('.plot-btn[data-b="dismantler"]').click();
  const bl = await page.locator('[data-building="dismantler"] .level').textContent();
  if (!bl?.includes('1')) fail(`breaking bench should be level 1, got ${bl}`);
  await page.locator('.plot-btn[data-b="boatshed"]').click();
  await page.locator('[data-building="boatshed"] .buy').click();
  await page.getByText('+8 小时').click();
  await page.locator('.popup button').first().click();
  await page.waitForTimeout(400);
  if (!(await page.locator('.island-store .haul').count())) fail('the island should save up what it makes');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/island.png` });
  await page.locator('.map-close').click(); // back to chart
  await page.locator('.seamap').waitFor();
  await page.locator('.map-close').click();

  await page.reload();
  const lvl2 = await page.locator('[data-upgrade="net"] .level').textContent();
  if (!lvl2?.includes('4')) fail(`test save should persist after reload, got ${lvl2}`);

  await page.locator('.debug-badge').click(); // panel starts collapsed after reload
  await page.getByText('天色 +4 分钟').click();
  await page.getByText('随机海上事件').click();
  if (!(await page.locator('.ambient .amb').count())) fail('a sea event should appear');

  // The real save was never touched by the test build.
  await page.goto(BASE);
  await page.locator('.popup button').first().click({ timeout: 1000 }).catch(() => {});
  const realLvl = await page.locator('[data-upgrade="net"] .level').textContent();
  if (!realLvl?.includes('1')) fail(`real save should still be net 1, got ${realLvl}`);

  await page.locator('.lang').click();
  if (!(await page.locator('.panel').textContent())?.includes('Net')) fail('language toggle should switch to English');

  if (SHOTS) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(7000);
    await page.screenshot({ path: `${SHOTS}/desktop-en.png` });
  }
  if (errors.length) fail('page errors: ' + errors.join('; '));
  await browser.close();
  console.log('e2e smoke: PASS');
} catch (e) {
  fail(String(e));
}
server.kill();
process.exit(0);
