import { AUTOSAVE_MS, MATERIALS, OFFLINE_MIN_REPORT_SECONDS, type Materials, type UpgradeId } from '../core/data';
import { buyUpgrade, chestCapacity, chestTotal } from '../core/economy';
import { collect, newField, updateField, type FlotsamField } from '../core/flotsam';
import { loadGame, saveGame, type KV } from '../core/save';
import { applyOffline, claimDouble, collectChest, tick, type OfflineReport } from '../core/sim';
import { newGame, type GameState } from '../core/state';
import { detectLang, formatNumber, t } from '../i18n';
import { allowedEvents, ambientLayer, playAmbient } from './ambient';
import { CHEST_POS, SEA_BAND, chestSvg, itemIcon, netSvg, sceneBackSvg, sceneFrontSvg } from './art';
import { drawSea } from './sea';
import { SoundEngine } from './audio';
import { SKY_CYCLE_MS, applySky, skyAt } from './sky';
import { createDebug } from './debug';
import { el } from './dom';
import { createHud, type Hud } from './hud';
import { showOfflinePopup } from './offlinePopup';
import { createPanel, type Panel } from './upgrades';

export interface AppOptions {
  now: () => number;
  kv: KV;
  navLangs: readonly string[];
  debug: boolean;
}

export function startApp(root: HTMLElement, opts: AppOptions): void {
  const loaded = loadGame(opts.kv, opts.now(), detectLang(opts.navLangs));
  const state: GameState = loaded.state;
  const field: FlotsamField = newField(opts.now());
  const save = () => saveGame(opts.kv, state);

  let hud!: Hud;
  let panel!: Panel;
  let stage!: HTMLElement;
  let flotsamLayer!: HTMLElement;
  let game!: HTMLElement;
  let chestBtn!: HTMLButtonElement;
  let chestKey = '';
  const itemEls = new Map<number, HTMLElement>();
  /** Test build: materials are topped up every frame so nothing ever runs out. */
  let infinite = opts.debug;
  const INFINITE_AMOUNT = 1e12;
  const resizeObserver = new ResizeObserver(() => onStageResize());
  const sound = new SoundEngine(state.settings.sound);
  let farLayer!: SVGSVGElement;
  let nearLayer!: SVGSVGElement;
  let seaCanvas!: HTMLCanvasElement;
  let netSlot: Element | null = null;
  let netShown = 0;
  let nextSeaAt = 0;
  /** Debug only: shifts the sky clock forward. */
  let skyOffset = 0;
  let nextSkyAt = 0;
  let nextAmbientAt = opts.now() + 8000;
  const currentSky = () => skyAt(opts.now() + skyOffset);
  function triggerAmbient() {
    const kinds = allowedEvents(currentSky());
    playAmbient(farLayer, nearLayer, kinds[Math.floor(Math.random() * kinds.length)]);
  }

  // An open popup accumulates further time away instead of stacking dialogs.
  let pending: OfflineReport | null = null;
  let popupEl: HTMLElement | null = null;

  function showReport(r: OfflineReport) {
    if (r.creditedSeconds < OFFLINE_MIN_REPORT_SECONDS && !pending) return;
    if (pending) {
      pending.seconds += r.seconds;
      pending.creditedSeconds += r.creditedSeconds;
      popupEl?.remove();
    } else {
      pending = { seconds: r.seconds, creditedSeconds: r.creditedSeconds, gained: { ...r.gained } };
    }
    popupEl = showOfflinePopup(game, state.settings.lang, pending, state.chest, (double) => {
      const moved = takeChest();
      if (double) claimDouble(state, moved);
      pending = null;
      popupEl = null;
      refresh();
      save();
    });
  }

  /** Empty the chest into the inventory with a little "+N" for each material. */
  function takeChest(): Materials {
    const moved = collectChest(state);
    if (chestTotal(moved) >= 1) sound.play('chest');
    const lang = state.settings.lang;
    const from = chestBtn.getBoundingClientRect();
    let i = 0;
    for (const m of MATERIALS) {
      if (moved[m] < 1) continue;
      floatText(`+${formatNumber(moved[m], lang)}`, chestBtn.offsetLeft + 4, chestBtn.offsetTop - 10 - i * 18, itemIcon(m));
      // A handful of icons per material, more for bigger hauls.
      const n = Math.min(6, 1 + Math.floor(Math.log10(moved[m] + 1) * 1.5));
      flyToHud(m, from.left + from.width / 2, from.top + from.height / 3, n, i * 90);
      i++;
    }
    return moved;
  }

  function floatText(text: string, x: number, y: number, icon = '') {
    const g = el('div', 'gain', icon);
    g.append(text);
    g.style.left = `${x}px`;
    g.style.top = `${y}px`;
    stage.append(g);
    setTimeout(() => g.remove(), 1300);
  }

  /** Item icons arc from a point on screen into the material's counter, then it bumps. */
  function flyToHud(m: (typeof MATERIALS)[number], x: number, y: number, n: number, delay = 0) {
    const g = game.getBoundingClientRect();
    const to = hud.target(m).getBoundingClientRect();
    const tx = to.left + 10 - g.left;
    const ty = to.top + to.height / 2 - g.top;
    for (let k = 0; k < n; k++) {
      const f = el('div', 'fly', itemIcon(m));
      const sx = x - g.left + (Math.random() - 0.5) * 30;
      const sy = y - g.top + (Math.random() - 0.5) * 16;
      f.style.left = `${sx}px`;
      f.style.top = `${sy}px`;
      game.append(f);
      const dx = tx - sx;
      const dy = ty - sy;
      const lift = -40 - Math.random() * 40;
      const anim = f.animate(
        [
          { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.3}px), calc(-50% + ${dy * 0.3 + lift}px)) scale(1.25)`, opacity: 1, offset: 0.35 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7)`, opacity: 0.9 },
        ],
        { duration: 650 + Math.random() * 250, delay: delay + k * 70, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'backwards' },
      );
      anim.onfinish = () => {
        f.remove();
        hud.bump(m);
      };
    }
  }

  /** A burst of little lights around something that was just mended. */
  function sparkle(target: Element | null) {
    if (!target) return;
    const g = game.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2 - g.left;
    const cy = r.top + r.height / 2 - g.top;
    for (let k = 0; k < 16; k++) {
      const p = el('div', 'spark');
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      game.append(p);
      const a = (k / 16) * Math.PI * 2 + Math.random() * 0.4;
      const d = 30 + Math.random() * Math.max(30, r.width * 0.6);
      p.animate(
        [
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0.2)`, opacity: 0 },
        ],
        { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.4,1)' },
      ).onfinish = () => p.remove();
    }
  }

  function toast(text: string) {
    const n = el('div', 'toast');
    n.textContent = text;
    stage.append(n);
    setTimeout(() => n.remove(), 2200);
  }

  function onBuy(id: UpgradeId) {
    if (!buyUpgrade(state, id)) return;
    save();
    sound.play('upgrade');
    const lang = state.settings.lang;
    toast(t(lang, 'toast.upgraded', { name: t(lang, `upg.${id}.name`), level: state.levels[id] }));
    panel.flash(id);
    refresh(); // draw the new look first, then celebrate it
    const target = id === 'net' ? netSlot : chestBtn;
    target?.classList.remove('pulse');
    void (target as HTMLElement | null)?.getBoundingClientRect();
    target?.classList.add('pulse');
    sparkle(target);
  }

  function build() {
    const lang = state.settings.lang;
    document.documentElement.lang = lang;
    document.title = t(lang, 'game.title');
    game = el('div', 'game');
    stage = el('div', 'stage');
    const back = el('div', 'scene back', sceneBackSvg());
    seaCanvas = el('canvas', 'sea');
    farLayer = ambientLayer();
    const front = el('div', 'scene front', sceneFrontSvg());
    nearLayer = ambientLayer();
    stage.append(back, seaCanvas, farLayer, front, nearLayer);
    netSlot = front.querySelector('.net-slot');
    netShown = 0;
    nextSkyAt = 0;
    nextSeaAt = 0;
    flotsamLayer = el('div', 'flotsam');
    chestBtn = el('button', 'chest');
    chestBtn.setAttribute('aria-label', t(lang, 'chest.label'));
    chestBtn.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      if (chestTotal(state.chest) < 1) return;
      takeChest();
      refresh();
      save();
    });
    chestKey = '';
    stage.append(chestBtn, flotsamLayer);
    hud = createHud(
      lang,
      () => {
        state.settings.lang = lang === 'zh' ? 'en' : 'zh';
        save();
        build();
      },
      state.settings.sound,
      (on) => {
        state.settings.sound = on;
        sound.start();
        sound.setEnabled(on);
        save();
      },
    );
    panel = createPanel(lang, onBuy);
    game.append(hud.el, stage, panel.el);
    if (opts.debug) {
      game.append(
        createDebug(lang, infinite, {
          skip: (h) => (state.lastActiveAt -= h * 3600 * 1000),
          addAll: (n) => MATERIALS.forEach((m) => (state.materials[m] += n)),
          setInfinite: (on) => (infinite = on),
          skySkip: () => {
            skyOffset += SKY_CYCLE_MS / 5;
            nextSkyAt = 0;
          },
          ambient: () => triggerAmbient(),
          reset: () => {
            Object.assign(state, newGame(opts.now(), state.settings.lang));
            pending = null;
            popupEl = null;
            save();
            build();
          },
        }),
      );
    }
    root.replaceChildren(game);
    itemEls.clear();
    refresh(); // renders the panel, which decides how tall the stage is
    layoutStage();
    resizeObserver.disconnect();
    resizeObserver.observe(stage);
    if (pending) {
      const r = pending;
      pending = null;
      showReport(r);
    }
  }

  let stageW = 0;
  let stageH = 0;
  let scale = 1;
  function layoutStage() {
    stageW = stage.clientWidth;
    stageH = stage.clientHeight;
    scale = Math.max(stageW / 360, stageH / 640);
    stage.style.setProperty('--stage-w', `${stageW}px`);
    stage.style.setProperty('--scene-scale', String(scale));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    seaCanvas.width = Math.round(stageW * dpr);
    seaCanvas.height = Math.round(stageH * dpr);
    nextSeaAt = 0;
    chestBtn.style.left = `${sceneXToPx(CHEST_POS.x)}px`;
    chestBtn.style.top = `${sceneYToPx(CHEST_POS.y)}px`;
  }

  /** Scene (viewBox 360x640) to stage pixels, matching preserveAspectRatio="xMidYMid slice". */
  const sceneXToPx = (x: number) => stageW / 2 + (x - 180) * scale;
  const sceneYToPx = (y: number) => stageH / 2 + (y - 320) * scale;

  /** Pixel top for a lane (0 = far, 1 = near), kept inside the visible sea on short/wide screens. */
  function laneTop(lane: number): number {
    const top = sceneYToPx(SEA_BAND.top);
    const bottom = Math.min(sceneYToPx(SEA_BAND.bottom), stageH - 28);
    return top + lane * Math.max(0, bottom - top);
  }

  function syncFlotsam(now: number) {
    const alive = new Set(field.items.map((i) => i.id));
    for (const [id, e] of itemEls) {
      if (!alive.has(id)) {
        e.remove();
        itemEls.delete(id);
      }
    }
    for (const item of field.items) {
      if (itemEls.has(item.id)) continue;
      const b = el('button', 'item', itemIcon(item.material));
      b.setAttribute('aria-label', t(state.settings.lang, `mat.${item.material}`));
      b.dataset.mat = item.material;
      b.style.top = `${laneTop(item.lane)}px`;
      // Farther items look smaller and dimmer.
      b.style.setProperty('--depth', (0.65 + 0.5 * item.lane).toFixed(2));
      b.style.zIndex = String(10 + Math.round(item.lane * 10));
      b.style.animationDelay = `${-(now - item.spawnedAt)}ms`;
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const rect = b.getBoundingClientRect();
        const srect = stage.getBoundingClientRect();
        const got = collect(field, state, item.id);
        if (!got) return;
        sound.play('tap');
        b.remove();
        itemEls.delete(item.id);
        floatText(`+${formatNumber(got.amount, state.settings.lang)}`, rect.left - srect.left + 8, rect.top - srect.top - 4);
        flyToHud(got.material, rect.left + rect.width / 2, rect.top + rect.height / 2, 1);
      });
      itemEls.set(item.id, b);
      flotsamLayer.append(b);
    }
  }

  function renderChest() {
    const fill = Math.min(1, chestTotal(state.chest) / chestCapacity(state));
    const tier = state.levels.storage;
    // Redraw only when the picture would change (fill in 5% steps).
    const key = `${tier}:${Math.floor(fill * 20)}`;
    if (key === chestKey) return;
    chestKey = key;
    chestBtn.innerHTML = chestSvg(fill, tier) + `<span class="bar"><i style="width:${(fill * 100).toFixed(0)}%"></i></span>`;
    chestBtn.classList.toggle('full', fill >= 0.999);
  }

  function paintSea(now: number) {
    const ctx = seaCanvas.getContext('2d');
    if (!ctx || !stageW) return;
    const dpr = seaCanvas.width / stageW;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, seaCanvas.width, seaCanvas.height);
    // Same mapping as the SVG layers: preserveAspectRatio="xMidYMid slice".
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, (stageW / 2 - 180 * scale) * dpr, (stageH / 2 - 320 * scale) * dpr);
    drawSea(ctx, now, currentSky());
  }

  function refresh() {
    if (netSlot && netShown !== state.levels.net) {
      netSlot.innerHTML = netSvg(state.levels.net);
      netShown = state.levels.net;
    }
    renderChest();
    hud.update(state);
    panel.update(state);
  }

  function frame() {
    const now = opts.now();
    if (infinite) for (const m of MATERIALS) state.materials[m] = Math.max(state.materials[m], INFINITE_AMOUNT);
    const report = tick(state, now);
    if (report) showReport(report);
    updateField(field, now, Math.random);
    syncFlotsam(now);
    if (now >= nextSkyAt) {
      applySky(stage, currentSky());
      nextSkyAt = now + 1000;
    }
    if (now >= nextSeaAt) {
      paintSea(now);
      nextSeaAt = now + 33;
    }
    if (now >= nextAmbientAt) {
      triggerAmbient();
      nextAmbientAt = now + 20000 + Math.random() * 30000;
    }
    refresh();
    requestAnimationFrame(frame);
  }

  // Keep scene-anchored things (chest, flotsam) in place whenever the stage changes size.
  function onStageResize() {
    layoutStage();
    for (const [id, e] of itemEls) {
      const item = field.items.find((i) => i.id === id);
      if (item) e.style.top = `${laneTop(item.lane)}px`;
    }
  }

  // Start: credit time away, then build the screen.
  const startReport = applyOffline(state, opts.now());
  build();
  showReport(startReport);
  if (loaded.status === 'corrupt') {
    const note = el('div', 'note');
    note.textContent = t(state.settings.lang, 'save.corrupt');
    note.addEventListener('click', () => note.remove());
    game.append(note);
    setTimeout(() => note.remove(), 8000);
  }
  save();

  setInterval(save, AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    const visible = document.visibilityState === 'visible';
    if (!visible) save();
    sound.setVisible(visible);
  });
  // Browsers only allow sound after the player touches the page.
  root.addEventListener('pointerdown', () => sound.start(), { capture: true });
  window.addEventListener('pagehide', save);
  requestAnimationFrame(frame);
}
