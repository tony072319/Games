/**
 * Short-lived things that answer what the player does or what the sea is doing: a ring of light
 * and a burst of sparks when something is mended, a puff of dust when something new is set down,
 * rings on the water behind a boat or where a find is lifted out, rain in a storm.
 * Everything comes from fixed pools, so an effect never costs more than moving a few points.
 */
import * as THREE from 'three';

export interface Effects {
  group: THREE.Group;
  /** Mended: a ring of light spreading on the ground and sparks rising from it. */
  mend(at: THREE.Vector3, size: number): void;
  /** Set down: dust puffing out at its foot. */
  dust(at: THREE.Vector3, size: number): void;
  /** A ring spreading on the water (a wake, a splash). */
  ripple(x: number, z: number, size?: number): void;
  /** Lifted out of the water: a ring and a few drops thrown up. */
  splash(x: number, z: number): void;
  /** Rain, 0 (none) to 1 (a storm). */
  setRain(k: number): void;
  /** The picture's height in pixels and the camera's angle of view, so sparks keep their size on any screen. */
  resize(heightPx: number, fovDeg: number): void;
  tick(dt: number, t: number, cam: THREE.Camera): void;
  dispose(): void;
}

function dot(inner: string, outer: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.5, outer);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SPARKS = 160;
const RINGS = 28;
const PUFFS = 24;
const DROPS = 900;

export function createEffects(): Effects {
  const group = new THREE.Group();

  // ---------- sparks and drops: points with their own size, colour and fade ----------
  const pos = new Float32Array(SPARKS * 3);
  const col = new Float32Array(SPARKS * 3);
  const sizeA = new Float32Array(SPARKS);
  const vel = new Float32Array(SPARKS * 3);
  const life = new Float32Array(SPARKS);
  const span = new Float32Array(SPARKS);
  const pull = new Float32Array(SPARKS);
  const tone = new Float32Array(SPARKS * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  sparkGeo.setAttribute('size', new THREE.BufferAttribute(sizeA, 1));
  const sparkTex = dot('rgba(255,255,255,1)', 'rgba(255,255,255,.35)');
  const sparkMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: sparkTex }, scale: { value: 400 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `attribute float size;attribute vec3 color;varying vec3 vc;uniform float scale;
      void main(){vc=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*scale/-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform sampler2D map;varying vec3 vc;void main(){gl_FragColor=vec4(vc,1.)*texture2D(map,gl_PointCoord);}`,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  sparks.renderOrder = 6;
  group.add(sparks);
  let nextSpark = 0;
  /** One spark: where, which way, how long it lives, its colour, its size, and how hard the ground pulls it (drops fall, sparks float). */
  function spark(x: number, y: number, z: number, vx: number, vy: number, vz: number, seconds: number, c: THREE.Color, size: number, gravity: number) {
    const i = nextSpark;
    nextSpark = (nextSpark + 1) % SPARKS;
    pos.set([x, y, z], i * 3);
    vel.set([vx, vy, vz], i * 3);
    tone.set([c.r, c.g, c.b], i * 3);
    life[i] = span[i] = seconds;
    sizeA[i] = size;
    pull[i] = gravity;
  }

  // ---------- rings: flat on the ground or the water, spreading and fading ----------
  const ringGeo = new THREE.RingGeometry(0.74, 1, 48).rotateX(-Math.PI / 2);
  const rings = Array.from({ length: RINGS }, () => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const mesh = new THREE.Mesh(ringGeo, mat);
    mesh.visible = false;
    mesh.renderOrder = 4;
    group.add(mesh);
    return { mesh, mat, t: 0, span: 1, from: 0.2, to: 1, strength: 1 };
  });
  let nextRing = 0;
  function ring(x: number, y: number, z: number, from: number, to: number, seconds: number, colour: number, strength: number, glow: boolean) {
    const r = rings[nextRing];
    nextRing = (nextRing + 1) % RINGS;
    r.mesh.position.set(x, y, z);
    r.mat.color.setHex(colour);
    if (glow) r.mat.color.multiplyScalar(2.2);
    r.mat.toneMapped = !glow;
    r.mat.blending = glow ? THREE.AdditiveBlending : THREE.NormalBlending;
    r.mat.needsUpdate = true;
    Object.assign(r, { t: 0, span: seconds, from, to, strength });
    r.mesh.visible = true;
  }

  // ---------- dust: soft puffs ----------
  const puffTex = dot('rgba(255,255,255,.9)', 'rgba(255,255,255,.4)');
  const puffs = Array.from({ length: PUFFS }, () => {
    const mat = new THREE.SpriteMaterial({ map: puffTex, color: 0xe9dcc4, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.visible = false;
    group.add(s);
    return { s, mat, t: 0, span: 1, v: new THREE.Vector3(), size: 1 };
  });
  let nextPuff = 0;

  // ---------- rain: streaks falling through a box that follows the camera's aim ----------
  const rainPos = new Float32Array(DROPS * 6);
  const rainSeed = new Float32Array(DROPS * 2);
  for (let i = 0; i < DROPS; i++) {
    const x = (Math.random() - 0.5) * 70;
    const z = (Math.random() - 0.5) * 70;
    const y = Math.random();
    rainPos.set([x, y, z, x, y, z], i * 6);
    // Which end of the streak this point is (0 top, 1 bottom).
    rainSeed.set([0, 1], i * 2);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rainGeo.setAttribute('end', new THREE.BufferAttribute(rainSeed, 1));
  const rainU = { T: { value: 0 }, k: { value: 0 }, centre: { value: new THREE.Vector3() } };
  const rainMat = new THREE.ShaderMaterial({
    uniforms: rainU,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float T,k;uniform vec3 centre;attribute float end;varying float va;
      void main(){
        // Each streak has its own speed and start; it falls, slanting with the wind, and comes round again at the top.
        float seed=fract(sin(dot(position.xz,vec2(12.9898,78.233)))*43758.5453);
        float fall=fract(position.y-T*(1.5+seed*.6));
        vec3 p=vec3(position.x,fall*26.-2.,position.z);
        p.y-=end*(1.1+seed*.8);
        p.x+=(1.-fall)*5.+end*.22;
        p+=vec3(centre.x,0.,centre.z);
        va=(1.-end*.7)*step(seed,k)*.5;
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
      }`,
    fragmentShader: `varying float va;void main(){gl_FragColor=vec4(.8,.88,1.,va);}`,
  });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  rain.visible = false;
  rain.renderOrder = 7;
  group.add(rain);

  const gold = new THREE.Color(0xffd98a);
  const white = new THREE.Color(0xffffff);
  const pale = new THREE.Color(0xdff4ff);
  const tmp = new THREE.Color();
  const aim = new THREE.Vector3();

  return {
    group,
    mend(at, size) {
      const r = Math.max(0.8, size);
      // A pale ring that shows on any ground, and a glow with it that shows at night.
      ring(at.x, at.y + 0.14, at.z, r * 0.5, r * 3.2, 1.1, 0xfff3c4, 0.95, false);
      ring(at.x, at.y + 0.12, at.z, r * 0.4, r * 3.0, 1.1, 0xffd98a, 1, true);
      ring(at.x, at.y + 0.12, at.z, r * 0.2, r * 2.0, 1.5, 0xfff2c8, 0.7, true);
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = r * (0.3 + Math.random() * 0.6);
        tmp.copy(gold).lerp(white, Math.random() * 0.6).multiplyScalar(1.6);
        spark(at.x + Math.cos(a) * d, at.y + 0.2 + Math.random() * r * 0.6, at.z + Math.sin(a) * d, Math.cos(a) * 0.5, 1.4 + Math.random() * 1.6, Math.sin(a) * 0.5, 1.0 + Math.random() * 0.8, tmp, 0.2 + Math.random() * 0.2, -0.3);
      }
    },
    dust(at, size) {
      const r = Math.max(0.5, size);
      for (let i = 0; i < 6; i++) {
        const p = puffs[nextPuff];
        nextPuff = (nextPuff + 1) % PUFFS;
        const a = (i / 6) * Math.PI * 2 + Math.random();
        p.s.position.set(at.x + Math.cos(a) * r * 0.5, at.y + 0.15, at.z + Math.sin(a) * r * 0.5);
        p.v.set(Math.cos(a) * 0.9, 0.35, Math.sin(a) * 0.9);
        p.t = 0;
        p.span = 0.7 + Math.random() * 0.3;
        p.size = r * (0.5 + Math.random() * 0.4);
        p.s.visible = true;
      }
    },
    ripple(x, z, size = 1) {
      ring(x, -0.16, z, 0.15 * size, 1.2 * size, 1.6, 0xffffff, 0.5, false);
    },
    splash(x, z) {
      ring(x, -0.16, z, 0.2, 1.5, 1.1, 0xffffff, 0.8, false);
      ring(x, -0.16, z, 0.1, 0.9, 1.5, 0xffffff, 0.5, false);
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        tmp.copy(pale).multiplyScalar(0.9);
        spark(x, -0.1, z, Math.cos(a) * (0.6 + Math.random()), 2.4 + Math.random() * 1.6, Math.sin(a) * (0.6 + Math.random()), 0.7 + Math.random() * 0.3, tmp, 0.12 + Math.random() * 0.08, 7);
      }
    },
    resize(heightPx, fovDeg) {
      sparkMat.uniforms.scale.value = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
    },
    setRain(k) {
      rainU.k.value = k;
      rain.visible = k > 0.01;
    },
    tick(dt, t, cam) {
      // Sparks.
      let any = false;
      for (let i = 0; i < SPARKS; i++) {
        if (life[i] <= 0) continue;
        any = true;
        life[i] -= dt;
        const k = Math.max(0, life[i] / span[i]);
        vel[i * 3 + 1] -= pull[i] * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        // Quick to appear, slow to fade.
        const a = Math.min(1, (1 - k) * 8) * k;
        col[i * 3] = tone[i * 3] * a;
        col[i * 3 + 1] = tone[i * 3 + 1] * a;
        col[i * 3 + 2] = tone[i * 3 + 2] * a;
        if (life[i] <= 0) col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
      }
      sparks.visible = any;
      if (any) {
        sparkGeo.attributes.position.needsUpdate = true;
        sparkGeo.attributes.color.needsUpdate = true;
        sparkGeo.attributes.size.needsUpdate = true;
      }
      // Rings.
      for (const r of rings) {
        if (!r.mesh.visible) continue;
        r.t += dt;
        const k = r.t / r.span;
        if (k >= 1) {
          r.mesh.visible = false;
          continue;
        }
        const e = 1 - (1 - k) * (1 - k);
        r.mesh.scale.setScalar(r.from + (r.to - r.from) * e);
        r.mat.opacity = r.strength * (1 - k) * Math.min(1, k * 10);
      }
      // Dust.
      for (const p of puffs) {
        if (!p.s.visible) continue;
        p.t += dt;
        const k = p.t / p.span;
        if (k >= 1) {
          p.s.visible = false;
          continue;
        }
        p.s.position.addScaledVector(p.v, dt * (1 - k));
        p.s.scale.setScalar(p.size * (0.5 + k));
        p.mat.opacity = 0.55 * (1 - k) * Math.min(1, k * 8);
      }
      // Rain falls where the camera is looking.
      if (rain.visible) {
        rainU.T.value = t;
        cam.getWorldDirection(aim);
        rainU.centre.value.copy(cam.position).addScaledVector(aim, 30);
      }
    },
    dispose() {
      sparkGeo.dispose();
      sparkMat.dispose();
      sparkTex.dispose();
      ringGeo.dispose();
      rings.forEach((r) => r.mat.dispose());
      puffTex.dispose();
      puffs.forEach((p) => p.mat.dispose());
      rainGeo.dispose();
      rainMat.dispose();
    },
  };
}
