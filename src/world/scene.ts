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
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { MaterialId, SeaId } from '../core/data';
import type { Sky } from '../ui/sky';
import { MODELS, modelUrl, type ModelId } from './assets';
import { diffItems } from './diff';
import { TILE_D, litRadiusWorld } from './hex';
import { DEFAULT_CAM, DEFAULT_TARGET, seaView } from './view';
import { shoresOf, type Tag, type WorldItem, type boatPosition } from './layout';
import { terrainGeometry, type Shape } from './terrain';

/** A ship passing at night. */
const SHIP_MODEL: ModelId = 'kp/ship-medium';

/** Ground colours for sculpted islands (the sea's wash is applied on top). */
const GROUND_COLOURS = { sand: 0xf2dca0, grass: 0x8cc25a, rock: 0xa39a8c, path: 0xcdb48a };
import { mixColour, paletteFor, type Palette } from './palette';
import { SUN_AZIMUTH, createSky } from './sky3d';
import { disposeToon, toonMaterial, toonRamp } from './toon';
import { createWater } from './water';
import { createLife, type Life } from './life';
import { GradeShader, createBeam, createClouds, createMist } from './atmosphere';
import { disposeGround, groundMaterial } from './ground';
import { createGreenery, scatterOn, type Scatter } from './greenery';
import { createEffects } from './effects';
import type { SeaEventId } from '../core/seaEvents';

export type AnchorTag = Tag | `flotsam:${number}` | `ship:${number}`;
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
  /** Ships passing at night (guided: flashing its thanks). */
  ships?: { id: number; x: number; z: number; rotY: number; guided: boolean }[];
}
export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}
export interface World {
  update(items: WorldItem[], extra: WorldExtra): void;
  setSky(sky: Sky, sea: SeaId): void;
  /** The lighthouse level, and how far the water looks lit (as a level; defaults to the same). */
  setLight(level: number, reach?: number): void;
  setCalm(on: boolean): void;
  /** What is happening at sea just now (a storm brings rain and a darker sky; meteors fill the night). */
  setEvent(id: SeaEventId | null): void;
  anchor(tag: AnchorTag): ScreenPoint | null;
  /** The tag under a point in the canvas (CSS px from its top-left), if any. */
  pick(x: number, y: number): AnchorTag | null;
  /** Turn the lighthouse beam to a point on the sea for a moment (guiding a ship). */
  aimBeam(x: number, z: number): void;
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
  /** Test hook: lower the camera toward the horizon (tilt 0..1), move it nearer or farther (zoom), walk it round the island (turn, degrees). */
  testView(tilt: number, zoom: number, turn?: number): void;
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
  /** Parts that turn: a windmill's sails, a water wheel. */
  spin?: THREE.Object3D[];
}

/** The reference island size the default camera frames; bigger islands pull the home view back (homeScale). */
const HOME_REACH = 6;

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
  // The setting sun behind the island: a warm edge on everything that faces it (no shadows of its own).
  const rim = new THREE.DirectionalLight(0xffb070, 0);
  rim.position.set(SUN_AZIMUTH.x * 30, 5, SUN_AZIMUTH.y * 30);
  scene.add(rim);
  const water = createWater();
  scene.add(water.mesh);
  const clouds = createClouds();
  scene.add(clouds.group);
  const mist = createMist();
  scene.add(mist.group);
  const effects = createEffects();
  scene.add(effects.group);
  const sandMat = new THREE.MeshToonMaterial({ color: 0xf6dfae, gradientMap: toonRamp() });
  const sandGeo = new THREE.CylinderGeometry((TILE_D / 2) * 1.28, (TILE_D / 2) * 1.38, 0.5, 6);
  const glowGeo = new THREE.SphereGeometry(1, 14, 10);
  const hitGeo = new THREE.SphereGeometry(0.75, 8, 6);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const glowMats = new Map<number, THREE.MeshBasicMaterial>();
  const beaconMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe0a0).multiplyScalar(3), toneMapped: false, fog: false });
  // Lit windows: a warm pane and a soft halo round it, both coming up as the evening falls.
  const paneMat = new THREE.MeshBasicMaterial({ color: 0xffb860, toneMapped: false });
  const haloTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,200,120,.9)');
    gr.addColorStop(0.4, 'rgba(255,170,90,.3)');
    gr.addColorStop(1, 'rgba(255,150,70,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const haloMat = new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  haloMat.toneMapped = false;
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
  // The last pass brings the light into range for the screen and grades the picture, in one go.
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

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

  /** The meshes of a model, for drawing many copies in one go (trees). */
  const greenery = createGreenery((id, wash) =>
    template(id).then((t) => {
      if (!t || disposed) return [];
      const info = MODELS[id];
      const k = info.fit === 'height' ? info.size / t.h : info.size / t.len;
      const fit = new THREE.Matrix4().makeScale(k, k, k);
      const out: { geometry: THREE.BufferGeometry; material: THREE.Material; matrix: THREE.Matrix4 }[] = [];
      t.scene.updateMatrixWorld(true);
      t.scene.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh) return;
        const src = Array.isArray(m.material) ? m.material[0] : m.material;
        out.push({ geometry: m.geometry, material: toonMaterial(src, undefined, wash), matrix: fit.clone().multiply(m.matrixWorld) });
      });
      return out;
    }),
  );
  scene.add(greenery.group);

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
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.05), paneMat);
      w.userData.ownGeometry = true;
      // On the building's front, whichever way it faces.
      const r = p.item.rotY;
      const half = Math.min(size.x, size.z) / 2;
      w.position.set(c.x + Math.sin(r) * half, box.min.y + Math.min(0.75, size.y * 0.42), c.z + Math.cos(r) * half);
      w.rotation.y = r;
      add(w);
      const halo = new THREE.Sprite(haloMat);
      halo.position.copy(w.position).add(new THREE.Vector3(Math.sin(r) * 0.12, 0, Math.cos(r) * 0.12));
      halo.scale.setScalar(1.25);
      add(halo);
      // A pane only glows; a lit window also casts a little light (kept few: lights are costly).
      if (g === 'pane') return;
      const pl = new THREE.PointLight(0xffa860, 2.5, 3.5);
      pl.position.copy(w.position).add(new THREE.Vector3(0, 0, 0.4));
      pl.userData.base = 2.5;
      lights.push(pl);
      add(pl);
    } else if (g === 'beacon') {
      // A far lighthouse answering: a big soft glow at its top, no real light (they are many and far).
      // Not fogged: in the fog sea the tower fades out but its light still reads through the fog.
      const s = new THREE.Mesh(glowGeo, beaconMat);
      s.scale.setScalar(Math.max(0.32, size.x * 0.22));
      s.position.set(c.x, box.max.y - size.y * 0.12, c.z);
      s.userData.beacon = s.scale.x;
      add(s);
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
    if (p.obj.userData.ownMaterial) ((p.obj as THREE.Mesh).material as THREE.Material).dispose();
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
      const paint = { ...GROUND_COLOURS, wash: item.wash, rockAbove: item.ground.kind === 'rock' ? 1 : undefined };
      const mesh = new THREE.Mesh(terrainGeometry(item.ground, paint), groundMaterial(paint));
      mesh.userData.ownMaterial = true;
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
      obj.traverse((c) => {
        if (/_fan_|_wheel_/.test(c.name)) (p.spin ??= []).push(c);
      });
      // Set down while you watch: it grows into place with a puff of dust (not boats, which sail in).
      if (readySent && !calm && !item.bob && !item.key.startsWith('walker:') && !item.key.startsWith('answer:')) popIn(obj);
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
  const seaShips = new Map<number, THREE.Object3D>();

  // The lighthouse beams: from dusk on they sweep the sea; guiding a ship, one swings onto it for a moment.
  const beam = createBeam();
  scene.add(beam.group);
  let beamAim: { x: number; z: number; until: number } | null = null;
  let beamAngle = 0;
  let beamTower: THREE.Object3D | null = null;
  const lampAt = new THREE.Vector3();
  /** The scene clock last seen by updateBeam (it pauses with the tab and slows in calm mode). */
  let sceneTime = 0;
  /** 0..1 how thick the air is: the fog sea. */
  let haze = 0;
  function updateBeam(t: number, night: number) {
    sceneTime = t;
    const tower = tagObj.get('light');
    // Faint while the sun is still up, full once it has set.
    // Thick air (fog, a storm's rain) shows the beams even by day.
    const thick = Math.max(haze, storm * 0.9);
    const strength = tower && !calm ? Math.min(1, Math.max(0, (night - 0.12) * 1.6)) * (1 - 0.25 * pal.deep) + thick * 0.35 : 0;
    if (!tower || strength <= 0.01) {
      beam.set(lampAt, beamAngle, 0, thick, cam, t);
      water.setBeam(beamAngle, 0);
      return;
    }
    // The lamp's height, measured once per lighthouse model (it changes with the light level).
    if (beamTower !== tower) {
      beamTower = tower;
      const box = new THREE.Box3().setFromObject(tower);
      lampAt.set(tower.position.x, box.max.y - Math.min(1.2, (box.max.y - box.min.y) * 0.15), tower.position.z);
    }
    let want = t * 0.35;
    if (beamAim && t < beamAim.until) want = Math.atan2(-beamAim.z, beamAim.x);
    else beamAim = null;
    // Turn smoothly toward where it should point.
    let d = (want - beamAngle) % (2 * Math.PI);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    // Swing smoothly onto a guided ship and back to the sweep.
    beamAngle += Math.abs(d) > 0.05 ? d * 0.15 : d;
    beam.set(lampAt, beamAngle, strength, thick, cam, t);
    water.setBeam(beamAngle, strength);
  }

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
    // Ships passing at night: tappable, flashing when guided.
    const shipIds = new Set((extra.ships ?? []).map((sh) => sh.id));
    for (const [id, o] of seaShips)
      if (!shipIds.has(id)) {
        scene.remove(o);
        seaShips.delete(id);
      }
    for (const sh of extra.ships ?? []) {
      let o = seaShips.get(sh.id);
      if (!o) {
        const g = new THREE.Group();
        g.userData.tag = `ship:${sh.id}`;
        const hitBall = new THREE.Mesh(hitGeo, hitMat);
        // Far away: a generous target.
        hitBall.scale.setScalar(8);
        hitBall.position.y = 2.5;
        g.add(hitBall);
        const lamp = new THREE.Mesh(glowGeo, glowMat(0xfff0c0));
        lamp.scale.setScalar(0.5);
        lamp.position.y = 6.5;
        lamp.userData.shipLamp = true;
        g.add(lamp);
        seaShips.set(sh.id, g);
        scene.add(g);
        o = g;
        template(SHIP_MODEL).then((t) => {
          if (t && seaShips.get(sh.id) === g) g.add(instance(t, { model: SHIP_MODEL, size: 7 }));
        });
      }
      o.position.set(sh.x, -0.2, sh.z);
      o.rotation.y = sh.rotY;
      o.userData.guided = sh.guided;
    }
    const alive = new Set(extra.flotsam.map((f) => f.id));
    for (const [id, o] of drift)
      if (!alive.has(id)) {
        // Lifted out (one that drifted off the far end just goes).
        if (Math.abs(o.position.x) < 15 && readySent && !calm) effects.splash(o.position.x, o.position.z);
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
  const size3 = new THREE.Vector3();
  const boxOf = new THREE.Box3();
  /** The foot of a thing and how wide it stands, for effects round it. */
  function footOf(o: THREE.Object3D): { at: THREE.Vector3; r: number } {
    boxOf.setFromObject(o).getSize(size3);
    // Measured at its full size (it may be growing into place just now).
    const k = o.userData.baseScale ? o.userData.baseScale / o.scale.x : 1;
    return { at: new THREE.Vector3(o.position.x, boxOf.min.y, o.position.z), r: Math.max(size3.x, size3.z) * 0.5 * k };
  }
  function startPulse(o: THREE.Object3D, now: number) {
    if (pulses.some((p) => p.obj === o)) return;
    // Mended: light spreads from its foot (a thing still growing into place has its own show).
    const f = footOf(o);
    effects.mend(f.at, f.r);
    // Still growing into place: its bounce follows once it has arrived.
    const pop = pops.find((p) => p.obj === o);
    if (pop) {
      pop.then = true;
      return;
    }
    if (o.userData.baseScale === undefined) o.userData.baseScale = o.scale.x;
    pulses.push({ obj: o, t0: now });
  }
  /** Things growing into place, and how many puffs of dust this moment has had (a whole town arriving at once needs only a few). */
  const pops: { obj: THREE.Object3D; t0: number; then?: boolean }[] = [];
  let dustAt = 0;
  let dustCount = 0;
  function popIn(o: THREE.Object3D) {
    const now = performance.now();
    o.userData.baseScale = o.scale.x;
    if (now - dustAt > 400) {
      dustAt = now;
      dustCount = 0;
    }
    if (dustCount++ < 5) {
      const f = footOf(o);
      effects.dust(f.at, f.r);
    }
    o.scale.setScalar(o.userData.baseScale * 0.01);
    pops.push({ obj: o, t0: now });
  }

  // ---------- what grows on the islands ----------
  /** Plants worked out per island, kept while the island and what stands on it stay the same. */
  const grown = new Map<string, { sig: string; scatter: Scatter }>();
  let grownLook = '';
  function syncGreenery() {
    // Islands the boat has reached (one still in the dark is bare).
    const grounds = items.filter((i) => i.ground && !i.key.includes(':dark'));
    const standing = items.filter((i) => !i.ground && !i.bob && !i.key.startsWith('walker:') && !i.key.startsWith('answer:'));
    let changed = false;
    for (const key of [...grown.keys()])
      if (!grounds.some((g) => g.key === key)) {
        grown.delete(key);
        changed = true;
      }
    for (const g of grounds) {
      const sh = g.ground!;
      const reach = sh.radius * 1.3;
      // Nothing grows under a building: a wide berth for the big things, a narrow one for the small.
      const avoid = standing
        .filter((i) => Math.hypot(i.x - sh.cx, i.z - sh.cz) < reach)
        .map((i): [number, number, number] => [i.x, i.z, /^(town|house|bld|light|isle)/.test(i.key) ? 1.15 : /^(land|life|deco)/.test(i.key) ? 0.35 : 0.7]);
      const sig = avoid.map((a) => `${a[0].toFixed(1)},${a[1].toFixed(1)}`).join(';');
      if (grown.get(g.key)?.sig === sig) continue;
      grown.set(g.key, { sig, scatter: scatterOn(sh, avoid) });
      changed = true;
    }
    const look = `${lastSea}`;
    if (!changed && look === grownLook) return;
    grownLook = look;
    greenery.set([...grown.values()].map((g) => g.scatter), { snow: lastSea === 'aurora', dull: lastSea === 'fog' });
  }

  // ---------- air ----------
  /**
   * The haze follows the camera, so the home island always reads clearly however far you stand:
   * in the fog sea the island is in thin mist and everything beyond it sinks into the fog; in the
   * other seas only the far distance softens.
   */
  function updateAir() {
    const fog = scene.fog as THREE.Fog;
    const d = cam.position.distanceTo(controls.target);
    if (haze > 0) {
      fog.near = d * 0.62;
      fog.far = d * 0.62 + 46 * homeScale();
    } else {
      fog.near = Math.max(70 * homeScale(), d * 1.5);
      fog.far = fog.near + 170 * homeScale();
    }
    water.setFog(haze, fog.near, fog.far);
    mist.set(haze, pal.fog, (homeGround?.radius ?? 6) * 1.12);
  }

  // ---------- the sky's colours, and the weather over them ----------
  let seaEvent: SeaEventId | null = null;
  /** 0..1 how far a storm has come in (it gathers and clears over a few seconds). */
  let storm = 0;
  let stormShown = -1;
  /** Lightning: how bright just now, and when the next one comes (scene seconds). */
  let flash = 0;
  let flashAt = 0;
  let whaleCall = 0;
  const STORM_SKY = 0x3c4660;
  function applySky() {
    pal = paletteFor(lastSky, lastSea);
    if (storm > 0) {
      // A storm greys and darkens everything but the lamps.
      for (const k of ['top', 'mid', 'low', 'cloud', 'cloudShade', 'water', 'shallow', 'fog', 'hemiSky', 'hemiGround', 'key'] as const) pal[k] = mixColour(pal[k], STORM_SKY, 0.5 * storm);
      pal.keyIntensity *= 1 - 0.4 * storm;
      pal.hemiIntensity *= 1 - 0.2 * storm;
    }
    stormShown = storm;
    haze = lastSea === 'fog' ? 1 : 0;
    sky.setHaze(Math.max(haze, storm * 0.85));
    sky.setPalette(pal);
    sky.setMeteors(seaEvent === 'meteors' ? 1 : 0);
    water.setPalette(pal);
    water.setRough(storm);
    effects.setRain(storm);
    (scene.fog as THREE.Fog).color.setHex(pal.fog);
    hemi.color.setHex(pal.hemiSky);
    hemi.groundColor.setHex(pal.hemiGround);
    hemi.intensity = pal.hemiIntensity;
    key.color.setHex(pal.key);
    key.intensity = pal.keyIntensity;
    rim.color.setHex(mixColour(0xffa860, 0x8aa0ff, pal.deep));
    rim.intensity = (0.9 * (1 - 0.6 * pal.night) + 0.35 * pal.deep) * (1 - 0.7 * storm);
    // Windows and far lighthouses are faint by day and bright at night (and lit in a storm).
    const lit = Math.min(1, Math.max(0, (Math.max(pal.night, storm * 0.8) - 0.1) / 0.5));
    paneMat.color.setHex(0xffb860).multiplyScalar(0.35 + 2.65 * lit);
    haloMat.opacity = 0.7 * lit;
    beaconMat.color.setHex(0xffe0a0).multiplyScalar(0.9 + 2.1 * lit);
    bloom.strength = pal.bloom;
    renderer.toneMappingExposure = pal.exposure;
    grade.uniforms.exposure.value = pal.exposure;
    clouds.setPalette(pal);
    grade.uniforms.night.value = pal.night;
    updateAir();
    sky.setAurora(lastSea === 'aurora' ? 1 : 0);
  }
  /** The weather moves on a little each frame. */
  function updateWeather(dt: number, t: number) {
    const want = seaEvent === 'storm' ? 1 : 0;
    if (storm !== want) storm = want > storm ? Math.min(want, storm + dt / 6) : Math.max(want, storm - dt / 6);
    if (Math.abs(storm - stormShown) > 0.004 || (storm === want && stormShown !== storm)) applySky();
    // Lightning: now and then a soft flash behind the clouds (never in calm mode).
    if (storm > 0.6 && !calm && t > flashAt) {
      flash = 1;
      flashAt = t + 7 + Math.random() * 10;
    }
    if (flash > 0.003) {
      flash *= Math.exp(-dt * 7);
      sky.setFlash(flash);
      hemi.intensity = pal.hemiIntensity * (1 + flash * 0.9);
    } else if (flash !== 0) {
      flash = 0;
      sky.setFlash(0);
      hemi.intensity = pal.hemiIntensity;
    }
    // While the whales are passing, one is never long out of sight.
    if (seaEvent === 'whales' && !calm && t > whaleCall) {
      whaleCall = t + 70;
      life?.summon();
    }
    if (seaEvent === 'meteors' !== meteorsOn) {
      meteorsOn = seaEvent === 'meteors';
      sky.setMeteors(meteorsOn ? 1 : 0);
    }
  }
  let meteorsOn = false;

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
    effects.resize(h * renderer.getPixelRatio(), cam.fov);
  }
  resize();

  // ---------- loop ----------
  let last = performance.now();
  let t = 0;
  let raf = 0;
  let lastDraw = 0;
  let wakeIn = 0;
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
    // The sky stands round whoever is looking, so its horizon is always at eye level.
    sky.mesh.position.copy(cam.position);
    clouds.tick(dt * speed, cam.position.y);
    greenery.tick(t, calm);
    mist.tick(t);
    grade.uniforms.T.value = t;
    updateWeather(dt * speed, t);
    updateAir();
    for (const p of placed.values()) {
      p.mixer?.update(dt * speed);
      if (p.item.bob) {
        p.obj.position.y = p.baseY + Math.sin(t * 1.2 + p.item.x) * 0.05;
        p.obj.rotation.z = Math.sin(t * 0.9 + p.item.z) * 0.035;
      }
      if (p.spin && !calm) for (const part of p.spin) part.rotation.z += dt * (part.name.includes('wheel') ? 0.7 : 1.1);
    }
    // Boats under way leave rings behind them.
    wakeIn -= dt * speed;
    if (wakeIn <= 0 && !calm) {
      wakeIn = 0.42;
      for (const vb of voyageBoats.values()) effects.ripple(vb.obj.position.x - Math.sin(vb.obj.rotation.y) * 0.5, vb.obj.position.z - Math.cos(vb.obj.rotation.y) * 0.5, 0.9);
      for (const o of seaShips.values()) effects.ripple(o.position.x - Math.sin(o.rotation.y) * 2.4, o.position.z - Math.cos(o.rotation.y) * 2.4, 2.6);
    }
    effects.tick(dt * speed, t, cam);
    for (const o of seaShips.values()) {
      o.position.y = -0.25 + Math.sin(t * 1.1 + o.position.x) * 0.06;
      // A guided ship flashes its lamp in thanks.
      for (const c of o.children) if (c.userData.shipLamp) c.scale.setScalar(o.userData.guided ? (Math.sin(t * 14) > 0 ? 1.1 : 0.4) : 0.5);
    }
    updateBeam(t, pal.night);
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
      // Far lighthouses turn like ours: each swells and dims in its own time.
      else if (o.userData.beacon) o.scale.setScalar(o.userData.beacon * (0.75 + 0.5 * Math.max(0, Math.sin(t * 0.9 + o.position.x * 0.7))));
    });
    pending = pending.filter((q) => {
      if (now - q.at > 4000) return false;
      if (!q.updated) return true;
      const o = tagObj.get(q.tag);
      if (!o || !items.some((i) => i.key === o.userData.key)) return true;
      startPulse(o, now);
      return false;
    });
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      const base = p.obj.userData.baseScale as number;
      const k = (now - p.t0) / 450;
      if (k >= 1) {
        p.obj.scale.setScalar(base);
        pops.splice(i, 1);
        if (p.then) pulses.push({ obj: p.obj, t0: now });
      } else {
        // Up past its size and back: a soft bounce.
        const e = 1 - Math.pow(1 - k, 3);
        p.obj.scale.setScalar(base * (e + Math.sin(k * Math.PI) * 0.16));
      }
    }
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
      if (d.add.length || d.remove.length) syncGreenery();
    },
    setSky(s, sea) {
      lastSky = s;
      lastSea = sea;
      applySky();
      syncGreenery();
    },
    setEvent(id) {
      seaEvent = id;
    },
    setLight(level, reach = level) {
      light = level;
      water.setLit(litRadiusWorld(Math.max(level, reach)));
    },
    setCalm(on) {
      calm = on;
      controls.enableDamping = !on;
    },
    anchor(tag) {
      let obj: THREE.Object3D | undefined;
      if (tag.startsWith('flotsam:')) obj = drift.get(Number(tag.slice(8)));
      else if (tag.startsWith('ship:')) obj = seaShips.get(Number(tag.slice(5)));
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
      // Everything that can be tapped (many things share a tag, e.g. the town's houses and the
      // ground); the nearest hit wins, so things standing on the ground come before the ground.
      const objs = [...drift.values(), ...seaShips.values(), ...[...placed.values()].filter((p) => p.item.tag).map((p) => p.obj)];
      const hit = raycaster.intersectObjects(objs, true)[0];
      if (!hit) return null;
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.tag) o = o.parent;
      return (o?.userData.tag as AnchorTag) ?? null;
    },
    testView(tilt, zoom, turn = 0) {
      const off = cam.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), (turn * Math.PI) / 180);
      const dist = off.length() * zoom;
      const flat = Math.hypot(off.x, off.z);
      const pitch = Math.atan2(off.y, flat) * (1 - tilt) + 0.2 * tilt;
      const k = (Math.cos(pitch) * dist) / flat;
      cam.position.set(controls.target.x + off.x * k, controls.target.y + Math.sin(pitch) * dist, controls.target.z + off.z * k);
      lastInput = Infinity;
      controls.update();
    },
    aimBeam(x, z) {
      // Measured on the scene's own clock (the one updateBeam is given).
      beamAim = { x, z, until: sceneTime + 2.5 };
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
      else if (where === 'sea') {
        const v = seaView(light);
        focusTo = { target: v.target, dist: v.dist, dir: v.dir };
      }
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
      disposeGround();
      glowGeo.dispose();
      beaconMat.dispose();
      paneMat.dispose();
      haloMat.dispose();
      haloTex.dispose();
      hitGeo.dispose();
      beam.dispose();
      effects.dispose();
      greenery.dispose();
      clouds.dispose();
      mist.dispose();
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
