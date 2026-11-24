/** Soft cartoon shading for every model (sample G): a 4-step light ramp and a warm cast. */
import * as THREE from 'three';

let ramp: THREE.DataTexture | null = null;

export function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp;
  ramp = new THREE.DataTexture(new Uint8Array([150, 200, 235, 255]), 4, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
}

const WARM = new THREE.Color(1, 0.97, 0.93);
const cache = new Map<string, THREE.MeshToonMaterial>();

/** The toon version of a loaded material (shared between all copies with the same tint). */
export function toonMaterial(src: THREE.Material, tint?: number): THREE.MeshToonMaterial {
  const key = `${src.uuid}:${tint ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = src as THREE.MeshStandardMaterial;
  const m = new THREE.MeshToonMaterial({
    color: (s.color ? s.color.clone() : new THREE.Color(1, 1, 1)).multiply(WARM),
    map: s.map ?? null,
    gradientMap: toonRamp(),
    transparent: s.transparent,
    opacity: s.opacity,
    alphaTest: s.alphaTest,
    side: s.side,
  });
  if (tint !== undefined) m.color.multiply(new THREE.Color(tint));
  cache.set(key, m);
  return m;
}

export function disposeToon(): void {
  for (const m of cache.values()) m.dispose();
  cache.clear();
  ramp?.dispose();
  ramp = null;
}
