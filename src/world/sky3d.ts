/** Pastel gradient sky with a soft sun glow (sample G); stars and the odd meteor at night. */
import * as THREE from 'three';
import type { Palette } from './palette';

export interface SkyDome {
  mesh: THREE.Mesh;
  setPalette(p: Palette): void;
  /** 1 under the aurora sea: green ribbons across the night sky. */
  setAurora(k: number): void;
  tick(t: number): void;
  dispose(): void;
}

export function createSky(): SkyDome {
  const u = {
    a: { value: new THREE.Color() },
    b: { value: new THREE.Color() },
    c: { value: new THREE.Color() },
    s: { value: new THREE.Color() },
    T: { value: 0 },
    night: { value: 0 },
    aurora: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: u,
    vertexShader: `varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 a,b,c,s;uniform float T,night,aurora;varying vec3 v;
      float h(vec3 p){return fract(sin(dot(p,vec3(12.9,78.2,37.7)))*43758.5);}
      void main(){float y=clamp(v.y,0.,1.);vec3 col=mix(c,b,smoothstep(.0,.22,y));col=mix(col,a,smoothstep(.18,.7,y));
        vec3 sd=normalize(vec3(-.7,.12,-1.));float d=max(0.,dot(v,sd));col+=s*(pow(d,400.)*1.6+pow(d,24.)*.35+pow(d,4.)*.12)*(1.-night*.7);
        vec3 g=floor(v*260.);col+=step(.996,h(g))*smoothstep(.15,.5,v.y)*(.6+.4*sin(T*2.+h(g)*50.))*smoothstep(.4,.9,night);
        float m=mod(T,37.);vec3 md=normalize(vec3(.4+m*.02,.55-m*.01,-1.));float streak=pow(max(0.,dot(v,md)),3000.)*step(m,1.2)*smoothstep(.6,1.,night);col+=vec3(1.)*streak*2.;
        float rib=sin(v.x*6.+T*.15+sin(v.z*4.+T*.1)*1.5);float band=smoothstep(.03,.12,v.y)*smoothstep(.5,.2,v.y)*pow(max(0.,rib),4.);
        col+=vec3(.25,1.,.6)*band*aurora*(.25+.75*night)*.6;
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  });
  const geo = new THREE.SphereGeometry(300, 32, 16);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return {
    mesh,
    setPalette(p) {
      u.a.value.setHex(p.top);
      u.b.value.setHex(p.mid);
      u.c.value.setHex(p.low);
      u.s.value.setHex(p.sun);
      u.night.value = p.night;
    },
    setAurora(k) {
      u.aurora.value = k;
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
