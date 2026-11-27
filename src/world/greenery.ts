/**
 * The small growing things that make the ground look alive: tufts of grass that sway, flowers in
 * drifts, bushes at the foot of the cliffs, pebbles on the beach. Where they go is worked out from
 * the island's shape (a pure function, so it can be tested); each kind is drawn in one go.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { heightAt, roadAt, type Shape } from './terrain';
import { toonRamp } from './toon';

export interface Sprig {
  x: number;
  y: number;
  z: number;
  /** Size (1 = usual), turn (radians) and a 0..1 number to vary its colour by. */
  size: number;
  rot: number;
  tone: number;
}
export interface Scatter {
  /** Trees: tone picks the kind (under 0.55 a round tree, above it a fir). */
  trees: Sprig[];
  tufts: Sprig[];
  flowers: Sprig[];
  bushes: Sprig[];
  pebbles: Sprig[];
}

const hash = (x: number, z: number, k: number) => {
  const v = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453;
  return v - Math.floor(v);
};
/** Soft patches, 0..1. */
const patch = (x: number, z: number, f: number, p: number) => 0.5 + 0.25 * Math.sin(x * f + p) + 0.25 * Math.sin(z * f * 1.13 - p * 1.7) * Math.cos((x - z) * f * 0.6 + p);

/** How steep the ground is at a point. */
function steepness(s: Shape, x: number, z: number): number {
  const e = 0.15;
  return Math.hypot(heightAt(s, x + e, z) - heightAt(s, x - e, z), heightAt(s, x, z + e) - heightAt(s, x, z - e)) / (2 * e);
}

/**
 * What grows on an island. `avoid` lists circles (x, z, radius) where things stand; nothing grows
 * under them. The same island always gets the same plants.
 */
export function scatterOn(s: Shape, avoid: readonly (readonly [number, number, number])[]): Scatter {
  const out: Scatter = { trees: [], tufts: [], flowers: [], bushes: [], pebbles: [] };
  const clear = (x: number, z: number, pad: number) => avoid.every(([ax, az, ar]) => (x - ax) ** 2 + (z - az) ** 2 > (ar + pad) ** 2);
  const R = s.radius * 1.25;
  const walk = (step: number, k: number, each: (x: number, z: number, h: number, i: number, j: number) => void) => {
    const n = Math.ceil(R / step);
    for (let i = -n; i <= n; i++)
      for (let j = -n; j <= n; j++) {
        // Jittered, so nothing stands in rows.
        const x = s.cx + (i + hash(i, j, k) - 0.5) * step;
        const z = s.cz + (j + hash(i, j, k + 1) - 0.5) * step;
        const h = heightAt(s, x, z);
        if (h > 0.04) each(x, z, h, i, j);
      }
  };
  const sprig = (x: number, z: number, h: number, i: number, j: number, k: number, size: number): Sprig => ({ x, y: h, z, size: size * (0.75 + 0.5 * hash(i, j, k + 2)), rot: hash(i, j, k + 3) * Math.PI * 2, tone: hash(i, j, k + 4) });
  const grassy = (x: number, z: number, h: number) => h > 0.44 && steepness(s, x, z) < 0.3 && roadAt(s, x, z) < 0.12;

  // Trees: in loose clumps on open grass, well clear of buildings and roads.
  walk(1.9, 6, (x, z, h, i, j) => {
    // On the flats and up the banks alike (a wooded slope reads as a hill), but not on bare rock.
    if (h < 0.44 || steepness(s, x, z) > 0.8 || roadAt(s, x, z) > 0.01 || hash(i, j, 14) > 0.25 + 0.6 * patch(x, z, 0.27, s.seed + 4) || !clear(x, z, 0.75)) return;
    out.trees.push(sprig(x, z, h, i, j, 60, 1));
  });
  const nearTree = (x: number, z: number) => out.trees.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 0.2);
  // Grass tufts: thick in some patches, thin in others.
  walk(0.44, 1, (x, z, h, i, j) => {
    if (!grassy(x, z, h) || hash(i, j, 7) > 0.2 + 0.75 * patch(x, z, 0.5, s.seed) || !clear(x, z, 0.1) || nearTree(x, z)) return;
    out.tufts.push(sprig(x, z, h, i, j, 10, 1));
  });
  // Beach grass along the top of the sand.
  walk(0.62, 2, (x, z, h, i, j) => {
    if (h < 0.26 || h > 0.44 || hash(i, j, 8) > 0.32 || steepness(s, x, z) > 0.5 || !clear(x, z, 0.2)) return;
    out.tufts.push({ ...sprig(x, z, h, i, j, 20, 1.25), tone: 2 });
  });
  // Flowers in drifts.
  walk(0.7, 3, (x, z, h, i, j) => {
    if (!grassy(x, z, h) || patch(x, z, 0.42, s.seed + 9) < 0.62 || hash(i, j, 9) > 0.75 || !clear(x, z, 0.15)) return;
    out.flowers.push(sprig(x, z, h, i, j, 30, 1));
  });
  // Bushes where flat ground meets the foot or the top of a bank.
  walk(1.5, 4, (x, z, h, i, j) => {
    if (!grassy(x, z, h) || hash(i, j, 11) > 0.55 || !clear(x, z, 0.5)) return;
    const d = 0.9;
    const wall = Math.max(steepness(s, x + d, z), steepness(s, x - d, z), steepness(s, x, z + d), steepness(s, x, z - d));
    if (wall < 0.55) return;
    out.bushes.push(sprig(x, z, h, i, j, 40, 1));
  });
  // Pebbles on the beach, and a few fallen under the cliffs.
  walk(1.0, 5, (x, z, h, i, j) => {
    const beach = h < 0.3 && hash(i, j, 12) < 0.3;
    const scree = h > 0.44 && hash(i, j, 13) < 0.16 && steepness(s, x, z) < 0.35 && roadAt(s, x, z) < 0.12;
    if ((!beach && !scree) || !clear(x, z, 0.25)) return;
    out.pebbles.push(sprig(x, z, h, i, j, 50, beach ? 1 : 1.3));
  });
  return out;
}

// ---------- drawing ----------

/** A tuft: a few blades leaning out from one root, dark at the foot and light at the tip. */
function tuftGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const nrm: number[] = [];
  const foot = new THREE.Color(0x4f8a3a);
  const tip = new THREE.Color(0xb5dc74);
  const blades = 6;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + (b % 2) * 0.4;
    const lean = 0.07 + (b % 3) * 0.035;
    const h = 0.2 + ((b * 7) % 5) * 0.03;
    const w = 0.035;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    // Two points at the root (across the blade), one at the tip (leaning outward).
    pos.push(cx * 0.03 - cz * w, 0, cz * 0.03 + cx * w, cx * 0.03 + cz * w, 0, cz * 0.03 - cx * w, cx * (0.03 + lean), h, cz * (0.03 + lean));
    col.push(foot.r, foot.g, foot.b, foot.r, foot.g, foot.b, tip.r, tip.g, tip.b);
    // Lit like the ground they stand on, whichever way a blade faces.
    nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}

/** A flower: a short stem and a small head (the head takes the flower's colour). */
function flowerGeometry(): THREE.BufferGeometry {
  const paint = (g: THREE.BufferGeometry, c: number) => {
    const col = new THREE.Color(c);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([col.r, col.g, col.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    // The stem has shared corners and the heads do not: make them alike so they can be joined.
    return g.index ? g.toNonIndexed() : g;
  };
  // Few faces: there are hundreds of these and each is a dot on the screen.
  const stem = paint(new THREE.CylinderGeometry(0.008, 0.012, 0.16, 3, 1, true).translate(0, 0.08, 0), 0x6aa84a);
  const head = paint(new THREE.OctahedronGeometry(0.055, 0).scale(1, 0.7, 1).translate(0, 0.18, 0), 0xffffff);
  const g = mergeGeometries([stem, head]);
  [stem, head].forEach((x) => x.dispose());
  return g;
}

/** A bush: three round lumps. */
function bushGeometry(): THREE.BufferGeometry {
  const lumps = [
    new THREE.IcosahedronGeometry(0.3, 1).translate(0, 0.24, 0),
    new THREE.IcosahedronGeometry(0.22, 1).translate(0.24, 0.17, 0.06),
    new THREE.IcosahedronGeometry(0.2, 1).translate(-0.2, 0.15, -0.1),
  ];
  const g = mergeGeometries(lumps);
  lumps.forEach((x) => x.dispose());
  // Flat facets, like the models' leaves.
  g.computeVertexNormals();
  return g;
}

/** One mesh of a loaded model: its shape, its material, and where it sits in the model (scaled to the game's size). */
export interface ModelPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrix: THREE.Matrix4;
}
/** The meshes of a model, once it has loaded (none if it could not be). */
export type PartsFn = (model: string, wash?: [number, number]) => Promise<ModelPart[]>;

/** The kinds of tree, by sea: round trees and firs at dusk, mostly firs in the fog, firs under snow in the ice sea. */
const TREE_KINDS = { round: 'nature/round_tree', fir: 'kk/tree_single_A', spruce: 'kk/tree_single_B' } as const;

export interface Greenery {
  group: THREE.Group;
  /** Draw these plants; `snow` whitens them (the ice sea), `dull` mutes them (the fog sea). */
  set(all: Scatter[], look: { snow: boolean; dull: boolean }): void;
  tick(t: number, calm: boolean): void;
  dispose(): void;
}

export function createGreenery(parts: PartsFn): Greenery {
  const group = new THREE.Group();
  const wind = { value: 0 };
  /** Blades and stems bend with the wind: more at the tip, each plant a little out of step. */
  const sway = (m: THREE.Material, amount: number, base?: THREE.Material) => {
    m.onBeforeCompile = (sh, r) => {
      // A copy of a model's material keeps what that material did to its shader (its wash of snow or fog).
      base?.onBeforeCompile(sh, r);
      sh.uniforms.uWind = wind;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWind;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
          float ph=instanceMatrix[3].x*.9+instanceMatrix[3].z*.7;
          float bend=position.y*${amount.toFixed(3)};
          transformed.x+=(sin(uWind*1.7+ph)+.5*sin(uWind*3.1+ph*1.7))*bend;
          transformed.z+=cos(uWind*1.3+ph*1.3)*bend*.6;
          #endif`,
        );
    };
    m.customProgramCacheKey = () => `sway:${amount}:${base?.customProgramCacheKey() ?? ''}`;
    return m;
  };
  const tuftGeo = tuftGeometry();
  const flowerGeo = flowerGeometry();
  const bushGeo = bushGeometry();
  const pebbleGeo = new THREE.IcosahedronGeometry(0.11, 0).scale(1, 0.62, 0.85);
  const tuftMat = sway(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), 0.42);
  const flowerMat = sway(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }), 0.3);
  const bushMat = sway(new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp() }), 0.06);
  const pebbleMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp() });
  let meshes: THREE.InstancedMesh[] = [];
  /** Tree materials made here (the models' own, with the wind added). */
  let treeMats: THREE.Material[] = [];
  let round = 0;
  const clearMeshes = () => {
    for (const m of meshes) {
      group.remove(m);
      m.dispose();
    }
    meshes = [];
    treeMats.forEach((m) => m.dispose());
    treeMats = [];
  };
  const FLOWERS = [0xfff6e6, 0xffd24a, 0xff9db8, 0xc9a2ff, 0xffb26b];
  return {
    group,
    set(all, look) {
      clearMeshes();
      const mine = ++round;
      const dummy = new THREE.Object3D();
      const c = new THREE.Color();
      const white = new THREE.Color(0xf2f6ff);
      const grey = new THREE.Color(0x9aa09a);
      const build = (geo: THREE.BufferGeometry, mat: THREE.Material, list: Sprig[], colour: (s: Sprig) => THREE.Color, opts: { cast?: boolean; tilt?: boolean; scale?: number } = {}) => {
        if (!list.length) return;
        const m = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((s, i) => {
          dummy.position.set(s.x, s.y, s.z);
          dummy.rotation.set(opts.tilt ? (s.tone - 0.5) * 0.8 : 0, s.rot, 0);
          dummy.scale.setScalar(s.size * (opts.scale ?? 1));
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
          const col = colour(s);
          if (look.dull) col.lerp(grey, 0.4);
          m.setColorAt(i, col);
        });
        m.castShadow = !!opts.cast;
        m.receiveShadow = true;
        // Plants cover a whole island: never worth working out whether the lot is in view.
        m.frustumCulled = false;
        group.add(m);
        meshes.push(m);
      };
      const tufts = all.flatMap((s) => s.tufts);
      const flowers = look.snow ? [] : all.flatMap((s) => s.flowers);
      const bushes = all.flatMap((s) => s.bushes);
      const pebbles = all.flatMap((s) => s.pebbles);
      // Under snow the grass is dry straw poking through; beach grass (tone 2) is always pale.
      build(tuftGeo, tuftMat, look.snow ? tufts.filter((_, i) => i % 3 === 0) : tufts, (s) => (look.snow || s.tone > 1 ? c.setHex(0xe6d79a).clone() : c.setRGB(0.82 + s.tone * 0.3, 0.9 + s.tone * 0.16, 0.8 + s.tone * 0.2).clone()));
      build(flowerGeo, flowerMat, flowers, (s) => c.setHex(FLOWERS[Math.floor(s.tone * FLOWERS.length) % FLOWERS.length]).clone());
      build(bushGeo, bushMat, bushes, (s) => (look.snow ? c.setHex(0x7fa07a).lerp(white, 0.55).clone() : c.setHex(s.tone < 0.5 ? 0x5fa04a : 0x79b455).clone()), { cast: true });
      build(pebbleGeo, pebbleMat, pebbles, (s) => c.setHex(s.tone < 0.5 ? 0xb9b2a6 : 0x9c958c).clone(), { tilt: true });
      // Trees are models: drawn once they have loaded, each kind in one go.
      const trees = all.flatMap((s) => s.trees);
      const kindOf = (t: Sprig) => (look.snow ? (t.tone < 0.5 ? 'fir' : 'spruce') : t.tone < (look.dull ? 0.3 : 0.55) ? 'round' : t.tone < 0.8 ? 'fir' : 'spruce');
      const wash: [number, number] | undefined = look.snow ? [0xf4f8ff, 0.45] : look.dull ? [0x9aa49a, 0.3] : undefined;
      for (const kind of Object.keys(TREE_KINDS) as (keyof typeof TREE_KINDS)[]) {
        const list = trees.filter((t) => kindOf(t) === kind);
        if (!list.length) continue;
        parts(TREE_KINDS[kind], wash).then((ps) => {
          if (mine !== round) return;
          for (const part of ps) {
            const mat = sway(part.material.clone(), 0.03, part.material);
            treeMats.push(mat);
            const m = new THREE.InstancedMesh(part.geometry, mat, list.length);
            list.forEach((s, i) => {
              dummy.position.set(s.x, s.y - 0.03, s.z);
              dummy.rotation.set(0, s.rot, 0);
              dummy.scale.setScalar(s.size);
              dummy.updateMatrix();
              m.setMatrixAt(i, dummy.matrix.clone().multiply(part.matrix));
            });
            m.castShadow = true;
            m.receiveShadow = true;
            m.frustumCulled = false;
            group.add(m);
            meshes.push(m);
          }
        });
      }
    },
    tick(t, calm) {
      // Still in calm mode.
      if (!calm) wind.value = t;
    },
    dispose() {
      clearMeshes();
      [tuftGeo, flowerGeo, bushGeo, pebbleGeo].forEach((g) => g.dispose());
      [tuftMat, flowerMat, bushMat, pebbleMat].forEach((m) => m.dispose());
    },
  };
}
