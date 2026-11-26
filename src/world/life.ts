/**
 * Things that live in the world without being part of the game state
 * ("the brighter the light, the livelier the sea"): smoke from the chimney, fireflies at night,
 * gulls, a fish jumping, ship lights far out, clouds, and — once the light is strong — a whale and dolphins.
 */
import * as THREE from 'three';
import { heightAt, ringPoint, type Shape } from './terrain';
import type { ModelId } from './assets';

export interface LifeContext {
  night: number;
  light: number;
  calm: boolean;
  cam: THREE.Camera;
  /** Where smoke rises from (top of the keeper's house), if it is there. */
  chimney: THREE.Vector3 | null;
  /** The home island's ground, so life keeps to the air above it and the water around it. */
  home?: Shape;
}
export interface Life {
  update(dt: number, t: number, ctx: LifeContext): void;
  /** Test build: bring the whale by now. */
  summon(): void;
  dispose(): void;
}
export type TemplateFn = (id: ModelId) => Promise<unknown>;
export type InstanceFn = (t: never, item: { model: ModelId; size?: number; tint?: number }) => THREE.Object3D;

function softDot(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.6, 'rgba(255,255,255,.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createLife(scene: THREE.Scene, template: TemplateFn, instance: InstanceFn): Life {
  const root = new THREE.Group();
  scene.add(root);
  const dot = softDot();
  const holder = (model: ModelId, size?: number, tint?: number) => {
    const g = new THREE.Group();
    root.add(g);
    template(model).then((t) => {
      if (t) g.add(instance(t as never, { model, size, tint }));
    });
    return g;
  };

  // Smoke.
  const puffs = Array.from({ length: 8 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xffffff, transparent: true, depthWrite: false }));
    root.add(s);
    return { s, o: i / 8 };
  });

  // Fireflies.
  const FF = 24;
  const ffPos = new Float32Array(FF * 3);
  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({ map: dot, color: new THREE.Color(0xfff2a0).multiplyScalar(2.5), size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  ffMat.toneMapped = false;
  const fireflies = new THREE.Points(ffGeo, ffMat);
  root.add(fireflies);
  const ffSeed = Array.from({ length: FF }, () => [Math.random() * Math.PI * 2, 1 + Math.random() * 3.5, 0.5 + Math.random() * 2, Math.random() * 9]);

  // Gulls.
  const gulls = Array.from({ length: 3 }, () => holder('lh/seagull'));

  // A fish jumping, with a splash ring.
  const fish = holder('kpet/animal-fish');
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 24).rotateX(-Math.PI / 2), ringMat);
  ring.position.y = -0.18;
  root.add(ring);

  // Ship lights far out.
  const shipMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd98a).multiplyScalar(3), toneMapped: false });
  const shipGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const ships = Array.from({ length: 5 }, (_, i) => {
    const m = new THREE.Mesh(shipGeo, shipMat);
    const a = -2.2 + i * 0.55;
    m.position.set(Math.cos(a) * 70, 0.2, Math.sin(a) * 70);
    root.add(m);
    return m;
  });

  // Clouds.
  const clouds = [
    [-22, 13, -30, 2.2],
    [18, 15, -34, 2.8],
    [4, 18, -45, 3.2],
    [-34, 11, -10, 2],
    [30, 12, -8, 2.4],
  ].map(([x, y, z, s]) => {
    const c = holder('kk/cloud_big', 2 * s, 0xfff0f4);
    c.position.set(x, y, z);
    return c;
  });

  // Whale and dolphins (Quaternius, with their swim animation).
  const mixers: THREE.AnimationMixer[] = [];
  const animal = (model: ModelId) => {
    const g = new THREE.Group();
    g.visible = false;
    root.add(g);
    template(model).then((t) => {
      if (!t) return;
      const o = instance(t as never, { model });
      g.add(o);
      const clips = (t as { animations: THREE.AnimationClip[] }).animations;
      if (clips.length) {
        const mx = new THREE.AnimationMixer(o);
        mx.clipAction(clips.find((c) => /swim/i.test(c.name)) ?? clips[0]).play();
        mixers.push(mx);
      }
    });
    return g;
  };
  const whale = animal('qf/Whale');
  const dolphins = [animal('qf/Dolphin'), animal('qf/Dolphin')];
  let whaleAt = 20 + Math.random() * 40;
  let lastT = 0;
  let forced = false;

  return {
    summon() {
      whaleAt = lastT;
      forced = true;
    },
    update(dt, t, ctx) {
      lastT = t;
      for (const m of mixers) m.update(dt);
      // Smoke.
      for (const p of puffs) {
        p.s.visible = !!ctx.chimney;
        if (!ctx.chimney) continue;
        const k = (t * 0.25 + p.o) % 1;
        p.s.position.set(ctx.chimney.x + Math.sin(k * 6 + p.o * 9) * 0.15 + k * 0.5, ctx.chimney.y + k * 2.2, ctx.chimney.z - k * 0.2);
        p.s.scale.setScalar(0.25 + k * 0.7);
        p.s.material.opacity = (1 - k) * 0.5 * Math.min(1, k * 6);
      }
      // Fireflies come out in the evening.
      fireflies.visible = ctx.night > 0.3;
      if (fireflies.visible) {
        // Over the island, at its scale, floating above the ground beneath them.
        const k = ctx.home ? ctx.home.radius / 6 : 1;
        for (let i = 0; i < FF; i++) {
          const [a, R, y, o] = ffSeed[i];
          const fx = Math.cos(a + t * 0.12) * R * k + Math.sin(t * 0.7 + o) * 0.3;
          const fz = Math.sin(a + t * 0.12) * R * k;
          ffPos[i * 3] = fx;
          ffPos[i * 3 + 1] = (ctx.home ? Math.max(0, heightAt(ctx.home, fx, fz)) : 0) + y + Math.sin(t * 1.3 + o) * 0.25;
          ffPos[i * 3 + 2] = fz;
        }
        ffGeo.attributes.position.needsUpdate = true;
        ffMat.opacity = Math.min(1, (ctx.night - 0.3) * 2);
      }
      // More gulls as the light grows.
      const nGull = Math.min(3, 1 + Math.floor(ctx.light / 3));
      gulls.forEach((g, i) => {
        g.visible = i < nGull;
        const a = t * 0.35 + i * 2.1;
        const k = ctx.home ? ctx.home.radius / 6 : 1;
        const R = (4 + i * 1.2) * k;
        const gx = Math.cos(a) * R;
        const gz = Math.sin(a) * R;
        // Well above the ground and the lighthouse.
        const ground = ctx.home ? Math.max(0, heightAt(ctx.home, gx, gz)) : 0;
        g.position.set(gx, ground + 5.2 + i * 0.6 + Math.sin(t + i) * 0.3, gz);
        g.rotation.y = -a;
        g.rotation.z = Math.sin(t * 6 + i) * 0.15;
      });
      // A fish jumps now and then once the light is up.
      {
        const on = ctx.light >= 2 && !ctx.calm;
        const ph = (t * 0.35) % 3;
        // Out in open water, just off the island's front-left shore.
        const [x, z] = ctx.home ? ringPoint(ctx.home, 1.22, 2.3) : [-6.5, 11.5];
        if (on && ph < 1) {
          fish.visible = true;
          fish.position.set(x + ph * 1.6, -0.25 + Math.sin(ph * Math.PI) * 1.1, z);
          fish.rotation.set(0, Math.PI / 2, -Math.cos(ph * Math.PI) * 0.9);
        } else fish.visible = false;
        const rk = ph < 1 ? ph : ph - 1;
        ring.visible = on && rk < 1;
        ring.position.set(x + (ph < 1 ? 0 : 1.6), -0.18, z);
        ring.scale.setScalar(1 + rk * 5);
        ringMat.opacity = Math.max(0, 0.7 - rk * 0.7);
      }
      // Ship lights: one more for every two levels of light.
      const nShip = Math.floor(ctx.light / 2);
      ships.forEach((s, i) => {
        s.visible = i < nShip;
        s.scale.setScalar(0.7 + 0.3 * Math.max(0, Math.sin(t * 1.5 + i * 2)));
      });
      // Clouds drift.
      for (const c of clouds) {
        c.position.x += dt * 0.25;
        if (c.position.x > 45) c.position.x = -45;
      }
      // The whale passes far out every few minutes once the light reaches 5.
      if ((ctx.light >= 5 || forced) && !ctx.calm && t > whaleAt) {
        const k = (t - whaleAt) / 40;
        if (k > 1) {
          whale.visible = false;
          forced = false;
          whaleAt = t + 120 + Math.random() * 120;
        } else {
          whale.visible = true;
          const a = 2.4 + k * 1.6;
          // Far out, beyond the islands.
          whale.position.set(Math.cos(a) * 38, -1.1 + Math.max(0, Math.sin(k * Math.PI * 3)) * 0.8, Math.sin(a) * 38);
          whale.rotation.y = -a;
        }
      } else whale.visible = false;
      // A pair of dolphins once the light reaches 8.
      dolphins.forEach((d, i) => {
        d.visible = ctx.light >= 8 && !ctx.calm;
        if (!d.visible) return;
        const a = t * 0.16 + i * 0.5 + 4;
        // Round the island, out past its shore.
        const R = (ctx.home ? ctx.home.radius * 1.45 : 12) + i;
        const ph = (t * 0.9 + i * 0.7) % 3.2;
        const jump = ph < 1.2 ? Math.sin((ph / 1.2) * Math.PI) * 1.3 : -1.5;
        d.position.set(Math.cos(a) * R, -0.3 + jump, Math.sin(a) * R);
        d.rotation.set(0, -a, ph < 1.2 ? Math.cos((ph / 1.2) * Math.PI) * 0.6 : 0);
      });
    },
    dispose() {
      scene.remove(root);
      dot.dispose();
      ffGeo.dispose();
      ffMat.dispose();
      ringMat.dispose();
      ring.geometry.dispose();
      shipGeo.dispose();
      shipMat.dispose();
      puffs.forEach((p) => p.s.material.dispose());
    },
  };
}
