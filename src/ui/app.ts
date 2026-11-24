import { AUTOSAVE_MS, MATERIALS, MAX_LEVEL, OFFLINE_MIN_REPORT_SECONDS, type DestId, type Materials, type UpgradeId } from '../core/data';
import { buyUpgrade, chestCapacity, chestTotal } from '../core/economy';
import { collect, newField, updateField, type FlotsamField } from '../core/flotsam';
import { loadGame, saveGame, type KV } from '../core/save';
import { applyOffline, claimDouble, collectChest, tick, type OfflineReport } from '../core/sim';
import { newGame, type GameState } from '../core/state';
import { detectLang, formatNumber, t } from '../i18n';
import { allowedEvents, ambientLayer, playAmbient } from './ambient';
import { BOAT_POS, CHEST_POS, SEA_BAND, boatSvg, chestSvg, dockSvg, islandIcon, itemIcon, netSvg, sceneBackSvg, sceneFrontSvg, towerSvg } from './art';
import { DOCK_LIGHT, buildBoat, startVoyage, unloadBoat } from '../core/boat';
import { createSeaMap, type SeaMap } from './seaMap';
import { createIslandView, type IslandView } from './islandView';
import { construct } from '../core/islands';
import { drawSea } from './sea';
import { SoundEngine } from './audio';
import { SKY_CYCLE_MS, applySky, skyAt, tintSky } from './sky';
import { canPassLight, nextSea, passLight, starlightFor, switchSea } from '../core/seas';
import { nextGoal, type Goal } from '../core/advice';
import { canBuy } from '../core/economy';
import { formatEta } from '../i18n';
import { SEA_IDS, type SeaId } from '../core/data';
import { destDesc, destName } from './names';
import { createDebug } from './debug';
import { dismiss, el, openMenu } from './dom';
import { createHud, type Hud } from './hud';
import { showArrival } from './offlinePopup';
import { arrivalLines } from '../core/arrival';
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
  let chestBubble!: HTMLButtonElement;
  let boatBubble!: HTMLButtonElement;
  let bubbleKey = '';
  let hits: { el: HTMLButtonElement; rect: [number, number, number, number] }[] = [];
  let glints: { el: HTMLElement; at: [number, number]; when: () => boolean }[] = [];
  let glintKey = '';
  let goalBar!: HTMLButtonElement;
  let goalKey = '';
  let goal: Goal | null = null;
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
  let towerSlot: Element | null = null;
  let towerShown = 0;
  let dockSlot: Element | null = null;
  let boatBtn!: HTMLButtonElement;
  let boatKey = '';
  let mapBtn!: HTMLButtonElement;
  let seaMap: SeaMap | null = null;
  let seasBtn!: HTMLButtonElement;
  let passBtn!: HTMLButtonElement;
  let chipsKey = '';
  let islandView: IslandView | null = null;
  /** Whether cargo was waiting last frame, to notice the boat coming home. */
  let hadCargo = state.boat.cargo !== null;
  let nextSeaAt = 0;
  /** Debug only: shifts the sky clock forward. */
  let skyOffset = 0;
  let nextSkyAt = 0;
  let nextAmbientAt = opts.now() + 8000;
  const currentSky = () => tintSky(skyAt(opts.now() + skyOffset), state.sea);
  function triggerAmbient() {
    const kinds = allowedEvents(currentSky());
    playAmbient(farLayer, nearLayer, kinds[Math.floor(Math.random() * kinds.length)]);
  }

  // An open popup accumulates further time away instead of stacking dialogs.
  let pending: OfflineReport | null = null;
  let popupEl: HTMLElement | null = null;

  /** After time away: the arrival report, if anything came in. Further time away while it is open adds up. */
  function showReport(r: OfflineReport) {
    if (pending) {
      pending.seconds += r.seconds;
      pending.creditedSeconds += r.creditedSeconds;
    } else {
      if (r.seconds < OFFLINE_MIN_REPORT_SECONDS) return;
      pending = { seconds: r.seconds, creditedSeconds: r.creditedSeconds, gained: { ...r.gained } };
    }
    const lines = arrivalLines(state, pending);
    if (lines.length === 0) {
      pending = null;
      return;
    }
    popupEl?.remove();
    const lang = state.settings.lang;
    popupEl = showArrival(game, lang, lines, {
      destName: (d) => destName(lang, state.boat.cargo?.sea ?? state.sea, d),
      showUpgrade: (id) => panel.show(id),
      collect: (double) => {
        const moved = takeChest();
        if (double) claimDouble(state, moved);
        const cargo = state.boat.cargo;
        if (cargo) {
          unload();
          if (double) claimDouble(state, cargo.haul);
        }
        pending = null;
        popupEl = null;
        refresh();
        save();
      },
    });
    if (state.settings.calm) popupEl.classList.add('calm');
  }

  /** Empty the chest into the inventory with a little "+N" for each material. */
  function takeChest(): Materials {
    const moved = collectChest(state);
    if (chestTotal(moved) >= 1) tutorialDone(1);
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

  /** The seas button shows once a second sea is reached; it opens a list of them. */
  function renderSeas() {
    const key = `${state.sea}:${state.reached.join()}`;
    if (key === chipsKey) return;
    chipsKey = key;
    seasBtn.style.display = state.reached.length < 2 ? 'none' : '';
    seasBtn.querySelector('.val')!.textContent = t(state.settings.lang, `sea.${state.sea}`);
  }

  function openSeas() {
    const lang = state.settings.lang;
    openMenu(
      game,
      seasBtn,
      SEA_IDS.filter((id) => state.reached.includes(id)).map((id) => ({
        label: t(lang, `sea.${id}`),
        on: id === state.sea,
        pick: () => {
          if (id === state.sea || !switchSea(state, id, opts.now())) return;
          save();
          build();
        },
      })),
    );
  }

  function confirmPass() {
    if (!canPassLight(state)) return;
    const lang = state.settings.lang;
    const to = nextSea(state)!;
    const overlay = el('div', 'overlay');
    const box = el('div', 'popup pass');
    box.setAttribute('role', 'dialog');
    const h = el('h2');
    h.textContent = t(lang, 'pass.title');
    const p1 = el('p');
    p1.textContent = t(lang, 'pass.text', { from: t(lang, `sea.${state.sea}`), to: t(lang, `sea.${to}`) });
    const p2 = el('p');
    p2.textContent = t(lang, 'pass.keep');
    const p3 = el('p', 'perk');
    p3.textContent = t(lang, 'pass.gain', { n: starlightFor(state) });
    const actions = el('div', 'actions');
    const wait = el('button');
    wait.textContent = t(lang, 'pass.wait');
    wait.className = 'btn-ghost';
    wait.addEventListener('click', () => dismiss(overlay));
    const go = el('button', 'btn-primary');
    go.textContent = t(lang, 'pass.go');
    go.addEventListener('click', () => {
      dismiss(overlay);
      const from = state.sea;
      if (!passLight(state, opts.now())) return;
      save();
      travel(from, state.sea);
    });
    actions.append(wait, go);
    box.append(h, p1, p2, p3, actions);
    overlay.append(box);
    game.append(overlay);
  }

  /** A quiet fade to black and back, sailing from one sea to the next. */
  function travel(from: SeaId, to: SeaId) {
    const lang = state.settings.lang;
    const veil = el('div', 'travel');
    const text = el('p');
    text.textContent = t(lang, 'pass.travel', { from: t(lang, `sea.${from}`), to: t(lang, `sea.${to}`) });
    veil.append(text);
    game.append(veil);
    sound.play('upgrade');
    setTimeout(() => {
      build();
      game.append(veil);
      veil.classList.add('out');
      setTimeout(() => veil.remove(), 1600);
    }, 3200);
  }

  function openMap() {
    if (seaMap) return;
    const lang = state.settings.lang;
    seaMap = createSeaMap(lang, state, {
      now: opts.now,
      sail: (d: DestId) => {
        if (!startVoyage(state, d, opts.now())) return;
        sound.play('upgrade');
        save();
        refresh();
      },
      build: () => {
        if (!buildBoat(state)) return;
        sound.play('upgrade');
        save();
        refresh();
        sparkle(boatBtn);
      },
      buy: (id) => {
        if (!buyUpgrade(state, id)) return;
        sound.play('upgrade');
        save();
        refresh();
      },
      land: (d: DestId) => openIsland(d),
      close: () => {
        if (seaMap) dismiss(seaMap.el);
        seaMap = null;
      },
    });
    game.append(seaMap.el);
  }

  function openIsland(d: DestId) {
    if (seaMap) dismiss(seaMap.el);
    seaMap = null;
    const lang = state.settings.lang;
    islandView = createIslandView(lang, state, d, {
      build: (b) => {
        if (!construct(state, b, opts.now())) return;
        sound.play('upgrade');
        save();
        refresh();
        toast(t(lang, 'toast.built', { name: t(lang, `bld.${b}.name`), level: state.buildings[b] ?? 0 }));
        sparkle(islandView?.flash(b) ?? null);
      },
      back: () => {
        if (islandView) dismiss(islandView.el);
        islandView = null;
        openMap();
      },
    });
    game.append(islandView.el);
  }

  function unload() {
    const cargo = unloadBoat(state);
    if (!cargo) return;
    sound.play('chest');
    const lang = state.settings.lang;
    const from = boatBtn.getBoundingClientRect();
    let i = 0;
    for (const m of MATERIALS) {
      if (cargo.haul[m] < 1) continue;
      floatText(`+${formatNumber(cargo.haul[m], lang)}`, boatBtn.offsetLeft - 20, boatBtn.offsetTop - 30 - i * 18, itemIcon(m));
      flyToHud(m, from.left + from.width / 2, from.top + from.height / 3, Math.min(6, 1 + Math.floor(Math.log10(cargo.haul[m] + 1) * 1.5)), i * 90);
      i++;
    }
    refresh();
    save();
    if (cargo.discovery) setTimeout(() => showDiscovery(cargo.sea, cargo.dest), 900);
  }

  function showDiscovery(sea: SeaId, d: DestId) {
    const lang = state.settings.lang;
    const overlay = el('div', 'overlay');
    const box = el('div', 'popup discovery');
    box.setAttribute('role', 'dialog');
    const h = el('h2');
    h.textContent = t(lang, 'discover.title');
    const pic = el('div', 'island-pic', islandIcon(d));
    const name = el('h3');
    name.textContent = destName(lang, sea, d);
    const desc = el('p');
    desc.textContent = destDesc(lang, sea, d);
    const perk = el('p', 'perk');
    perk.textContent = t(lang, `dest.${d}.perk`);
    const ok = el('button', 'btn-primary');
    ok.textContent = t(lang, 'discover.ok');
    ok.addEventListener('click', () => dismiss(overlay));
    const actions = el('div', 'actions');
    actions.append(ok);
    box.append(h, pic, name, desc, perk, actions);
    overlay.append(box);
    game.append(overlay);
    sound.play('upgrade');
    sparkle(pic);
  }

  /** Item icons arc from a point on screen into the material's counter, then it bumps. */
  function flyToHud(m: (typeof MATERIALS)[number], x: number, y: number, n: number, delay = 0) {
    if (state.settings.calm) {
      hud.bump(m);
      return;
    }
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
    if (!target || state.settings.calm) return;
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
    game.querySelectorAll('.toast').forEach((old) => old.remove());
    const n = el('div', 'toast');
    n.textContent = text;
    game.append(n);
    setTimeout(() => n.remove(), 2200);
  }

  function onBuy(id: UpgradeId) {
    if (!buyUpgrade(state, id)) return;
    if (id === 'net') tutorialDone(2);
    save();
    sound.play('upgrade');
    const lang = state.settings.lang;
    toast(t(lang, 'toast.upgraded', { name: t(lang, `upg.${id}.name`), level: state.levels[id] }));
    panel.flash(id);
    refresh(); // draw the new look first, then celebrate it
    const target = id === 'net' ? netSlot : id === 'storage' ? chestBtn : id === 'light' ? towerSlot : boatBtn;
    if (id === 'light' && state.levels.light >= MAX_LEVEL.light)
      setTimeout(() => toast(t(lang, state.sea === 'aurora' ? 'toast.allLit' : 'toast.lit')), 1200);
    target?.classList.remove('pulse');
    void (target as HTMLElement | null)?.getBoundingClientRect();
    target?.classList.add('pulse');
    sparkle(target);
    if (id === 'light' && towerSlot && !state.settings.calm) {
      // The lighthouse flares up for a moment when it is mended.
      towerSlot.classList.remove('flare');
      void (towerSlot as unknown as HTMLElement).getBoundingClientRect();
      towerSlot.classList.add('flare');
    }
  }

  function build() {
    const lang = state.settings.lang;
    document.documentElement.lang = lang;
    document.title = t(lang, 'game.title');
    game = el('div', 'game');
    stage = el('div', 'stage');
    const back = el('div', 'scene back', sceneBackSvg(state.sea));
    seaCanvas = el('canvas', 'sea');
    farLayer = ambientLayer();
    const front = el('div', 'scene front', sceneFrontSvg(state.sea));
    nearLayer = ambientLayer();
    stage.append(back, seaCanvas, farLayer, front, nearLayer);
    netSlot = front.querySelector('.net-slot');
    netShown = 0;
    towerSlot = front.querySelector('.tower-slot');
    towerShown = 0;
    dockSlot = front.querySelector('.dock-slot');
    boatBtn = el('button', 'boat');
    boatBtn.setAttribute('aria-label', t(lang, 'boat.label'));
    boatBtn.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      if (state.boat.cargo) unload();
      else openMap();
    });
    boatKey = '';
    stage.append(boatBtn);
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
    // Bubbles above the chest and the boat say there is something to collect.
    chestBubble = el('button', 'bubble');
    chestBubble.type = 'button';
    chestBubble.addEventListener('click', () => {
      if (chestTotal(state.chest) < 1) return;
      takeChest();
      refresh();
      save();
    });
    boatBubble = el('button', 'bubble');
    boatBubble.type = 'button';
    boatBubble.textContent = t(lang, 'bubble.unload');
    boatBubble.addEventListener('click', () => unload());
    bubbleKey = '';
    stage.append(chestBtn, flotsamLayer, chestBubble, boatBubble);
    // Tap the lighthouse or the net to open its upgrade (scene rectangles, viewBox units).
    const hit = (id: UpgradeId, rect: [number, number, number, number]) => {
      const b = el('button', 'hit');
      b.type = 'button';
      b.dataset.hit = id;
      b.setAttribute('aria-label', t(lang, `upg.${id}.name`));
      b.addEventListener('click', () => panel.show(id));
      stage.insertBefore(b, flotsamLayer); // drifting items stay on top
      hits.push({ el: b, rect });
    };
    hits = [];
    hit('light', [156, 220, 204, 432]);
    hit('net', [20, 340, 132, 478]);
    // Small lights over things that can be mended right now.
    glints = [];
    const glint = (at: [number, number], when: () => boolean) => {
      const g = el('span', 'glint');
      g.setAttribute('aria-hidden', 'true');
      stage.append(g);
      glints.push({ el: g, at, when });
    };
    glint([180, 214], () => canBuy(state, 'light'));
    glint([76, 336], () => canBuy(state, 'net'));
    glint([CHEST_POS.x + 26, CHEST_POS.y - 50], () => canBuy(state, 'storage'));
    glintKey = '';
    hud = createHud(lang, game, () => [
      {
        label: t(lang, 'settings.sound'),
        value: t(lang, state.settings.sound ? 'ui.on' : 'ui.off'),
        pick: () => {
          state.settings.sound = !state.settings.sound;
          sound.start();
          sound.setEnabled(state.settings.sound);
          save();
        },
      },
      {
        label: t(lang, 'settings.calm'),
        value: t(lang, state.settings.calm ? 'ui.calmValue' : 'ui.full'),
        pick: () => {
          state.settings.calm = !state.settings.calm;
          game.classList.toggle('calm', state.settings.calm);
          save();
        },
      },
      {
        label: t(lang, 'settings.lang'),
        value: t(lang, 'lang.name'),
        pick: () => {
          state.settings.lang = lang === 'zh' ? 'en' : 'zh';
          save();
          build();
        },
      },
    ]);
    game.classList.toggle('calm', state.settings.calm);
    panel = createPanel(lang, onBuy);
    // Action bar: sea chart, seas (once there are two), and passing the light on.
    const toolbar = el('div', 'toolbar');
    mapBtn = el('button', 'btn-bar map-btn');
    mapBtn.type = 'button';
    mapBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 3l4-1.5 6 2 4-1.5v11l-4 1.5-6-2-4 1.5z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 1.5v11M11 3.5v11" stroke="currentColor" stroke-width="1"/></svg>`;
    mapBtn.append(t(lang, 'map.open'));
    mapBtn.addEventListener('click', openMap);
    seasBtn = el('button', 'btn-bar seas-btn');
    seasBtn.type = 'button';
    seasBtn.setAttribute('aria-haspopup', 'menu');
    seasBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 10q2-2 4 0t4 0 4 0 2 0M1 13q2-2 4 0t4 0 4 0 2 0M8 2v5M5.5 4.5 8 2l2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
    seasBtn.append(el('span', 'val'));
    seasBtn.addEventListener('click', openSeas);
    passBtn = el('button', 'btn-bar pass-btn');
    passBtn.type = 'button';
    passBtn.textContent = `✦ ${t(lang, 'pass.button')}`;
    passBtn.addEventListener('click', confirmPass);
    toolbar.append(mapBtn, seasBtn, passBtn);
    chipsKey = '';
    // On wide screens this column sits to the right of the scene.
    goalBar = el('button', 'goal');
    goalBar.type = 'button';
    goalBar.addEventListener('click', followGoal);
    goalKey = '';
    const side = el('div', 'side');
    side.append(goalBar, toolbar, panel.el);
    game.append(hud.el, stage, side);
    if (seaMap || islandView) {
      seaMap = null;
      islandView = null;
      openMap();
    }
    if (opts.debug) {
      game.append(
        createDebug(lang, infinite, {
          skip: (h) => {
            state.lastActiveAt -= h * 3600 * 1000;
            state.islandAt -= h * 3600 * 1000;
            const v = state.boat.voyage;
            if (v) {
              v.departAt -= h * 3600 * 1000;
              v.returnAt -= h * 3600 * 1000;
            }
          },
          lightMax: () => {
            state.levels.light = 10;
            refresh();
          },
          boatNow: () => {
            if (state.boat.voyage) state.boat.voyage.returnAt = opts.now();
          },
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
    boatBtn.style.left = `${sceneXToPx(BOAT_POS.x)}px`;
    boatBtn.style.top = `${sceneYToPx(BOAT_POS.y)}px`;
    placeBubbles();
    for (const h of hits) {
      const [x0, y0, x1, y1] = h.rect;
      Object.assign(h.el.style, { left: `${sceneXToPx(x0)}px`, top: `${sceneYToPx(y0)}px`, width: `${(x1 - x0) * scale}px`, height: `${(y1 - y0) * scale}px` });
    }
    for (const g of glints) Object.assign(g.el.style, { left: `${sceneXToPx(g.at[0])}px`, top: `${sceneYToPx(g.at[1])}px` });
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
        tutorialDone(0);
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
    placeBubbles(); // the chest's height can change with its look
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

  function renderGlints() {
    const key = glints.map((g) => (g.when() ? 1 : 0)).join('');
    if (key === glintKey) return;
    glintKey = key;
    glints.forEach((g, i) => (g.el.style.display = key[i] === '1' ? '' : 'none'));
  }

  function renderGoal() {
    const lang = state.settings.lang;
    const g = nextGoal(state);
    const p = { ...(g.params ?? {}) };
    if (typeof p.name === 'string') p.name = t(lang, `upg.${p.name}.name`);
    if (typeof p.time === 'number') p.time = formatEta(p.time, lang);
    const text = t(lang, g.key, p);
    goal = g;
    if (text === goalKey) return;
    goalKey = text;
    goalBar.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l1.6 4.9H15l-4.2 3 1.6 5L8 11l-4.4 2.9 1.6-5L1 5.9h5.4z" fill="currentColor"/></svg>`;
    const label = el('span', 'goal-label');
    label.textContent = t(lang, 'goal.label');
    const body = el('span', 'goal-text');
    body.textContent = text;
    goalBar.append(label, body);
    goalBar.classList.remove('new');
    void goalBar.offsetWidth;
    goalBar.classList.add('new');
  }

  /** Show where the goal is: ring the object, or open what it needs. */
  function followGoal() {
    if (!goal) return;
    const g = goal.target;
    if (g === 'map') return openMap();
    if (g === 'net' || g === 'storage' || g === 'light') panel.show(g);
    const spotOn: Element | null =
      g === 'chest' ? chestBtn : g === 'boat' ? boatBtn : g === 'flotsam' ? flotsamLayer : g === 'storage' ? chestBtn : stage.querySelector(`.hit[data-hit="${g}"]`);
    if (!spotOn) return;
    spotOn.classList.remove('spot');
    void (spotOn as HTMLElement).offsetWidth;
    spotOn.classList.add('spot');
    setTimeout(() => spotOn.classList.remove('spot'), 1800);
  }

  /** First-time steps move on when the player does each thing. */
  function tutorialDone(step: number) {
    if (state.stats.tutorial === step) {
      state.stats.tutorial = step + 1;
      save();
    }
  }

  function renderBubbles() {
    const lang = state.settings.lang;
    const total = chestTotal(state.chest);
    const fill = Math.min(1, total / chestCapacity(state));
    // While learning to collect, show the bubble as soon as there is anything in the chest.
    const showChest = total >= 1 && (fill >= 0.02 || state.stats.tutorial === 1);
    const showBoat = !!state.boat.cargo && !state.boat.voyage;
    const label = showChest ? t(lang, 'bubble.collect', { n: formatNumber(total, lang) }) : '';
    const key = `${label}:${fill >= 0.999}:${showBoat}`;
    if (key === bubbleKey) return;
    bubbleKey = key;
    chestBubble.style.display = showChest ? '' : 'none';
    chestBubble.textContent = label;
    chestBubble.classList.toggle('full', fill >= 0.999);
    boatBubble.style.display = showBoat ? '' : 'none';
    placeBubbles();
  }

  /** Bubbles sit just above the chest and the boat, wherever the scene puts them. */
  function placeBubbles() {
    if (!chestBtn || !chestBubble) return;
    chestBubble.style.left = `${sceneXToPx(CHEST_POS.x)}px`;
    chestBubble.style.top = `${sceneYToPx(CHEST_POS.y) - chestBtn.offsetHeight * 0.84 - 6}px`;
    boatBubble.style.left = `${sceneXToPx(BOAT_POS.x)}px`;
    boatBubble.style.top = `${sceneYToPx(BOAT_POS.y) - boatBtn.offsetHeight * 0.7 - 6}px`;
  }

  function renderBoat() {
    const shown = state.boat.built && !state.boat.voyage;
    const laden = !!state.boat.cargo;
    const key = `${shown}:${laden}:${state.levels.cargo}`;
    if (key === boatKey) return;
    boatKey = key;
    boatBtn.style.display = shown ? '' : 'none';
    boatBtn.innerHTML = boatSvg(laden, state.levels.cargo);
    boatBtn.classList.toggle('laden', laden);
  }

  function refresh() {
    if (towerSlot && towerShown !== state.levels.light) {
      towerSlot.innerHTML = towerSvg(state.levels.light);
      towerShown = state.levels.light;
    }
    if (dockSlot) {
      const want = state.levels.light >= DOCK_LIGHT || state.boat.built; // the boat sails with you, so its dock does too
      if (want !== dockSlot.hasChildNodes()) dockSlot.innerHTML = want ? dockSvg() : '';
    }
    renderBoat();
    renderBubbles();
    renderGlints();
    renderGoal();
    mapBtn.classList.toggle('badge', !!state.boat.cargo);
    passBtn.style.display = canPassLight(state) ? '' : 'none';
    renderSeas();
    mapBtn.classList.toggle('locked', state.levels.light < DOCK_LIGHT);
    seaMap?.update(state);
    islandView?.update(state);
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
    const hasCargo = state.boat.cargo !== null;
    if (hasCargo && !hadCargo && !report) {
      toast(t(state.settings.lang, 'toast.boatBack'));
      sound.play('chest');
    }
    hadCargo = hasCargo;
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
