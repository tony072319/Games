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
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'zh-CN' });
  page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE);
  // Entering the game shows how far loading has got, then gets out of the way.
  await page.locator('.world-loading').waitFor({ state: 'attached', timeout: 3000 }).catch(() => fail('entering the game should show loading progress'));
  await page.locator('.world-loading').waitFor({ state: 'detached', timeout: 30000 }).catch(() => fail('the loading message should go away once the world is ready'));
  await page.locator('canvas.world').waitFor({ timeout: 10000 });
  await page.locator('.stage[data-world-has~="light"]').waitFor({ state: 'attached', timeout: 15000 });
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
  const item = page.locator('.item:not(.curio):not(.offscreen)').first(); // a glowing find goes to the book instead
  await item.waitFor({ timeout: 5000 });
  if (SHOTS) { await page.waitForTimeout(2500); await page.screenshot({ path: `${SHOTS}/phone-zh-drift.png` }); }
  // A real tap on the picture where the find floats (not the hidden button). Finds drift on and off
  // screen, so tap one that is visible now; slow screenshot runs may also drop an input (ruling): retry there.
  await page.waitForTimeout(1500);
  for (let tries = SHOTS ? 4 : 1; tries > 0 && !((await total(page)) > before); tries--) {
    await item.waitFor({ timeout: 8000 });
    const ib = await item.boundingBox();
    if (!ib) {
      if (tries === 1) fail('the drifting find should be on screen');
      continue;
    }
    await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2);
    await page.waitForFunction((b) => [...document.querySelectorAll('.hud .mat span')].reduce((a, e) => a + Number(e.textContent || 0), 0) > b, before, { timeout: 4000 }).catch(() => {});
  }
  if (!((await total(page)) > before)) fail('tapping flotsam should add material');
  await page.waitForTimeout(200);
  if (!(await goalText())?.includes('储物箱')) fail(`after tapping, the goal should move to the chest, got ${await goalText()}`);
  // Tapping the lighthouse in the picture opens its card (picked in the 3D world, not a button).
  await page.waitForTimeout(1500);
  const lh = await page.locator('.hit[data-hit="light"]').boundingBox();
  if (!lh) fail('the lighthouse should be on screen');
  await page.mouse.click(lh.x + lh.width / 2, lh.y + lh.height / 2);
  await page.locator('[data-upgrade="light"].open').waitFor({ state: 'attached', timeout: 4000 }).catch(() => {});
  // At 2x in the software renderer the first input after a busy stretch is sometimes lost; one retry for screenshot runs only.
  if (SHOTS && !(await page.locator('[data-upgrade="light"].open').count())) {
    await page.mouse.click(lh.x + lh.width / 2, lh.y + lh.height / 2);
    await page.locator('[data-upgrade="light"].open').waitFor({ state: 'attached', timeout: 4000 }).catch(() => {});
  }
  if (!(await page.locator('[data-upgrade="light"].open').count())) {
    const under = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${e.className}` : 'none'; }, [lh.x + lh.width / 2, lh.y + lh.height / 2]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/fail-light.png` });
    fail(`tapping the lighthouse should open its card (under the finger: ${under}, at ${JSON.stringify(lh)})`);
  }
  // Dragging the view from the chest turns the camera and collects nothing.
  { const cb = await page.locator('.chest').boundingBox();
    const save0 = await page.evaluate(() => localStorage.getItem('lightkeeper.save'));
    await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
    await page.mouse.down();
    await page.mouse.move(cb.x + cb.width / 2 + 120, cb.y + cb.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    const chest0 = JSON.parse(save0).chest;
    const chest1 = await page.evaluate(() => JSON.parse(localStorage.getItem('lightkeeper.save') || '{}').chest);
    if (chest1 && Object.keys(chest0).some((k) => chest1[k] < chest0[k] - 1e-6)) fail('dragging from the chest should not collect it'); }
  // Home and sea views.
  await page.locator('.view-btn[data-view="sea"]').click();
  await page.waitForTimeout(600);
  await page.locator('.view-btn[data-view="home"]').click();
  await page.waitForTimeout(600);
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
  if (!(await page.locator('.arrival-line.line-chest').count())) fail('arrival report should list the chest');
  if (!(await page.locator('.arrival-line.line-cap').count())) fail('arrival report should say the chest filled up');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/popup-zh.png` });
  // Until rewarded ads exist, the report has one button: collect.
  if ((await page.locator('.popup .actions button').count()) !== 1) fail(`the arrival report should have one collect button, found ${await page.locator('.popup .actions button').count()}`);
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
  await page.locator('.chest').dispatchEvent('click');
  if (!((await savedTotal()) > beforeChest + 100)) fail('tapping the chest should collect it');
  const emptyPct = await page.$eval('.chest .bar i', (e) => parseFloat(e.style.width));
  if (emptyPct !== 0) fail(`chest should be empty after collecting, got ${emptyPct}%`);

  // Lighthouse to 3 → build boat → sail to the wreck → bring it home → unload → discovery.
  for (let i = 0; i < 2; i++) await page.locator('[data-upgrade="light"] .buy').click();
  await page.locator('.stage[data-world-has~="dock"]').waitFor({ state: 'attached', timeout: 3000 }).catch(() => fail('lighthouse 3 should show the dock'));
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
  await page.locator('.boat').dispatchEvent('click');
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
  await dbg('随机海上事件'); // calls the whale over in the 3D world; page errors are checked at the end

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

  // Time speed in the test build: ×1 → ×10, and the label says so.
  await dbg('时间 ×1');
  await page.locator('.debug-badge').click();
  if (!(await page.getByText('时间 ×10').count())) fail('the time button should step to ×10');
  await page.getByText('时间 ×10').click(); // ×100
  await page.getByText('时间 ×100').click(); // ×1000
  await page.getByText('时间 ×1000').click(); // back to ×1
  await page.locator('.debug-badge').click();

  // Milestones: the net card shows progress to its next milestone.
  if (!(await page.locator('[data-upgrade="net"] .progress').count())) fail('net card should show milestone progress');

  // The book: 12 cells per sea; a find shows up as found.
  await dbg('+1 珍品');
  await page.locator('.book-btn').click();
  await page.locator('.book').waitFor();
  if ((await page.locator('.book-cell').count()) !== 12) fail('a book page should have 12 cells');
  if ((await page.locator('.book-cell.found').count()) < 1) fail('the find should be in the book');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/book.png` });
  await page.locator('.book .map-close').click();
  await page.locator('.book').waitFor({ state: 'detached', timeout: 2000 });

  // The starlight tree: learn one, then reset.
  await page.locator('.starlight').click();
  await page.locator('.tree').waitFor();
  await page.locator('[data-talent="net1"] .buy').click();
  if (!(await page.locator('[data-talent="net1"].learned').count())) fail('learning should light the talent');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tree.png` });
  await page.locator('.tree-foot .btn-ghost').click();
  await page.locator('.popup .btn-primary').click();
  await page.waitForTimeout(300);
  if (await page.locator('[data-talent="net1"].learned').count()) fail('reset should give the point back');
  await page.locator('.tree .map-close').click();
  await page.locator('.tree').waitFor({ state: 'detached', timeout: 2000 });

  // Switching the animation setting must not add anything else to the screen.
  for (let i = 0; i < 2; i++) {
    await page.locator('.hud .settings-btn').click();
    await page.locator('.menu button', { hasText: '动画' }).click();
  }
  if ((await page.locator('.mini-exit').count()) !== 1) fail(`there should be one expand button, found ${await page.locator('.mini-exit').count()}`);

  // Corner mode: controls fold away, survive a reload, and come back.
  await page.locator('.hud .settings-btn').click();
  await page.locator('.menu button', { hasText: '角落模式' }).click();
  if (await page.locator('.side').isVisible()) fail('corner mode should hide the controls');
  await page.reload();
  if (await page.locator('.side').isVisible()) fail('corner mode should survive a reload');
  await page.locator('.mini-exit').click();
  if (!(await page.locator('.side').isVisible())) fail('expand should bring the controls back');

  // The real save was never touched by the test build.
  await page.goto(BASE);
  await page.locator('.stage.ready').waitFor({ state: 'attached', timeout: 90000 });
  // The real save has been away for minutes: its arrival report comes up; close it.
  await page.locator('.popup').waitFor({ timeout: 8000 }).catch(() => {});
  await page.locator('.popup button').first().click({ timeout: 2000 }).catch(() => {});
  await page.locator('.popup').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
  const realLvl = await page.locator('[data-upgrade="net"] .level').textContent();
  if (!realLvl?.includes('1')) fail(`real save should still be net 1, got ${realLvl}`);

  await page.locator('.hud .settings-btn').click();
  await page.locator('.menu button').nth(3).click();
  if (!(await page.locator('.panel').textContent())?.includes('Net')) fail('language toggle should switch to English');

  // A short wide window: every hint and bubble that shows stays inside the picture.
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.waitForTimeout(1500);
  { const out = await page.evaluate(() => {
      const st = document.querySelector('.stage').getBoundingClientRect();
      return [...document.querySelectorAll('.stage .bubble, .stage .glint')].filter((e) => getComputedStyle(e).display !== 'none' && e.offsetParent).map((e) => e.getBoundingClientRect()).filter((r) => r.left + r.width / 2 < st.left || r.left + r.width / 2 > st.right || r.top + r.height / 2 < st.top || r.top + r.height / 2 > st.bottom).length;
    });
    if (out) fail(`${out} hints/bubbles are drawn outside the picture`); }
  if (SHOTS) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(7000);
    await page.screenshot({ path: `${SHOTS}/desktop-en.png` });
  }
  if (errors.length) fail('page errors: ' + errors.join('; '));
  await browser.close();
  console.log('e2e smoke: PASS');
} catch (e) {
  if (process.env.FAIL_SHOT) await page?.screenshot({ path: process.env.FAIL_SHOT }).catch(() => {});
  fail(String(e));
}
server.kill();
process.exit(0);
