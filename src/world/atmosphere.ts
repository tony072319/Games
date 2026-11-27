/**
 * Air and light that are not models: the lighthouse's beams and the flash of its lamp, heaps of
 * cloud drifting round the horizon, low mist lying on the fog sea, and the last touch on the whole
 * picture (darker corners, warm lights, cool shade, a little grain so soft gradients do not band).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Palette } from './palette';
import { MOON_DIR, SUN_AZIMUTH, sunHeight } from './sky3d';

const NOISE = `
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float r=0.,w=.5;for(int i=0;i<4;i++){r+=w*n(p);p=p*2.03+vec2(17.3,9.1);w*=.5;}return r;}`;

// ---------- the lighthouse beam ----------

export const BEAM_LENGTH = 60;

export interface Beam {
  group: THREE.Group;
  /** Stand at the lamp, point round the tower by `angle`, shine by `strength` (0 = off); `mist` 0..1 thickens it. */
  set(lamp: THREE.Vector3, angle: number, strength: number, mist: number, cam: THREE.Camera, t: number): void;
  dispose(): void;
}

function flareTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,250,235,1)');
  gr.addColorStop(0.12, 'rgba(255,236,190,.85)');
  gr.addColorStop(0.35, 'rgba(255,205,130,.28)');
  gr.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  // Four thin rays, like a lamp seen through a lens.
  g.globalCompositeOperation = 'lighter';
  for (const [w, hh] of [[124, 3], [3, 124]] as const) {
    const ray = g.createRadialGradient(64, 64, 0, 64, 64, 62);
    ray.addColorStop(0, 'rgba(255,240,210,.7)');
    ray.addColorStop(1, 'rgba(255,220,160,0)');
    g.fillStyle = ray;
    g.fillRect(64 - w / 2, 64 - hh / 2, w, hh);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBeam(): Beam {
  const u = { k: { value: 0 }, T: { value: 0 }, mist: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `varying float vy;varying vec3 vn;varying vec3 vp;
      void main(){vy=uv.y;vn=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vp=mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float k,T,mist;varying float vy;varying vec3 vn;varying vec3 vp;
      float h(float p){return fract(sin(p*127.1)*43758.5453);}
      void main(){
        // Bright at the lamp, thinning along its length; soft at its sides (faces seen edge-on fade away).
        float e=pow(abs(dot(normalize(vn),normalize(-vp))),1.6);
        float along=pow(vy,mix(2.6,1.5,mist))+vy*.06;
        float dust=.85+.15*sin(vy*60.-T*3.+h(floor(vy*24.))*6.);
        gl_FragColor=vec4(vec3(1.,.86,.58)*along*e*dust*k,1.);
      }`,
  });
  // The cone opens along +x from its tip.
  const cone = (r: number) => new THREE.ConeGeometry(r, BEAM_LENGTH, 28, 1, true).translate(0, -BEAM_LENGTH / 2, 0).rotateZ(Math.PI / 2);
  const wide = cone(3.0);
  const core = cone(1.0);
  const group = new THREE.Group();
  const arms: THREE.Group[] = [];
  for (const turn of [0, Math.PI]) {
    const arm = new THREE.Group();
    arm.rotation.y = turn;
    // The far beam is the fainter one (scaled short).
    if (turn) arm.scale.set(0.55, 0.8, 0.8);
    arm.add(new THREE.Mesh(wide, mat), new THREE.Mesh(core, mat));
    arms.push(arm);
    group.add(arm);
  }
  const tex = flareTexture();
  const flareMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false });
  flareMat.toneMapped = false;
  const flare = new THREE.Sprite(flareMat);
  flare.renderOrder = 5;
  group.add(flare);
  group.visible = false;
  const dir = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  return {
    group,
    set(lamp, angle, strength, mist, cam, t) {
      group.visible = strength > 0.01;
      if (!group.visible) return;
      group.position.copy(lamp);
      for (const a of arms) a.rotation.set(0, (a === arms[0] ? 0 : Math.PI) + angle, -0.045);
      u.k.value = strength * (0.2 + 0.2 * mist);
      u.T.value = t;
      u.mist.value = mist;
      // The lamp flashes as a beam swings past whoever is looking.
      dir.set(Math.cos(angle), 0, -Math.sin(angle));
      toCam.copy(cam.position).sub(lamp).setY(0).normalize();
      const facing = Math.abs(dir.dot(toCam));
      const flash = Math.pow(facing, 24);
      flare.scale.setScalar((2.6 + 5.5 * flash) * (0.6 + 0.4 * strength));
      flareMat.opacity = Math.min(1, strength * (0.55 + 0.45 * flash));
      flareMat.rotation = t * 0.05;
    },
    dispose() {
      wide.dispose();
      core.dispose();
      mat.dispose();
      tex.dispose();
      flareMat.dispose();
    },
  };
}

// ---------- clouds ----------

export interface Clouds {
  group: THREE.Group;
  setPalette(p: Palette): void;
  /** Drift on; `eye` is the camera's height, so the clouds keep their place above the horizon. */
  tick(dt: number, eye: number): void;
  dispose(): void;
}

/** One heap of cloud: a handful of round lumps on a flat-ish base. */
function cloudGeometry(seed: number): THREE.BufferGeometry {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const lumps: THREE.BufferGeometry[] = [];
  const n = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - 0.5;
    // Bigger in the middle, smaller toward the ends.
    const r = 0.55 + (0.5 - Math.abs(k)) * 0.9 + rnd() * 0.25;
    const g = new THREE.SphereGeometry(r, 14, 10);
    g.scale(1.15, 0.82, 0.95);
    g.translate(k * 3.4, r * 0.5 + rnd() * 0.25, (rnd() - 0.5) * 0.9);
    lumps.push(g);
  }
  const merged = mergeGeometries(lumps);
  lumps.forEach((g) => g.dispose());
  return merged;
}

export function createClouds(): Clouds {
  const u = {
    lit: { value: new THREE.Color() },
    shade: { value: new THREE.Color() },
    sunC: { value: new THREE.Color() },
    haze: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(SUN_AZIMUTH.x, 0.1, SUN_AZIMUTH.y).normalize() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    fog: false,
    vertexShader: `varying vec3 vn;varying vec3 W;varying float vh;
      void main(){vn=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);W=w.xyz;vh=position.y;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 lit,shade,sunC,haze,sunDir;varying vec3 vn;varying vec3 W;varying float vh;
      void main(){
        vec3 N=normalize(vn);vec3 V=normalize(cameraPosition-W);
        // Lit from the sun's side and from above; flat and shaded underneath.
        float l=dot(N,sunDir)*.45+N.y*.4+.42;
        l=smoothstep(.18,.82,l)*smoothstep(-.1,.7,vh);
        vec3 col=mix(shade,lit,l);
        // A bright fluffy edge against the light.
        float rim=pow(1.-max(0.,dot(N,V)),2.2);
        col+=sunC*rim*.22*max(0.,dot(-V,sunDir)*.5+.5);
        // Far clouds sink into the haze.
        float d=length(W.xz);
        col=mix(col,haze,smoothstep(90.,220.,d)*.4);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  // Scattered round the horizon at different heights and sizes.
  const N = 9;
  for (let i = 0; i < N; i++) {
    const g = cloudGeometry(i + 3);
    geos.push(g);
    const m = new THREE.Mesh(g, mat);
    const a = (i / N) * Math.PI * 2 + (i % 3) * 0.21;
    const r = 120 + ((i * 37) % 60);
    // Heights are above the eye (the group rides at the camera's height): 3 to 10 degrees up.
    m.position.set(Math.cos(a) * r, r * (0.05 + ((i * 53) % 13) * 0.01), Math.sin(a) * r);
    m.scale.setScalar(4 + ((i * 29) % 5) * 1.1);
    // Long side across the line of sight.
    m.rotation.y = -a + Math.PI / 2;
    m.frustumCulled = false;
    group.add(m);
  }
  return {
    group,
    setPalette(p) {
      u.lit.value.setHex(p.cloud);
      u.shade.value.setHex(p.cloudShade);
      u.sunC.value.setHex(p.sun);
      u.haze.value.setHex(p.low);
      const sun = new THREE.Vector3(SUN_AZIMUTH.x, Math.max(0.06, sunHeight(p.sunUp) + 0.1), SUN_AZIMUTH.y).normalize();
      u.sunDir.value.copy(sun).lerp(MOON_DIR, p.deep).normalize();
    },
    tick(dt, eye) {
      group.rotation.y += dt * 0.0035;
      group.position.y = eye;
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mat.dispose();
    },
  };
}

// ---------- mist on the fog sea ----------

export interface Mist {
  group: THREE.Group;
  /** How thick (0 = none), its colour, and how far from the middle the home island keeps clear. */
  set(strength: number, colour: number, clear: number): void;
  tick(t: number): void;
  dispose(): void;
}

export function createMist(): Mist {
  const u = { T: { value: 0 }, k: { value: 0 }, c: { value: new THREE.Color() }, clear: { value: 14 } };
  const geo = new THREE.PlaneGeometry(440, 440, 1, 1).rotateX(-Math.PI / 2);
  const group = new THREE.Group();
  const mats: THREE.ShaderMaterial[] = [];
  // Three thin sheets at different heights, each drifting its own way.
  [0.45, 1.3, 2.6].forEach((y, i) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...u, layer: { value: i } },
      transparent: true,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 W;void main(){vec4 w=modelMatrix*vec4(position,1.);W=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader: `uniform float T,k,clear,layer;uniform vec3 c;varying vec3 W;${NOISE}
        void main(){
          float d=length(W.xz);
          vec2 q=W.xz*(.034+layer*.008)+vec2(T*(.012+layer*.006),T*.007*(1.-layer))+layer*13.7;
          float f=fbm(q);
          float a=smoothstep(.4,.72,f);
          // Clear round the home island, thick out on the open sea, thinning at the far edge.
          a*=smoothstep(clear,clear+16.+layer*6.,d)*smoothstep(215.,150.,d);
          // Seen flat-on (from high up) a sheet is thin; looking along it, thick.
          float graze=1.-abs(normalize(cameraPosition-W).y);
          a*=k*(.3+.55*graze)*(1.-layer*.18);
          gl_FragColor=vec4(c*(1.02+.06*f),a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    mats.push(mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.renderOrder = 3 + i;
    group.add(m);
  });
  group.visible = false;
  return {
    group,
    set(strength, colour, clear) {
      group.visible = strength > 0.01;
      u.k.value = strength;
      u.c.value.setHex(colour);
      u.clear.value = clear;
    },
    tick(t) {
      u.T.value = t;
    },
    dispose() {
      geo.dispose();
      mats.forEach((m) => m.dispose());
    },
  };
}

// ---------- the last touch on the picture ----------

/** Runs after everything else, on the colours as they will be shown. */
export const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    T: { value: 0 },
    /** How dark the corners go. */
    vignette: { value: 0.3 },
    night: { value: 0 },
  },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse;uniform float T,vignette,night;varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      vec3 c=texture2D(tDiffuse,vUv).rgb;
      float l=dot(c,vec3(.299,.587,.114));
      // A little more colour, a gentle curve, warm lights and cool shade.
      c=mix(vec3(l),c,1.08);
      c=mix(c,c*c*(3.-2.*c),.22);
      c+=vec3(.022,.008,-.016)*smoothstep(.45,1.,l);
      c+=vec3(-.012,-.002,.02)*smoothstep(.5,0.,l);
      // Darker corners draw the eye to the island.
      vec2 q=vUv-.5;
      c*=1.-vignette*(1.+night*.35)*smoothstep(.32,.95,length(q*vec2(1.,1.12)));
      // Fine grain: keeps the sky's soft gradients from showing steps.
      c+=(h(vUv*913.+fract(T)*61.)-.5)/200.;
      gl_FragColor=vec4(c,1.);
    }`,
};
