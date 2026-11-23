import { AUTOSAVE_MS, MATERIALS, OFFLINE_MIN_REPORT_SECONDS, type UpgradeId } from '../core/data';
import { buyUpgrade } from '../core/economy';
import { collect, newField, updateField, type FlotsamField } from '../core/flotsam';
import { loadGame, saveGame, type KV } from '../core/save';
import { applyOffline, claimDouble, tick, type OfflineReport } from '../core/sim';
import type { GameState } from '../core/state';
import { detectLang, formatNumber, t } from '../i18n';
import { itemIcon, sceneSvg } from './art';
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

/** Sea band in scene coordinates (viewBox 360x640) where flotsam drifts. */
const SEA_TOP = 432;
const SEA_BOTTOM = 590;

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
  const itemEls = new Map<number, HTMLElement>();

  // An open popup accumulates further reports instead of stacking dialogs.
  let pending: OfflineReport | null = null;
  let popupEl: HTMLElement | null = null;

  function showReport(r: OfflineReport) {
    if (r.creditedSeconds < OFFLINE_MIN_REPORT_SECONDS && !pending) return;
    if (pending) {
      pending.seconds += r.seconds;
      pending.creditedSeconds += r.creditedSeconds;
      for (const m of MATERIALS) pending.gained[m] += r.gained[m];
      popupEl?.remove();
    } else {
      pending = { seconds: r.seconds, creditedSeconds: r.creditedSeconds, gained: { ...r.gained } };
    }
    const report = pending;
    popupEl = showOfflinePopup(
      game,
      state.settings.lang,
      report,
      () => claimDouble(state, report),
      () => {
        pending = null;
        popupEl = null;
        save();
      },
    );
  }

  function build() {
    const lang = state.settings.lang;
    document.documentElement.lang = lang;
    document.title = t(lang, 'game.title');
    game = el('div', 'game');
    stage = el('div', 'stage');
    stage.append(el('div', 'scene', sceneSvg()));
    flotsamLayer = el('div', 'flotsam');
    stage.append(flotsamLayer);
    hud = createHud(lang, () => {
      state.settings.lang = lang === 'zh' ? 'en' : 'zh';
      save();
      build();
    });
    panel = createPanel(lang, (id: UpgradeId) => {
      if (buyUpgrade(state, id)) {
        save();
        hud.update(state);
        panel.update(state);
      }
    });
    game.append(hud.el, stage, panel.el);
    if (opts.debug) {
      game.append(
        createDebug(lang, {
          skip: (h) => (state.lastActiveAt -= h * 3600 * 1000),
          addAll: (n) => MATERIALS.forEach((m) => (state.materials[m] += n)),
        }),
      );
    }
    root.replaceChildren(game);
    itemEls.clear();
    layoutStage();
    hud.update(state);
    panel.update(state);
    if (pending) {
      const r = pending;
      pending = null;
      showReport({ ...r, gained: { ...r.gained } });
    }
  }

  let stageW = 0;
  let stageH = 0;
  function layoutStage() {
    stageW = stage.clientWidth;
    stageH = stage.clientHeight;
    stage.style.setProperty('--stage-w', `${stageW}px`);
  }

  /** Map a scene y (viewBox units) to pixels, matching preserveAspectRatio="xMidYMid slice". */
  function sceneYToPx(y: number): number {
    const scale = Math.max(stageW / 360, stageH / 640);
    return stageH / 2 + (y - 320) * scale;
  }

  /** Pixel top for a lane, kept inside the visible part of the sea on short/wide screens. */
  function laneTop(lane: number): number {
    const top = sceneYToPx(SEA_TOP);
    const bottom = Math.min(sceneYToPx(SEA_BOTTOM), stageH - 28);
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
      b.style.animationDelay = `${-(now - item.spawnedAt)}ms`;
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const rect = b.getBoundingClientRect();
        const srect = stage.getBoundingClientRect();
        const got = collect(field, state, item.id);
        if (!got) return;
        b.remove();
        itemEls.delete(item.id);
        const g = el('div', 'gain');
        g.textContent = `+${formatNumber(got.amount, state.settings.lang)}`;
        g.style.left = `${rect.left - srect.left + 8}px`;
        g.style.top = `${rect.top - srect.top - 4}px`;
        stage.append(g);
        setTimeout(() => g.remove(), 1300);
      });
      itemEls.set(item.id, b);
      flotsamLayer.append(b);
    }
  }

  function frame() {
    const now = opts.now();
    const report = tick(state, now);
    if (report) showReport(report);
    updateField(field, now, Math.random);
    syncFlotsam(now);
    hud.update(state);
    panel.update(state);
    requestAnimationFrame(frame);
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
    if (document.visibilityState === 'hidden') save();
  });
  window.addEventListener('pagehide', save);
  window.addEventListener('resize', () => {
    layoutStage();
    for (const [id, e] of itemEls) {
      const item = field.items.find((i) => i.id === id);
      if (item) e.style.top = `${laneTop(item.lane)}px`;
    }
  });
  requestAnimationFrame(frame);
}
