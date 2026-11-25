/**
 * The sea (sample G, toward the author's concept): calm darker deep water, a glowing cyan ring with a
 * white rim around everything that touches the water, sparse white wave marks; darker beyond the
 * lighthouse's reach, with a warm edge.
 */
import * as THREE from 'three';
import type { Palette } from './palette';

export const MAX_SHORES = 64;

export interface Water {
  mesh: THREE.Mesh;
  /** Circles (x, z, radius) of everything touching the water. */
  setShores(list: [number, number, number][]): void;
  setPalette(p: Palette): void;
  setLit(radiusWorld: number): void;
  tick(t: number): void;
  dispose(): void;
}

export function createWater(): Water {
  const u = {
    T: { value: 0 },
    B: { value: Array.from({ length: MAX_SHORES }, () => new THREE.Vector3(9999, 9999, 0)) },
    deep: { value: new THREE.Color() },
    shal: { value: new THREE.Color() },
    foam: { value: new THREE.Color() },
    fogC: { value: new THREE.Color() },
    sky: { value: new THREE.Color() },
    lit: { value: 10 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `uniform float T;varying vec3 W;
      void main(){vec4 w=modelMatrix*vec4(position,1.);w.y+=sin(w.x*.5+T*1.2)*.04+sin(w.z*.6-T)*.04;W=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float T;uniform vec3 B[${MAX_SHORES}];uniform vec3 deep,shal,foam,fogC,sky;uniform float lit;varying vec3 W;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){
        float sd=1e3;for(int i=0;i<${MAX_SHORES};i++){sd=min(sd,length(W.xz-B[i].xy)-B[i].z);}
        float wob=n(W.xz*.9+vec2(T*.15,-T*.1))*.45;
        // Calm deep water with a slow, broad swell of shade; no fine streaks.
        vec3 dp=deep*(.86+.08*n(W.xz*.05+T*.01));
        // A bright cyan shallow ring that glows, with a thin white rim at its outer edge.
        float ring=1.-smoothstep(1.2,2.6,sd+wob);
        vec3 glow=mix(shal,vec3(.05,.78,.82),.9);
        vec3 col=mix(dp,glow,ring);
        float rim=smoothstep(.09,.0,abs(sd+wob-2.35))*.9;
        float edge=smoothstep(.3,.05,sd+wob*.4);
        col=mix(col,foam,max(edge,rim));
        // Sparse white wave marks out on the open water: a short curved stroke in some cells, fading in and out.
        vec2 q=W.xz/3.6;vec2 c=floor(q);float r=h(c);
        vec2 o=fract(q)-.5-vec2(h(c+3.1)-.5,h(c+7.7)-.5)*.5;
        o=mat2(.9,-.44,.44,.9)*o*(r>.5?1.:-1.);
        float arc=abs(o.y+.9*o.x*o.x-.03)-.018*(1.-abs(o.x)/.12);
        float mark=step(.62,r)*step(abs(o.x),.12)*smoothstep(.012,.0,arc);
        mark*=smoothstep(.2,.8,sin(T*.45+r*40.))*smoothstep(3.,4.5,sd);
        col=mix(col,foam,mark*.85);
        vec2 cell=floor(W.xz*6.);vec2 fr=fract(W.xz*6.)-.5;
        float sp=step(.995,h(cell+floor(T*1.5)))*smoothstep(.18,.0,length(fr))*smoothstep(1.,3.,sd)*smoothstep(22.,10.,length(W.xz));col+=vec3(1.,.97,.9)*sp*.4;
        float d=length(W.xz);float inside=1.-smoothstep(lit-1.5,lit+1.5,d);
        col*=mix(.55,1.,inside);
        col+=vec3(1.,.82,.55)*exp(-pow((d-lit)*1.2,2.))*.12;
        col=mix(col,sky,smoothstep(30.,90.,d)*.6);
        col=mix(col,fogC,smoothstep(70.,220.,length(W-cameraPosition))*.8);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const geo = new THREE.PlaneGeometry(500, 500, 160, 160).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.22;
  return {
    mesh,
    setShores(list) {
      for (let i = 0; i < MAX_SHORES; i++) {
        const s = list[i];
        if (s) u.B.value[i].set(s[0], s[1], s[2]);
        else u.B.value[i].set(9999, 9999, 0);
      }
    },
    setPalette(p) {
      u.deep.value.setHex(p.water);
      u.shal.value.setHex(p.shallow);
      u.foam.value.setHex(p.foam);
      u.fogC.value.setHex(p.fog);
      u.sky.value.setHex(p.low);
    },
    setLit(r) {
      u.lit.value = r;
    },
    tick(t) {
      u.T.value = t;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
