import { AUTOSAVE_MS, MATERIALS, MAX_LEVEL, OFFLINE_MIN_REPORT_SECONDS, type DestId, type Materials, type UpgradeId } from '../core/data';
import { buyUpgrade, chestCapacity, chestTotal } from '../core/economy';
import { collect, newField, updateField, type FlotsamField } from '../core/flotsam';
import { loadGame, saveGame, type KV } from '../core/save';
import { applyOffline, claimDouble, collectChest, tick, type OfflineReport } from '../core/sim';
import { newGame, type GameState } from '../core/state';
import { detectLang, formatNumber, t } from '../i18n';
import { islandIcon, itemIcon } from './art';
import { DOCK_LIGHT, buildBoat, startVoyage, unloadBoat } from '../core/boat';
import { createWorld, type AnchorTag, type World } from '../world/scene';
import { boatPosition, flotsamPosition, worldLayout, type Tag } from '../world/layout';
import { boatModel } from '../world/looks';
import { createSeaMap, type SeaMap } from './seaMap';
import { createIslandView, type IslandView } from './islandView';
import { createBook, type Book } from './book';
import { createDecorSheet, type DecorSheet } from './decor';
import { decorate, type DecorId } from '../core/decor';
import { LAND_MAX, expand } from '../core/land';
import { FRIEND_MAX, deliver, friendOf } from '../core/commission';
import { createTalentTree } from './talentTree';
import { CURIOS, chestFind, foundCurio } from '../core/curios';
import { BUILDINGS, construct } from '../core/islands';
import { SoundEngine } from './audio';
import { SKY_CYCLE_MS, skyAt, tintSky } from './sky';
import { canPassLight, materialStars, nextSea, passLight, starlightFor, switchSea, starPercent } from '../core/seas';
import { nextGoal, type Goal } from '../core/advice';
import { canBuy } from '../core/economy';
import { formatEta } from '../i18n';
import { SEA_IDS, type SeaId } from '../core/data';
import { destDesc, destName } from './names';
import { storyText } from './story';
import { createDebug } from './debug';
import { dismiss, el, openMenu } from './dom';
import { createHud, type Hud } from './hud';
import { showArrival } from './offlinePopup';
import { arrivalLines } from '../core/arrival';
import { createPanel, type Panel } from './upgrades';
import { openCredits } from './credits';
import { canPolish, isPolished, polish } from '../core/polish';
import { T } from '../core/tuning';

export interface AppOptions {
  now: () => number;
  /** Test build only: a clock whose speed can be changed. */
  clock?: import('../core/testClock').TestClock;
  kv: KV;
  navLangs: readonly string[];
  debug: boolean;
}

export function startApp(root: HTMLElement, opts: AppOptions): void {
  const loaded = loadGame(opts.kv, opts.now(), detectLang(opts.navLangs));
  const state: GameState = loaded.state;
  const field: FlotsamField = newField(opts.now());
  const save = () => {
    saveGame(opts.kv, state);
    opts.clock?.save();
  };

  let hud!: Hud;
  let panel!: Panel;
  let stage!: HTMLElement;
  let flotsamLayer!: HTMLElement;
  let game!: HTMLElement;
  let chestBtn!: HTMLButtonElement;
  let chestBubble!: HTMLButtonElement;
  let boatBubble!: HTMLButtonElement;
  let bubbleKey = '';
  let hits: { el: HTMLButtonElement; tag: Tag }[] = [];
  let glints: { el: HTMLElement; tag: Tag; when: () => boolean }[] = [];
  let glintKey = '';
  let goalBar!: HTMLButtonElement;
  let goalKey = '';
  let goal: Goal | null = null;
  let lightShown = -1;
  let polishBtn!: HTMLButtonElement;
  let polishKey = '';
  let wasFast = false;
  let chestKey = '';
  /** The 3D world; null when this browser cannot draw it. */
  let world: World | null = null;
  let viewBtns!: HTMLElement;
  const itemEls = new Map<number, HTMLElement>();
  /** Test build: materials are topped up every frame so nothing ever runs out. */
  let infinite = opts.debug;
  const INFINITE_AMOUNT = 1e12;
  const resizeObserver = new ResizeObserver(() => onStageResize());
  const sound = new SoundEngine(state.settings.sound);
  let boatBtn!: HTMLButtonElement;
  let boatKey = '';
  let mapBtn!: HTMLButtonElement;
  let seaMap: SeaMap | null = null;
  let seasBtn!: HTMLButtonElement;
  let passBtn!: HTMLButtonElement;
  let chipsKey = '';
  let islandView: IslandView | null = null;
  let book: Book | null = null;
  let decorSheet: DecorSheet | null = null;
  let decorBtn!: HTMLButtonElement;
  let bookBtn!: HTMLButtonElement;
  /** Something new went into the book since it was last opened. */
  let newFind = false;
  /** Whether cargo was waiting last frame, to notice the boat coming home. */
  let hadCargo = state.boat.cargo !== null;
  /** Debug only: shifts the sky clock forward. */
  let skyOffset = 0;
  let nextSkyAt = 0;
  const currentSky = () => tintSky(skyAt(opts.now() + skyOffset), state.sea);

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
    const fillBefore = chestTotal(state.chest) / chestCapacity(state);
    const moved = collectChest(state);
    const found = chestFind(state, fillBefore, Math.random);
    if (found) setTimeout(() => onCurio(found), 700);
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
    seasBtn.setAttribute('aria-label', `${t(state.settings.lang, 'seas.short')}: ${t(state.settings.lang, `sea.${state.sea}`)}`);
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
    p3.textContent = t(lang, 'pass.gain', { n: starlightFor(state) + materialStars(state), p: starPercent() });
    const p4 = el('p');
    p4.textContent = t(lang, 'pass.mats', { m: materialStars(state) });
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
    box.append(h, p1, p2, p3, p4, actions);
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

  /** A new curio for the book: say what it is, and mark the book button. */
  function onCurio(id: string, x?: number, y?: number) {
    const lang = state.settings.lang;
    toast(t(lang, 'book.found', { name: t(lang, `curio.${id}.name`) }));
    sound.play('upgrade');
    newFind = true;
    if (x !== undefined && y !== undefined && !state.settings.calm) {
      const dot = el('div', 'spark');
      const g = game.getBoundingClientRect();
      dot.style.left = `${x - g.left}px`;
      dot.style.top = `${y - g.top}px`;
      game.append(dot);
      setTimeout(() => dot.remove(), 600);
    }
    sparkle(bookBtn);
    save();
    refresh();
  }

  let tree: HTMLElement | null = null;
  function openTree() {
    if (tree) return;
    tree = createTalentTree(state.settings.lang, state, {
      learned: (_id, node) => {
        sound.play('upgrade');
        sparkle(node);
        save();
      },
      changed: () => {
        save();
        refresh();
      },
      close: () => {
        if (tree) dismiss(tree);
        tree = null;
      },
    });
    game.append(tree);
  }

  function openBook() {
    if (book) return;
    newFind = false;
    book = createBook(state.settings.lang, state, () => {
      if (book) dismiss(book.el);
      book = null;
    });
    game.append(book.el);
    refresh();
  }

  function openDecor() {
    if (decorSheet) return;
    const lang = state.settings.lang;
    decorSheet = createDecorSheet(lang, state, {
      buy: (id: DecorId | 'land') => {
        if (id === 'land') {
          if (!expand(state)) return;
          toast(t(lang, 'land.toast', { n: state.land, max: LAND_MAX }));
        } else {
          if (!decorate(state, id)) return;
          toast(t(lang, 'decor.toast', { name: t(lang, `decor.${id}.${state.decor[id]}`) }));
        }
        sound.play('upgrade');
        save();
        refresh();
      },
      close: () => {
        if (decorSheet) dismiss(decorSheet.el);
        decorSheet = null;
      },
    });
    game.append(decorSheet.el);
  }

  function openMap() {
    if (seaMap) return;
    const lang = state.settings.lang;
    seaMap = createSeaMap(lang, state, {
      now: opts.now,
      deliver: (d: DestId) => {
        if (!deliver(state, d)) return;
        sound.play('upgrade');
        toast(t(lang, 'ask.thanks', { name: destName(lang, state.sea, d), n: friendOf(state, d), max: FRIEND_MAX }), 'rare');
        save();
        refresh();
      },
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
      // A haul from another sea is stored there, so it does not fly into this sea's counts.
      if (cargo.sea === state.sea) flyToHud(m, from.left + from.width / 2, from.top + from.height / 3, Math.min(6, 1 + Math.floor(Math.log10(cargo.haul[m] + 1) * 1.5)), i * 90);
      i++;
    }
    refresh();
    save();
    // The voyage log: what happened at sea (and any luck).
    const log = cargo.iceBreak ? t(lang, 'story.ice', { name: destName(lang, cargo.sea, cargo.dest) }) : storyText(lang, cargo.dest, cargo.story, destName(lang, cargo.sea, cargo.dest));
    if (log) setTimeout(() => toast(log, cargo.rare ? 'rare' : undefined), cargo.discovery || cargo.curio ? 2400 : 300);
    if (cargo.rare) sparkle(boatBtn);
    if (cargo.discovery) setTimeout(() => showDiscovery(cargo.sea, cargo.dest), 900);
    else if (cargo.curio) setTimeout(() => onCurio(cargo.curio!), 900);
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

  /** A short message; 'rare' ones (a lucky voyage) stay a little longer and glow. */
  function toast(text: string, kind?: 'rare') {
    game.querySelectorAll('.toast').forEach((old) => old.remove());
    const n = el('div', kind ? `toast ${kind}` : 'toast');
    n.textContent = text;
    game.append(n);
    setTimeout(() => n.remove(), kind ? 4200 : 2200);
  }

  function onBuy(id: UpgradeId) {
    const levelBefore = state.levels[id];
    if (!buyUpgrade(state, id)) return;
    if (state.levels[id] === levelBefore) {
      // One lighthouse part, not a whole level yet.
      const lang = state.settings.lang;
      save();
      sound.play('upgrade');
      toast(t(lang, 'toast.part', { name: t(lang, `part.${state.lightParts}`), n: state.lightParts, total: T.LIGHT_PARTS }));
      refresh();
      world?.pulse('light');
      return;
    }
    if (id === 'net') tutorialDone(2);
    save();
    sound.play('upgrade');
    const lang = state.settings.lang;
    toast(t(lang, 'toast.upgraded', { name: t(lang, `upg.${id}.name`), level: state.levels[id] }));
    panel.flash(id);
    refresh(); // draw the new look first, then celebrate it
    const target = id === 'net' ? hitEl('net') : id === 'storage' ? chestBtn : id === 'light' ? hitEl('light') : boatBtn;
    if (id === 'light' && state.levels.light >= MAX_LEVEL.light)
      setTimeout(() => toast(t(lang, state.sea === 'aurora' ? 'toast.allLit' : 'toast.lit')), 1200);
    const tag: Tag = id === 'net' ? 'net' : id === 'storage' ? 'chest' : id === 'light' ? 'light' : 'boat';
    world?.pulse(tag);
    sparkle(target);
  }

  const hitEl = (id: UpgradeId) => stage.querySelector<HTMLElement>(`.hit[data-hit="${id}"]`);

  function build() {
    const lang = state.settings.lang;
    document.documentElement.lang = lang;
    document.title = t(lang, 'game.title');
    game = el('div', 'game');
    stage = el('div', 'stage');
    world?.dispose();
    world = null;
    try {
      const loading = el('div', 'world-loading');
      loading.textContent = t(lang, 'world.loading', { n: 0 });
      stage.append(loading);
      world = createWorld(stage, {
        calm: state.settings.calm,
        onReady: () => {
          stage.classList.add('ready');
          loading.remove();
        },
        onProgress: (done, all) => {
          loading.textContent = t(lang, 'world.loading', { n: Math.round((100 * done) / Math.max(1, all)) });
        },
        onError: (msg) => console.warn(msg),
        onLost: () => build(),
      });
      world.setSky(currentSky(), state.sea);
      world.setLight(state.levels.light);
      lightShown = state.levels.light;
    } catch {
      const note = el('div', 'note');
      note.textContent = t(lang, 'world.noWebgl');
      stage.append(note);
    }
    // Buttons sit invisibly over the 3D things (for keyboards and screen readers);
    // taps on the picture itself are picked in the world.
    const onAct = (b: HTMLElement, fn: () => void) => b.addEventListener('click', fn);
    boatBtn = el('button', 'boat');
    boatBtn.setAttribute('aria-label', t(lang, 'boat.label'));
    onAct(boatBtn, () => tapThing('boat'));
    boatKey = '';
    stage.append(boatBtn);
    nextSkyAt = 0;
    flotsamLayer = el('div', 'flotsam');
    chestBtn = el('button', 'chest');
    chestBtn.setAttribute('aria-label', t(lang, 'chest.label'));
    onAct(chestBtn, () => tapThing('chest'));
    chestKey = '';
    // Bubbles above the chest and the boat say there is something to collect.
    chestBubble = el('button', 'bubble');
    chestBubble.type = 'button';
    chestBubble.addEventListener('click', () => tapThing('chest'));
    boatBubble = el('button', 'bubble');
    boatBubble.type = 'button';
    boatBubble.textContent = t(lang, 'bubble.unload');
    boatBubble.addEventListener('click', () => unload());
    bubbleKey = '';
    stage.append(chestBtn, flotsamLayer, chestBubble, boatBubble);
    // The lighthouse and the net open their upgrade.
    const hit = (id: UpgradeId, tag: Tag) => {
      const b = el('button', 'hit');
      b.type = 'button';
      b.dataset.hit = id;
      b.setAttribute('aria-label', t(lang, `upg.${id}.name`));
      onAct(b, () => tapThing(tag));
      stage.insertBefore(b, flotsamLayer);
      hits.push({ el: b, tag });
    };
    hits = [];
    hit('light', 'light');
    hit('net', 'net');
    // Small lights over things that can be mended right now.
    glints = [];
    const glint = (tag: Tag, when: () => boolean) => {
      const g = el('span', 'glint');
      g.setAttribute('aria-hidden', 'true');
      stage.append(g);
      glints.push({ el: g, tag, when });
    };
    glint('light', () => canBuy(state, 'light'));
    glint('net', () => canBuy(state, 'net'));
    glint('chest', () => canBuy(state, 'storage'));
    glintKey = '';
    // Back home / out to sea.
    viewBtns = el('div', 'view-btns');
    for (const v of ['home', 'sea'] as const) {
      const b = el('button', 'btn-quiet view-btn');
      b.type = 'button';
      b.dataset.view = v;
      b.innerHTML =
        v === 'home'
          ? `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8l6-5.5L14 8M4 6.5V14h8V6.5M6.5 14v-4h3v4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`
          : `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 7q2-2 4 0t4 0 4 0 2 0M1 11q2-2 4 0t4 0 4 0 2 0" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
      b.append(t(lang, `view.${v}`));
      b.addEventListener('click', () => world?.focus(v));
      viewBtns.append(b);
    }
    stage.append(viewBtns);
    if (world) watchTaps(world);
    lightShown = -1;
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
          world?.setCalm(state.settings.calm);
          save();
        },
      },
      {
        label: t(lang, 'settings.mini'),
        value: t(lang, state.settings.mini ? 'ui.on' : 'ui.off'),
        pick: () => setMini(!state.settings.mini),
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
      { label: t(lang, 'settings.credits'), pick: () => openCredits(game, lang) },
    ], openTree);
    game.classList.toggle('calm', state.settings.calm);
    game.classList.toggle('mini', state.settings.mini);
    // In corner mode the controls fold away; this brings them back.
    const exit = el('button', 'btn-quiet mini-exit');
    exit.type = 'button';
    exit.textContent = t(lang, 'ui.expand');
    exit.addEventListener('click', () => setMini(false));
    hud.el.append(exit);
    panel = createPanel(lang, onBuy);
    // Action bar: sea chart, seas (once there are two), and passing the light on.
    const toolbar = el('div', 'toolbar');
    mapBtn = el('button', 'btn-bar map-btn');
    mapBtn.type = 'button';
    mapBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 3l4-1.5 6 2 4-1.5v11l-4 1.5-6-2-4 1.5z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 1.5v11M11 3.5v11" stroke="currentColor" stroke-width="1"/></svg>`;
    mapBtn.append(t(lang, 'map.open'));
    mapBtn.addEventListener('click', openMap);
    bookBtn = el('button', 'btn-bar book-btn');
    bookBtn.type = 'button';
    bookBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3q3-1.5 6 0q3-1.5 6 0v10q-3-1.5-6 0q-3-1.5-6 0z M8 3v10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
    bookBtn.append(t(lang, 'book.open'));
    bookBtn.addEventListener('click', openBook);
    seasBtn = el('button', 'btn-bar seas-btn');
    seasBtn.type = 'button';
    seasBtn.setAttribute('aria-haspopup', 'menu');
    seasBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 10q2-2 4 0t4 0 4 0 2 0M1 13q2-2 4 0t4 0 4 0 2 0M8 2v5M5.5 4.5 8 2l2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
    seasBtn.append(t(lang, 'seas.short'));
    seasBtn.addEventListener('click', openSeas);
    passBtn = el('button', 'btn-bar pass-btn');
    passBtn.type = 'button';
    passBtn.textContent = `✦ ${t(lang, 'pass.short')}`;
    passBtn.title = t(lang, 'pass.button');
    passBtn.addEventListener('click', confirmPass);
    decorBtn = el('button', 'btn-bar decor-btn');
    decorBtn.type = 'button';
    decorBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.8 3.7 4 .6-2.9 2.8.7 4L8 10.7 4.4 12.6l.7-4L2.2 5.8l4-.6z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
    decorBtn.append(t(lang, 'decor.open'));
    decorBtn.addEventListener('click', openDecor);
    toolbar.append(mapBtn, bookBtn, decorBtn, seasBtn, passBtn);
    chipsKey = '';
    // On wide screens this column sits to the right of the scene.
    goalBar = el('button', 'goal');
    goalBar.type = 'button';
    goalBar.addEventListener('click', followGoal);
    goalKey = '';
    // Polishing the lamp with glow: more finds for a while.
    polishBtn = el('button', 'btn-quiet polish-btn');
    polishBtn.type = 'button';
    polishBtn.addEventListener('click', () => {
      if (!polish(state, opts.now())) return;
      sound.play('upgrade');
      world?.pulse('light');
      sparkle(hitEl('light'));
      polishKey = '';
      save();
      refresh();
    });
    polishKey = '';
    const side = el('div', 'side');
    side.append(goalBar, toolbar, polishBtn, panel.el);
    game.append(hud.el, stage, side);
    book = null;
    decorSheet = null;
    tree = null;
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
          speed: () => {
            const c = opts.clock;
            if (!c) return 1;
            const steps = [1, 10, 100, 1000];
            c.setSpeed(steps[(steps.indexOf(c.speed()) + 1) % steps.length]);
            return c.speed();
          },
          currentSpeed: () => opts.clock?.speed() ?? 1,
          stars: () => {
            state.starlight += 100;
            save();
            refresh();
          },
          curio: () => {
            const c = CURIOS.find((x) => x.sea === state.sea && !state.curios.includes(x.id));
            if (c) {
              foundCurio(state, c.id);
              onCurio(c.id);
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
          ambient: () => world?.summon(),
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
    world?.resize();
    resizeObserver.disconnect();
    resizeObserver.observe(stage);
    if (pending) {
      const r = pending;
      pending = null;
      showReport(r);
    }
  }

  /**
   * Keep each invisible button over its 3D thing, and each hint above it. A thing that is
   * off screen hides its button, bubble and hint rather than drawing outside the stage.
   */
  function placeOverlays() {
    if (!world) return;
    const top = hud.el.offsetHeight + 8;
    const put = (e: HTMLElement, tag: AnchorTag, dy = 0, minTop = 0) => {
      const a = world!.anchor(tag);
      const ok = !!a && a.visible && a.y + dy >= minTop;
      e.classList.toggle('offscreen', !ok);
      if (!ok || !a) return null;
      e.style.left = `${a.x}px`;
      e.style.top = `${a.y + dy}px`;
      return a;
    };
    put(chestBtn, 'chest');
    put(boatBtn, 'boat');
    for (const h of hits) put(h.el, h.tag);
    for (const g of glints) put(g.el, g.tag, -46, top);
    if (chestBubble.style.display !== 'none') put(chestBubble, 'chest', -48);
    if (boatBubble.style.display !== 'none') put(boatBubble, 'boat', -52);
    for (const [id, e] of itemEls) put(e, `flotsam:${id}`);
  }

  /** A tap on the picture: whatever is under the finger, unless the finger dragged the view. */
  function watchTaps(w: World) {
    let down: { x: number; y: number; at: number } | null = null;
    w.canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, at: e.timeStamp }));
    w.canvas.addEventListener('pointerup', (e) => {
      const d = down;
      down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || e.timeStamp - d.at > 300) return;
      const r = w.canvas.getBoundingClientRect();
      const hit = w.pick(e.clientX - r.left, e.clientY - r.top);
      if (hit) tapThing(hit, e.clientX, e.clientY);
    });
  }

  /** What tapping each thing does, from the picture or from its button. */
  function tapThing(tag: AnchorTag, x?: number, y?: number) {
    if (tag.startsWith('flotsam:')) return grabFlotsam(Number(tag.slice(8)), x, y);
    if (tag === 'chest') {
      if (chestTotal(state.chest) < 1) return panel.show('storage');
      takeChest();
      refresh();
      save();
    } else if (tag === 'boat') {
      if (state.boat.cargo) unload();
      else openMap();
    } else if (tag === 'light' || tag === 'net') panel.show(tag);
    else if (tag === 'dock') openMap();
    else if (tag.startsWith('island:')) {
      const d = tag.slice(7) as DestId;
      if (state.discovered.includes(d)) openIsland(d);
      else openMap();
    } else if (tag.startsWith('bld:')) openIsland(BUILDINGS[tag.slice(4) as keyof typeof BUILDINGS].island);
  }

  function grabFlotsam(id: number, x?: number, y?: number) {
    const b = itemEls.get(id);
    const rect = b?.getBoundingClientRect();
    const cx = x ?? (rect ? rect.left + rect.width / 2 : 0);
    const cy = y ?? (rect ? rect.top + rect.height / 2 : 0);
    const got = collect(field, state, id);
    if (!got) return;
    b?.remove();
    itemEls.delete(id);
    if (got.curio) return onCurio(got.curio, cx, cy);
    tutorialDone(0);
    sound.play('tap');
    const srect = stage.getBoundingClientRect();
    floatText(`+${formatNumber(got.amount, state.settings.lang)}`, cx - srect.left + 8, cy - srect.top - 4);
    flyToHud(got.material, cx, cy, 1);
  }

  function syncFlotsam() {
    const alive = new Set(field.items.map((i) => i.id));
    for (const [id, e] of itemEls) {
      if (!alive.has(id)) {
        e.remove();
        itemEls.delete(id);
      }
    }
    for (const item of field.items) {
      if (itemEls.has(item.id)) continue;
      const b = el('button', item.curio ? 'item curio' : 'item');
      b.type = 'button';
      b.setAttribute('aria-label', t(state.settings.lang, item.curio ? 'drift.curio' : `mat.${item.material}`));
      b.dataset.mat = item.material;
      b.addEventListener('click', () => tapThing(`flotsam:${item.id}`));
      itemEls.set(item.id, b);
      flotsamLayer.append(b);
    }
  }

  function renderChest() {
    const fill = Math.min(1, chestTotal(state.chest) / chestCapacity(state));
    const tier = state.levels.storage;
    const key = `${tier}:${Math.floor(fill * 20)}`;
    if (key === chestKey) return;
    chestKey = key;
    chestBtn.innerHTML = `<span class="bar"><i style="width:${(fill * 100).toFixed(0)}%"></i></span>`;
    chestBtn.classList.toggle('full', fill >= 0.999);
  }

  /** Corner mode: just the sea, the lighthouse and what you have; for keeping the game at the edge of the screen. */
  function setMini(on: boolean) {
    state.settings.mini = on;
    game.classList.toggle('mini', on);
    save();
  }

  /** "The brighter the light, the busier the sea": the world lights further out and livens up. */
  function renderLight() {
    if (lightShown === state.levels.light) return;
    lightShown = state.levels.light;
    world?.setLight(state.levels.light);
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
    if (g === 'net' || g === 'storage' || g === 'light' || g === 'recycle') panel.show(g);
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
  }

  function renderBoat() {
    const shown = state.boat.built && !state.boat.voyage;
    const laden = !!state.boat.cargo;
    const key = `${shown}:${laden}:${state.levels.cargo}`;
    if (key === boatKey) return;
    boatKey = key;
    boatBtn.style.display = shown ? '' : 'none';
    boatBtn.classList.toggle('laden', laden);
  }

  function renderPolish() {
    const lang = state.settings.lang;
    const now = opts.now();
    const show = state.discovered.includes('firefly') || state.materials.glow > 0;
    const on = isPolished(state, now);
    const label = on ? t(lang, 'polish.on', { m: Math.ceil((state.polishUntil - now) / 60000) }) : t(lang, 'polish.do', { n: T.POLISH_GLOW });
    const key = `${show}:${label}:${canPolish(state, now)}`;
    if (key === polishKey) return;
    polishKey = key;
    polishBtn.style.display = show ? '' : 'none';
    polishBtn.textContent = `✨ ${label}`;
    polishBtn.disabled = !canPolish(state, now);
  }

  function refresh() {
    renderPolish();
    renderBoat();
    renderBubbles();
    renderGlints();
    renderGoal();
    renderLight();
    bookBtn.classList.toggle('badge', newFind);
    decorBtn.style.display = state.levels.light >= T.DECOR_FROM_LIGHT ? '' : 'none';
    mapBtn.classList.toggle('badge', !!state.boat.cargo);
    passBtn.style.display = canPassLight(state) ? '' : 'none';
    renderSeas();
    mapBtn.classList.toggle('locked', state.levels.light < DOCK_LIGHT);
    seaMap?.update(state);
    decorSheet?.update(state);
    islandView?.update(state);
    renderChest();
    hud.update(state);
    panel.update(state);
  }

  function frame() {
    const now = opts.now();
    if (infinite) for (const m of MATERIALS) state.materials[m] = Math.max(state.materials[m], INFINITE_AMOUNT);
    const report = tick(state, now);
    // When the test clock runs fast, every frame is "time away": no arrival report for those,
    // nor for the first frame after it slows down again (that gap was still fast time).
    const fast = !!opts.clock && opts.clock.speed() > 1;
    if (report && !fast && !wasFast) showReport(report);
    wasFast = fast;
    const hasCargo = state.boat.cargo !== null;
    if (hasCargo && !hadCargo && !report) {
      toast(t(state.settings.lang, 'toast.boatBack'));
      sound.play('chest');
    }
    hadCargo = hasCargo;
    updateField(field, now, Math.random, state);
    syncFlotsam();
    if (world) {
      if (now >= nextSkyAt) {
        world.setSky(currentSky(), state.sea);
        nextSkyAt = now + 1000;
      }
      const v = state.boat.voyage;
      // A lucky trip shows on the way home: lantern lit, gulls along.
      const rare = !!v?.story?.bonus && now > (v.departAt + v.returnAt) / 2;
      const boat = v && v.sea === state.sea ? { ...boatPosition(state, now), model: boatModel(state.levels.speed, state.levels.cargo), rare } : null;
      const flotsam = field.items.map((i) => ({ id: i.id, ...flotsamPosition(i, now, state.land), curio: !!i.curio, material: i.material }));
      world.update(worldLayout(state, now), { boat, flotsam });
      const has = [...world.has].join(' ');
      if (stage.dataset.worldHas !== has) stage.dataset.worldHas = has;
    }
    refresh();
    placeOverlays();
    requestAnimationFrame(frame);
  }

  function onStageResize() {
    world?.resize();
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
