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

// The test panel stays folded so it never covers the game; open it for one click.
let page;
const dbg = async (label) => {
  if (await page.locator('.debug.collapsed').count()) await page.locator('.debug-badge').click();
  await page.getByText(label).click();
  await page.locator('.debug-badge').click();
};

const total = (page) =>
  page.$$eval('.hud .mat span', (els) => els.reduce((a, e) => a + Number(e.textContent || 0), 0));

try {
  await waitForServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'zh-CN' });
  page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE);
  if ((await page.locator('.hud .mat:visible').count()) !== 4) fail('HUD should show 4 materials (glow hidden until found)');
  // Settings menu: sound off.
  await page.locator('.hud .settings-btn').click();
  await page.locator('.menu button').first().click();
  const snd = await page.evaluate(() => JSON.parse(localStorage.getItem('lightkeeper.save')).settings.sound);
  if (snd !== false) fail('settings menu should turn sound off');
  if (await page.locator('.menu').count()) fail('menu should close after a choice');

  // First-time steps: the goal bar starts with "tap something drifting".
  const goalText = () => page.locator('.goal-text').textContent();
  if (!(await goalText())?.includes('漂')) fail(`first goal should be to tap drifting things, got ${await goalText()}`);
  const before = await total(page);
  const item = page.locator('.item').first();
  await item.waitFor({ timeout: 5000 });
  if (SHOTS) { await page.waitForTimeout(6500); await page.screenshot({ path: `${SHOTS}/phone-zh-drift.png` }); }
  await item.dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  if (!((await total(page)) > before)) fail('tapping flotsam should add material');
  await page.waitForTimeout(200);
  if (!(await goalText())?.includes('储物箱')) fail(`after tapping, the goal should move to the chest, got ${await goalText()}`);
  // Tapping the lighthouse in the scene opens its card.
  await page.locator('.hit[data-hit="light"]').click();
  if (!(await page.locator('[data-upgrade="light"].open').count())) fail('tapping the lighthouse should open its card');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-zh.png` });

  // Test build: separate save, infinite materials on by default.
  await page.goto(BASE + '?debug=1');
  if (!(await page.locator('.debug-badge').count())) fail('test build should show its badge');
  for (let i = 0; i < 3; i++) await page.locator('[data-upgrade="net"] .buy').click();
  if ((await page.locator('.toast').count()) < 1) fail('upgrading should show a toast');
  const lvl = await page.locator('[data-upgrade="net"] .level').textContent();
  if (!lvl?.includes('4')) fail(`infinite materials should allow buying net to 4, got ${lvl}`);

  const savedTotal = () =>
    page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('test:lightkeeper.save') || '{}');
      return Object.values(s.materials || {}).reduce((a, b) => a + b, 0);
    });

  await dbg('无限材料：开');
  const beforeAway = await savedTotal();
  await dbg('+8 小时');
  await page.locator('.popup').waitFor({ timeout: 3000 });
  await page.waitForTimeout(900);
  if (!(await page.locator('.arrival-line.chest').count())) fail('arrival report should list the chest');
  if (!(await page.locator('.arrival-line.cap').count())) fail('arrival report should say the chest filled up');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/popup-zh.png` });
  await page.locator('.popup .btn-primary').click();
  await page.locator('.popup').waitFor({ state: 'detached', timeout: 2000 }).catch(() => fail('popup should close'));
  if (!((await savedTotal()) > beforeAway + 100)) fail('collecting from the popup should empty the chest into materials');

  // Chest fills while away; tapping it collects.
  await dbg('+1 小时');
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
  await dbg('小船立即返航');
  await page.locator('.boat.laden').waitFor({ timeout: 3000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/boat-laden.png` });
  await page.locator('.boat').dispatchEvent('pointerdown');
  await page.locator('.discovery').waitFor({ timeout: 3000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/discovery.png` });
  await page.locator('.discovery button').click();
  await page.locator('.discovery').waitFor({ state: 'detached', timeout: 2000 });
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
  await dbg('+8 小时');
  await page.locator('.popup button').first().click();
  await page.waitForTimeout(400);
  if (!(await page.locator('.island-store .haul').count())) fail('the island should save up what it makes');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/island.png` });
  await page.locator('.map-close').click(); // back to chart
  await page.locator('.island-scene').waitFor({ state: 'detached', timeout: 2000 });
  await page.locator('.seamap').waitFor();
  await page.locator('.map-close').click();

  await page.reload();
  const lvl2 = await page.locator('[data-upgrade="net"] .level').textContent();
  if (!lvl2?.includes('4')) fail(`test save should persist after reload, got ${lvl2}`);

  await dbg('天色 +4 分钟');
  await dbg('随机海上事件');
  if (!(await page.locator('.ambient .amb').count())) fail('a sea event should appear');

  // Pass the light on: lighthouse to 10 → button → confirm → arrive at the fog sea.
  await dbg('灯塔修满');
  await page.locator('.pass-btn').waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('.pass-btn').click();
  await page.locator('.popup.pass .btn-primary').click();
  await page.waitForTimeout(5200);
  const seaNow = () => page.evaluate(() => JSON.parse(localStorage.getItem('test:lightkeeper.save')).sea);
  if ((await seaNow()) !== 'fog') fail('should arrive at the fog sea');
  if (!(await page.locator('.seas-btn').isVisible())) fail('the seas button should appear once there are two seas');
  if (!(await page.locator('.starlight').isVisible())) fail('starlight should show in the HUD');
  const fogLight = await page.locator('[data-upgrade="light"] .level').textContent();
  if (!fogLight?.includes('1')) fail(`new sea should start with lighthouse 1, got ${fogLight}`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/fog.png` });
  await page.locator('.seas-btn').click();
  await page.locator('.menu button', { hasText: '黄昏的海' }).click();
  const duskLight = await page.locator('[data-upgrade="light"] .level').textContent();
  if (!duskLight?.includes('10')) fail(`the old sea should still be lit at 10, got ${duskLight}`);
  await page.locator('.seas-btn').click();
  await page.locator('.menu button', { hasText: '有雾的夜海' }).click();
  await dbg('灯塔修满');
  await page.locator('.pass-btn').click();
  await page.locator('.popup.pass .btn-primary').click();
  await page.waitForTimeout(5200);
  if ((await seaNow()) !== 'aurora') fail('should arrive at the aurora sea');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/aurora.png` });

  // The real save was never touched by the test build.
  await page.goto(BASE);
  await page.locator('.popup button').first().click({ timeout: 1000 }).catch(() => {});
  const realLvl = await page.locator('[data-upgrade="net"] .level').textContent();
  if (!realLvl?.includes('1')) fail(`real save should still be net 1, got ${realLvl}`);

  await page.locator('.hud .settings-btn').click();
  await page.locator('.menu button').nth(2).click();
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
