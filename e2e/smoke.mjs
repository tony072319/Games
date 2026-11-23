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
  if ((await page.locator('.hud .mat').count()) !== 4) fail('HUD should show 4 materials');

  const before = await total(page);
  const item = page.locator('.item').first();
  await item.waitFor({ timeout: 5000 });
  if (SHOTS) { await page.waitForTimeout(6500); await page.screenshot({ path: `${SHOTS}/phone-zh-drift.png` }); }
  await item.dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  if (!((await total(page)) > before)) fail('tapping flotsam should add material');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-zh.png` });

  await page.goto(BASE + '?debug=1');
  await page.getByText('+1000 全部材料').click();
  await page.locator('[data-upgrade="net"] .buy').click();
  const lvl = await page.locator('[data-upgrade="net"] .level').textContent();
  if (!lvl?.includes('2')) fail(`net level should be 2, got ${lvl}`);

  await page.getByText('+8 小时').click();
  await page.locator('.popup').waitFor({ timeout: 3000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/popup-zh.png` });
  await page.locator('.popup button.primary').click();
  if ((await page.locator('.popup').count()) !== 0) fail('popup should close');

  await page.reload();
  const lvl2 = await page.locator('[data-upgrade="net"] .level').textContent();
  if (!lvl2?.includes('2')) fail(`net level should persist after reload, got ${lvl2}`);

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
