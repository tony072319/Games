/**
 * The 3D world: keeps a three.js scene in step with the layout, draws sky, sea, light and glow,
 * and tells the page where things are on screen so the tappable buttons can sit over them.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { MaterialId, SeaId } from '../core/data';
import type { Sky } from '../ui/sky';
import { MODELS, modelUrl, type ModelId } from './assets';
import { diffItems } from './diff';
import { TILE_D, litRadiusWorld } from './hex';
import { shoresOf, type Tag, type WorldItem, type boatPosition } from './layout';
import { terrainGeometry, type Shape } from './terrain';

/** Ground colours for sculpted islands (the sea's wash is applied on top). */
const GROUND_COLOURS = { sand: 0xf2dca0, grass: 0x8cc25a, rock: 0xa39a8c, path: 0xcdb48a };
import { paletteFor, type Palette } from './palette';
import { createSky } from './sky3d';
import { disposeToon, toonMaterial, toonRamp } from './toon';
import { createWater } from './water';
import { createLife, type Life } from './life';

export type AnchorTag = Tag | `flotsam:${number}`;
export interface FlotsamView {
  id: number;
  x: number;
  z: number;
  curio: boolean;
  material: MaterialId;
}
export interface WorldExtra {
  /** Boats at sea (n: which boat); `rare` when one is bringing something special home. */
  boats: (ReturnType<typeof boatPosition> & { model: ModelId; rare?: boolean; n: 0 | 1 })[];
  flotsam: FlotsamView[];
}
export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}
export interface World {
  update(items: WorldItem[], extra: WorldExtra): void;
  setSky(sky: Sky, sea: SeaId): void;
  setLight(level: number): void;
  setCalm(on: boolean): void;
  anchor(tag: AnchorTag): ScreenPoint | null;
  /** The tag under a point in the canvas (CSS px from its top-left), if any. */
  pick(x: number, y: number): AnchorTag | null;
  pulse(tag: Tag): void;
  /** Test build: show a passing whale now. */
  summon(): void;
  focus(where: 'home' | 'sea' | Tag): void;
  resize(): void;
  dispose(): void;
  readonly has: Set<Tag>;
  readonly canvas: HTMLCanvasElement;
  /** Test hook: renderer memory counters. */
  readonly info: () => { geometries: number; textures: number };
  /** Test hook: the three.js scene. */
  readonly scene: THREE.Scene;
}
export interface WorldOptions {
  calm: boolean;
  onReady(): void;
  onError(msg: string): void;
  /** The drawing context was lost and has not come back (some phones never give it back): rebuild the world. */
  onLost?(): void;
  /** How many models have arrived out of those asked for so far. */
  onProgress?(loaded: number, total: number): void;
}

const FLOTSAM_MODEL: Record<MaterialId, ModelId> = {
  wood: 'lh/driftwood_log',
  plastic: 'kp/bottle',
  rope: 'harbor/rope_coil',
  metal: 'kk/barrel',
  glow: 'kp/bottle',
};
const CURIO_MODEL: ModelId = 'kp/chest';

interface Template {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
  /** Height and longest ground side at scale 1. */
  h: number;
  len: number;
  skinned: boolean;
}

interface Placed {
  item: WorldItem;
  obj: THREE.Object3D;
  mixer?: THREE.AnimationMixer;
  extras: THREE.Object3D[];
  baseY: number;
}

const DEFAULT_TARGET = new THREE.Vector3(0.8, 1.8, 1.6);
/** The home island a new sea starts with reaches about this far; the default camera frames it. */
const HOME_REACH = 6;
// Pulled back so the two-ring island and its third-ring decorations fit with room around them.
const DEFAULT_CAM = DEFAULT_TARGET.clone().add(new THREE.Vector3(13, 11, 27).sub(DEFAULT_TARGET).multiplyScalar(1.1));

export function createWorld(host: HTMLElement, opts: WorldOptions): World {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const small = () => host.clientWidth < 600;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.className = 'world';
  host.prepend(canvas);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
  cam.position.copy(DEFAULT_CAM);
  const controls = new OrbitControls(cam, canvas);
  controls.target.copy(DEFAULT_TARGET);
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 70;
  controls.maxPolarAngle = 1.36;
  controls.enableDamping = !opts.calm;
  controls.update();

  const sky = createSky();
  scene.add(sky.mesh);
  scene.fog = new THREE.Fog(0xf4c6c0, 70, 220);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.6);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(-14, 18, 10);
  key.castShadow = true;
  const shadowSize = small() ? 1024 : 2048;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.radius = 6;
  // Wide enough for the fully grown island.
  Object.assign(key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
  key.shadow.bias = -0.0006;
  scene.add(key);
  const water = createWater();
  scene.add(water.mesh);
  const sandMat = new THREE.MeshToonMaterial({ color: 0xf6dfae, gradientMap: toonRamp() });
  // Sculpted ground: colours come from the mesh; flat faces for the low-poly look.
  const groundMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
  const sandGeo = new THREE.CylinderGeometry((TILE_D / 2) * 1.28, (TILE_D / 2) * 1.38, 0.5, 6);
  const glowGeo = new THREE.SphereGeometry(1, 14, 10);
  const hitGeo = new THREE.SphereGeometry(0.75, 8, 6);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const glowMats = new Map<number, THREE.MeshBasicMaterial>();
  const glowMat = (c: number) => {
    let m = glowMats.get(c);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3), toneMapped: false });
      glowMats.set(c, m);
    }
    return m;
  };

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.6, 0.97);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- models ----------
  const gltf = new GLTFLoader();
  const fbx = new FBXLoader();
  const templates = new Map<ModelId, Promise<Template | null>>();
  /** Loaded templates, kept so dispose can free them right away. */
  const loaded: Template[] = [];
  let asked = 0;
  let arrived = 0;
  const warned = new Set<string>();
  function template(id: ModelId): Promise<Template | null> {
    let p = templates.get(id);
    if (p) return p;
    asked++;
    opts.onProgress?.(arrived, asked);
    const url = modelUrl(id);
    const load: Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }> = url.endsWith('.fbx')
      ? fbx.loadAsync(url).then((g) => ({ scene: g, animations: g.animations }))
      : gltf.loadAsync(url).then((g) => ({ scene: g.scene, animations: g.animations }));
    p = load
      .then(({ scene: s, animations }) => {
        let skinned = false;
        s.traverse((c) => {
          if ((c as THREE.SkinnedMesh).isSkinnedMesh) skinned = true;
        });
        const box = new THREE.Box3().setFromObject(s);
        const size = box.getSize(new THREE.Vector3());
        const t: Template = { scene: s, animations, h: size.y || 1, len: Math.max(size.x, size.z) || 1, skinned };
        if (disposed) freeTemplate(t);
        else loaded.push(t);
        return t;
      })
      .catch(() => {
        if (!warned.has(url)) {
          warned.add(url);
          console.warn(`world: could not load ${url}`);
        }
        return null;
      });
    p.then(() => {
      arrived++;
      if (!disposed) opts.onProgress?.(arrived, asked);
    });
    templates.set(id, p);
    return p;
  }

  function freeTemplate(t: Template) {
    t.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      ([] as THREE.Material[]).concat(m.material).forEach((x) => {
        (x as THREE.MeshStandardMaterial).map?.dispose();
        x.dispose();
      });
    });
  }

  function instance(t: Template, item: { model: ModelId; size?: number; tint?: number; wash?: [number, number] }): THREE.Object3D {
    const o = t.skinned ? cloneSkinned(t.scene) : t.scene.clone(true);
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.material = Array.isArray(m.material) ? m.material.map((x) => toonMaterial(x, item.tint, item.wash)) : toonMaterial(m.material, item.tint, item.wash);
      if (t.skinned) m.frustumCulled = false;
    });
    const info = MODELS[item.model];
    const size = item.size ?? info.size;
    o.scale.setScalar(info.fit === 'height' ? size / t.h : size / t.len);
    return o;
  }

  // ---------- state ----------
  const placed = new Map<string, Placed>();
  let items: WorldItem[] = [];
  let extra: WorldExtra = { boats: [], flotsam: [] };
  let pal: Palette = paletteFor({ skyTop: '', skyMid: '', skyLow: '', horizon: '', seaTint: '', seaTintOpacity: 0, sun: 1, moon: 0, stars: 0, cloudWarm: 1 }, 'dusk');
  let light = 1;
  let calm = opts.calm;
  const has = new Set<Tag>();
  const tagObj = new Map<Tag, THREE.Object3D>();
  let generation = 0;
  let disposed = false;
  const lights: THREE.PointLight[] = [];

  function addGlow(p: Placed) {
    const g = p.item.glow;
    if (!g) return;
    const box = new THREE.Box3().setFromObject(p.obj);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const add = (o: THREE.Object3D) => {
      scene.add(o);
      p.extras.push(o);
    };
    if (g === 'lamp') {
      const s = new THREE.Mesh(glowGeo, glowMat(0xffd890));
      s.scale.setScalar(Math.max(0.25, size.x * 0.28));
      s.position.set(c.x, box.min.y + size.y * 0.855, c.z);
      s.userData.lamp = true;
      add(s);
      const pl = new THREE.PointLight(0xffc07a, 8, 12, 1.6);
      pl.position.copy(s.position);
      pl.userData.base = 8;
      lights.push(pl);
      add(pl);
    } else if (g === 'window' || g === 'pane') {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.05), glowMat(0xffb860));
      w.userData.ownGeometry = true;
      // On the building's front, whichever way it faces.
      const r = p.item.rotY;
      const half = Math.min(size.x, size.z) / 2;
      w.position.set(c.x + Math.sin(r) * half, box.min.y + Math.min(0.75, size.y * 0.45), c.z + Math.cos(r) * half);
      w.rotation.y = r;
      add(w);
      // A pane only glows; a lit window also casts a little light (kept few: lights are costly).
      if (g === 'pane') return;
      const pl = new THREE.PointLight(0xffa860, 2.5, 3.5);
      pl.position.copy(w.position).add(new THREE.Vector3(0, 0, 0.4));
      pl.userData.base = 2.5;
      lights.push(pl);
      add(pl);
    } else if (g === 'lantern') {
      const s = new THREE.Mesh(glowGeo, glowMat(0xffd080));
      s.scale.setScalar(0.1);
      s.position.set(c.x, box.max.y - 0.12, c.z);
      add(s);
    } else if (g === 'fire') {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 8), glowMat(0xff9a40));
      f.userData.ownGeometry = true;
      f.position.set(c.x, box.max.y + 0.08, c.z);
      f.userData.flame = true;
      add(f);
      const pl = new THREE.PointLight(0xff8a40, 3, 4);
      pl.position.set(c.x, box.max.y + 0.3, c.z);
      pl.userData.base = 3;
      pl.userData.flicker = true;
      lights.push(pl);
      add(pl);
    }
  }

  function removePlaced(key: string) {
    const p = placed.get(key);
    if (!p) return;
    scene.remove(p.obj);
    if (p.obj.userData.ownGeometry) (p.obj as THREE.Mesh).geometry.dispose();
    for (const e of p.extras) {
      scene.remove(e);
      if (e.userData.ownGeometry) (e as THREE.Mesh).geometry.dispose();
      const i = lights.indexOf(e as THREE.PointLight);
      if (i >= 0) lights.splice(i, 1);
    }
    p.mixer?.stopAllAction();
    placed.delete(key);
  }

  function putItem(item: WorldItem, gen: number) {
    if (item.ground) {
      // Sculpted ground: built here from its shape, no model to load.
      const mesh = new THREE.Mesh(terrainGeometry(item.ground, { ...GROUND_COLOURS, wash: item.wash }), groundMat);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.userData.ownGeometry = true;
      mesh.userData.key = item.key;
      if (item.tag) mesh.userData.tag = item.tag;
      scene.add(mesh);
      placed.set(item.key, { item, obj: mesh, extras: [], baseY: 0 });
      if (item.tag) tagObj.set(item.tag, mesh);
      return;
    }
    template(item.model).then((t) => {
      if (disposed || gen !== generation || !t) return;
      if (placed.has(item.key) || !items.some((i) => i.key === item.key)) return;
      const obj = instance(t, item);
      obj.position.set(item.x, item.y, item.z);
      obj.rotation.y = item.rotY;
      if (item.tag) obj.userData.tag = item.tag;
      obj.userData.key = item.key;
      scene.add(obj);
      const p: Placed = { item, obj, extras: [], baseY: item.y };
      if (item.anim && t.animations.length) {
        p.mixer = new THREE.AnimationMixer(obj);
        const clip = t.animations.find((a) => a.name === item.anim) ?? t.animations[0];
        p.mixer.clipAction(clip).play();
      }
      if (MODELS[item.model].url.includes('hex_grass')) {
        const sand = new THREE.Mesh(sandGeo, sandMat);
        sand.position.set(item.x, -0.38, item.z);
        sand.receiveShadow = true;
        scene.add(sand);
        p.extras.push(sand);
      }
      addGlow(p);
      placed.set(item.key, p);
      if (item.tag) tagObj.set(item.tag, obj);
    });
  }

  function syncTags() {
    has.clear();
    tagObj.clear();
    for (const i of items) if (i.tag) has.add(i.tag);
    for (const p of placed.values()) if (p.item.tag) tagObj.set(p.item.tag, p.obj);
  }

  // ---------- moving things: the boat at sea, drifting finds ----------
  type SeaBoat = { model: ModelId; obj: THREE.Object3D; escort?: THREE.Group };
  /** Boats at sea, by which boat they are. */
  const voyageBoats = new Map<0 | 1, SeaBoat>();
  const drift = new Map<number, THREE.Object3D>();

  /** Coming home lucky: a warm lantern on the boat and two gulls flying along. */
  function escort(vb: SeaBoat, on: boolean) {
    if (on && !vb.escort) {
      const g = new THREE.Group();
      const lamp = new THREE.PointLight(0xffc56b, 6, 6, 1.6);
      lamp.position.set(0, 1.1, 0.4);
      g.add(lamp);
      template('lh/seagull').then((t) => {
        if (!t || vb.escort !== g) return;
        for (let i = 0; i < 2; i++) {
          const gull = instance(t, { model: 'lh/seagull' });
          gull.userData.orbit = i * Math.PI;
          g.add(gull);
        }
      });
      vb.obj.add(g);
      vb.escort = g;
    } else if (!on && vb.escort) {
      vb.obj.remove(vb.escort);
      vb.escort = undefined;
    }
    if (vb.escort) {
      const tt = performance.now() / 1000;
      for (const c of vb.escort.children)
        if (c.userData.orbit !== undefined) {
          const a = tt * 1.4 + c.userData.orbit;
          c.position.set(Math.cos(a) * 1.3, 2 + Math.sin(tt * 3 + c.userData.orbit) * 0.15, Math.sin(a) * 1.3);
          c.rotation.y = -a;
        }
    }
  }

  function syncExtra() {
    const want = new Map(extra.boats.filter((b) => !b.atDock).map((b) => [b.n, b] as const));
    for (const [n, vb] of voyageBoats)
      if (!want.has(n) || want.get(n)!.model !== vb.model) {
        scene.remove(vb.obj);
        voyageBoats.delete(n);
      }
    for (const [n, b] of want) {
      let vb = voyageBoats.get(n);
      if (!vb) {
        const holder: SeaBoat = { model: b.model, obj: new THREE.Group() };
        scene.add(holder.obj);
        template(b.model).then((t) => {
          if (t && voyageBoats.get(n) === holder) holder.obj.add(instance(t, { model: b.model }));
        });
        voyageBoats.set(n, holder);
        vb = holder;
      }
      vb.obj.position.set(b.x, -0.22, b.z);
      vb.obj.rotation.y = b.rotY;
      escort(vb, !!b.rare);
    }
    const alive = new Set(extra.flotsam.map((f) => f.id));
    for (const [id, o] of drift)
      if (!alive.has(id)) {
        scene.remove(o);
        drift.delete(id);
      }
    for (const f of extra.flotsam) {
      let o = drift.get(f.id);
      if (!o) {
        const g = new THREE.Group();
        g.userData.tag = `flotsam:${f.id}`;
        // A finger-sized target: the find itself can be a thin log.
        const hitBall = new THREE.Mesh(hitGeo, hitMat);
        hitBall.position.y = 0.2;
        g.add(hitBall);
        o = g;
        drift.set(f.id, g);
        scene.add(g);
        const model = f.curio ? CURIO_MODEL : FLOTSAM_MODEL[f.material];
        template(model).then((t) => {
          if (t && drift.get(f.id) === g) {
            const m = instance(t, { model, size: f.curio ? 0.45 : undefined });
            g.add(m);
            if (f.curio) {
              const s = new THREE.Mesh(glowGeo, glowMat(0xfff0b0));
              s.scale.setScalar(0.12);
              s.position.y = 0.5;
              g.add(s);
            }
          }
        });
      }
      o.position.x = f.x;
      o.position.z = f.z;
    }
  }

  // ---------- life ----------
  let life: Life | null = null;
  try {
    life = createLife(scene, template, instance);
  } catch {
    life = null;
  }

  // ---------- camera focus ----------
  /** How far the home island reaches (world units); the home view pulls back as it grows. */
  let islandReach = 0;
  /** The home island's ground (for the life around it). */
  let homeGround: Shape | undefined;
  const homeScale = () => Math.max(1, islandReach / HOME_REACH) ** 0.6;
  let focusTo: { target: THREE.Vector3; dist: number; dir?: THREE.Vector3 } | null = null;
  let lastInput = performance.now();
  controls.addEventListener('start', () => {
    focusTo = null;
    lastInput = performance.now();
  });
  controls.addEventListener('end', () => (lastInput = performance.now()));

  // ---------- pulses ----------
  const pulses: { obj: THREE.Object3D; t0: number }[] = [];
  /** Pulses asked for before the world caught up with a level-up: started once the new model is in. */
  let pending: { tag: Tag; at: number; updated: boolean }[] = [];
  function startPulse(o: THREE.Object3D, now: number) {
    if (pulses.some((p) => p.obj === o)) return;
    if (o.userData.baseScale === undefined) o.userData.baseScale = o.scale.x;
    pulses.push({ obj: o, t0: now });
  }

  // ---------- sizing ----------
  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    composer.setSize(w, h);
    cam.aspect = w / h;
    // Portrait phones: step back so the island fits across.
    cam.fov = w < h ? 40 : 34;
    cam.updateProjectionMatrix();
  }
  resize();

  // ---------- loop ----------
  let last = performance.now();
  let t = 0;
  let raf = 0;
  let lastDraw = 0;
  const shores: [number, number, number][] = [];
  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (document.visibilityState === 'hidden') return;
    if (calm && now - lastDraw < 32) return;
    lastDraw = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const speed = calm ? 0.25 : 1;
    t += dt * speed;
    water.tick(t);
    sky.tick(t);
    for (const p of placed.values()) {
      p.mixer?.update(dt * speed);
      if (p.item.bob) {
        p.obj.position.y = p.baseY + Math.sin(t * 1.2 + p.item.x) * 0.05;
        p.obj.rotation.z = Math.sin(t * 0.9 + p.item.z) * 0.035;
      }
    }
    for (const o of drift.values()) {
      o.position.y = -0.2 + Math.sin(t * 2 + o.position.x) * 0.06;
      o.rotation.y += dt * 0.4;
    }
    for (const vb of voyageBoats.values()) vb.obj.position.y = -0.22 + Math.sin(t * 1.3) * 0.05;
    for (const l of lights) {
      const base = l.userData.base as number;
      l.intensity = l.userData.flicker ? base * (0.8 + Math.random() * 0.4) : base * (1 + pal.night * 0.25);
    }
    scene.traverse((o) => {
      if (o.userData.flame) o.scale.y = 0.8 + Math.random() * 0.4;
    });
    pending = pending.filter((q) => {
      if (now - q.at > 4000) return false;
      if (!q.updated) return true;
      const o = tagObj.get(q.tag);
      if (!o || !items.some((i) => i.key === o.userData.key)) return true;
      startPulse(o, now);
      return false;
    });
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      const base = p.obj.userData.baseScale as number;
      const k = (now - p.t0) / 600;
      if (k >= 1) {
        p.obj.scale.setScalar(base);
        pulses.splice(i, 1);
      } else p.obj.scale.setScalar(base * (1 + Math.sin(k * Math.PI) * 0.12));
    }
    let chimney: THREE.Vector3 | null = null;
    for (const p of placed.values()) {
      if (p.item.key.startsWith('house:')) {
        const hb = new THREE.Box3().setFromObject(p.obj);
        chimney = new THREE.Vector3(hb.min.x + 0.45, hb.max.y - 0.1, hb.min.z + 0.6);
      }
      if (p.item.model.includes('flag')) p.obj.rotation.y = p.item.rotY + Math.sin(t * 2.2 + p.item.x) * 0.25;
    }
    life?.update(dt * speed, t, { night: pal.night, light, calm, cam, chimney, home: homeGround });
    if (focusTo) {
      controls.target.lerp(focusTo.target, 0.08);
      const dir = focusTo.dir ? focusTo.dir.clone() : cam.position.clone().sub(controls.target).normalize();
      const want = controls.target.clone().add(dir.multiplyScalar(focusTo.dist));
      cam.position.lerp(want, 0.08);
      if (cam.position.distanceTo(want) < 0.05) focusTo = null;
    } else if (!calm && now - lastInput > 4000) {
      // Drift back toward the usual view when nobody is touching it.
      controls.target.lerp(DEFAULT_TARGET, 0.01);
    }
    controls.update();
    composer.render();
  }
  raf = requestAnimationFrame(loop);

  // ---------- context loss: three re-uploads on restore; keep the loop alive ----------
  // Some phones never give a lost context back: if it is still lost a little after the page is
  // visible again, ask for a fresh world.
  let lostTimer = 0;
  const checkLost = () => {
    window.clearTimeout(lostTimer);
    lostTimer = window.setTimeout(() => {
      if (!disposed && renderer.getContext().isContextLost() && document.visibilityState === 'visible') opts.onLost?.();
    }, 3000);
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible' && renderer.getContext().isContextLost()) checkLost();
  };
  document.addEventListener('visibilitychange', onVisible);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (document.visibilityState === 'visible') checkLost();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    window.clearTimeout(lostTimer);
    resize();
    world.setSky(lastSky, lastSea);
  });

  let lastSky: Sky = { skyTop: '', skyMid: '', skyLow: '', horizon: '', seaTint: '', seaTintOpacity: 0, sun: 1, moon: 0, stars: 0, cloudWarm: 1 };
  let lastSea: SeaId = 'dusk';
  let readySent = false;
  const readyTimer = window.setTimeout(() => sendReady(), 10000);
  function sendReady() {
    if (readySent || disposed) return;
    readySent = true;
    window.clearTimeout(readyTimer);
    opts.onReady();
  }

  const ndc = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();

  const world: World = {
    canvas,
    has,
    scene,
    info: () => ({ geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }),
    update(next, ex) {
      const d = diffItems(items, next);
      items = next;
      for (const q of pending) q.updated = true;
      extra = ex;
      for (const k of d.remove) removePlaced(k);
      for (const m of d.move) {
        const p = placed.get(m.key);
        if (!p) continue;
        p.item = m;
        p.baseY = m.y;
        p.obj.position.set(m.x, m.y, m.z);
        p.obj.rotation.y = m.rotY;
      }
      const gen = generation;
      if (d.add.length) {
        const loads = d.add.filter((i) => !i.ground).map((i) => template(i.model));
        for (const i of d.add) putItem(i, gen);
        if (!readySent) Promise.all(loads).then(() => setTimeout(sendReady, 50));
      }
      syncTags();
      shores.length = 0;
      shores.push(...shoresOf(next));
      water.setShores(shores);
      // How far the home island reaches: the camera frames it when you go home.
      homeGround = next.find((i) => i.ground?.kind === 'home')?.ground;
      const reach = homeGround?.radius ?? 0;
      if (islandReach === 0 && reach > 0) {
        islandReach = reach;
        if (reach > HOME_REACH) {
          cam.position.copy(DEFAULT_TARGET).add(DEFAULT_CAM.clone().sub(DEFAULT_TARGET).multiplyScalar(homeScale()));
          controls.update();
        }
      }
      islandReach = reach;
      syncExtra();
    },
    setSky(s, sea) {
      lastSky = s;
      lastSea = sea;
      pal = paletteFor(s, sea);
      sky.setPalette(pal);
      water.setPalette(pal);
      (scene.fog as THREE.Fog).color.setHex(pal.fog);
      hemi.color.setHex(pal.hemiSky);
      hemi.groundColor.setHex(pal.hemiGround);
      hemi.intensity = pal.hemiIntensity;
      key.color.setHex(pal.key);
      key.intensity = pal.keyIntensity;
      bloom.strength = pal.bloom;
      renderer.toneMappingExposure = pal.exposure;
      const fog = scene.fog as THREE.Fog;
      // The fog sea lives up to its name; the others keep a soft, far haze.
      // Fog distances follow the home view, so a grown island is not lost in the fog sea's fog.
      const k = homeScale();
      fog.near = (sea === 'fog' ? 10 : 70) * k;
      fog.far = (sea === 'fog' ? 55 : 220) * k;
      sky.setAurora(sea === 'aurora' ? 1 : 0);
    },
    setLight(level) {
      light = level;
      water.setLit(litRadiusWorld(level));
    },
    setCalm(on) {
      calm = on;
      controls.enableDamping = !on;
    },
    anchor(tag) {
      let obj: THREE.Object3D | undefined;
      if (tag.startsWith('flotsam:')) obj = drift.get(Number(tag.slice(8)));
      else obj = tagObj.get(tag as Tag);
      if (!obj) return null;
      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) box.setFromCenterAndSize(obj.position, new THREE.Vector3(0.5, 0.5, 0.5));
      ndc.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2).project(cam);
      const w = host.clientWidth;
      const h = host.clientHeight;
      const x = (ndc.x * 0.5 + 0.5) * w;
      const y = (-ndc.y * 0.5 + 0.5) * h;
      return { x, y, visible: ndc.z < 1 && x >= 0 && x <= w && y >= 0 && y <= h };
    },
    pick(x, y) {
      const w = host.clientWidth;
      const h = host.clientHeight;
      raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), cam);
      // Drifting finds first: they are small and sit in front of everything.
      const objs = [...drift.values(), ...tagObj.values()];
      const hit = raycaster.intersectObjects(objs, true)[0];
      if (!hit) return null;
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.tag) o = o.parent;
      return (o?.userData.tag as AnchorTag) ?? null;
    },
    summon() {
      life?.summon();
    },
    pulse(tag) {
      if (calm) return;
      pending = pending.filter((q) => q.tag !== tag);
      pending.push({ tag, at: performance.now(), updated: false });
    },
    focus(where) {
      if (where === 'home') focusTo = { target: DEFAULT_TARGET.clone(), dist: DEFAULT_CAM.distanceTo(DEFAULT_TARGET) * homeScale(), dir: DEFAULT_CAM.clone().sub(DEFAULT_TARGET).normalize() };
      else if (where === 'sea') focusTo = { target: new THREE.Vector3(0, 0, 0), dist: Math.min(70, Math.max(DEFAULT_CAM.distanceTo(DEFAULT_TARGET) * 1.3, litRadiusWorld(light) * 2.4)), dir: new THREE.Vector3(0.42, 1, 0.72).normalize() };
      else {
        const o = tagObj.get(where);
        if (o) focusTo = { target: o.position.clone().setY(1), dist: 16 };
      }
      lastInput = performance.now();
    },
    resize,
    dispose() {
      disposed = true;
      generation++;
      window.clearTimeout(lostTimer);
      document.removeEventListener('visibilitychange', onVisible);
      cancelAnimationFrame(raf);
      window.clearTimeout(readyTimer);
      controls.dispose();
      life?.dispose();
      for (const k of [...placed.keys()]) removePlaced(k);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      for (const t of loaded) freeTemplate(t);
      loaded.length = 0;
      sky.dispose();
      water.dispose();
      sandGeo.dispose();
      sandMat.dispose();
      groundMat.dispose();
      glowGeo.dispose();
      hitGeo.dispose();
      hitMat.dispose();
      glowMats.forEach((m) => m.dispose());
      disposeToon();
      composer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
  void generation;
  return world;
}
