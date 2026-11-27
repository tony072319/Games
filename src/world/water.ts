/**
 * The sea (sample G): clear water that deepens away from land, a glowing shallow ring with a white
 * rim and ripples lapping in around everything that touches it, long soft streaks of light and
 * shade drifting over the open water, glitter under the sun and the moon, and a warm pool of light
 * where the lighthouse beam falls. Beyond the light's reach it is darker; far out it melts into the sky.
 */
import * as THREE from 'three';
import type { Palette } from './palette';
import { MOON_DIR, SUN_AZIMUTH, farSea } from './sky3d';

export const MAX_SHORES = 64;

export interface Water {
  mesh: THREE.Mesh;
  /** Circles (x, z, radius) of everything touching the water. */
  setShores(list: [number, number, number][]): void;
  setPalette(p: Palette): void;
  setLit(radiusWorld: number): void;
  /** Where the lighthouse beam points (angle round the tower) and how bright it is (0 = off). */
  setBeam(angle: number, strength: number): void;
  /** The fog sea's air: how thick (0 = clear), where it starts and where it is full (world units from the camera). */
  setFog(haze: number, near: number, far: number): void;
  /** 0 = calm, 1 = a storm: a bigger swell and more white on it. */
  setRough(k: number): void;
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
    far: { value: new THREE.Color() },
    skyMid: { value: new THREE.Color() },
    sunC: { value: new THREE.Color() },
    lit: { value: 10 },
    night: { value: 0 },
    deepNight: { value: 0 },
    haze: { value: 0 },
    rough: { value: 0 },
    glint: { value: new THREE.Vector2(SUN_AZIMUTH.x, SUN_AZIMUTH.y) },
    beam: { value: new THREE.Vector3(1, 0, 0) },
    fogR: { value: new THREE.Vector2(70, 220) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `uniform float T,rough;varying vec3 W;
      void main(){vec4 w=modelMatrix*vec4(position,1.);
        w.y+=(sin(w.x*.5+T*1.2)*.04+sin(w.z*.6-T)*.04+sin((w.x+w.z)*.23+T*.7)*.03)*(1.+rough*2.2);
        W=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float T;uniform vec3 B[${MAX_SHORES}];uniform vec3 deep,shal,foam,fogC,far,skyMid,sunC;
      uniform float lit,night,deepNight,haze,rough;uniform vec2 glint;uniform vec3 beam;uniform vec2 fogR;varying vec3 W;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){
        float sd=1e3;for(int i=0;i<${MAX_SHORES};i++){sd=min(sd,length(W.xz-B[i].xy)-B[i].z);}
        float wob=n(W.xz*.9+vec2(T*.15,-T*.1))*.45;
        float d=length(W.xz);
        vec3 toCam=cameraPosition-W;float camD=length(toCam);vec3 V=toCam/camD;
        // Deep water with a slow, broad swell of shade.
        vec3 dp=deep*(.84+.12*n(W.xz*.05+T*.01));
        // Long soft streaks lying across the swell: lighter crests, darker troughs (two layers, drifting apart).
        float s1=n(W.xz*vec2(.15,.62)+vec2(T*.03,T*.1));
        float s2=n(W.xz*vec2(.085,.36)+vec2(-T*.02,-T*.06)+7.3);
        float crest=(smoothstep(.72-rough*.14,.86,s1)*.65+smoothstep(.74-rough*.14,.9,s2)*.35)*(1.+rough*.6);
        float trough=smoothstep(.36,.14,s1)*.5+smoothstep(.32,.1,s2)*.5;
        float open=smoothstep(2.2,5.,sd);
        float near=smoothstep(190.,50.,camD);
        dp=mix(dp,dp*.84,trough*.6*open*near);
        dp=mix(dp,mix(dp,foam,.3),crest*open*near*(.8-.35*night));
        // The shallows: turquoise that glows near land and fades out to the deep.
        vec3 glow=mix(shal,vec3(.05,.78,.82),.82-rough*.45-deepNight*.12);
        float ring=1.-smoothstep(1.1,2.8,sd+wob);
        float apron=(1.-smoothstep(2.2,7.,sd+wob*2.))*.42;
        vec3 col=mix(dp,glow,max(ring,apron));
        // A thin white rim where the shallows end, ripples lapping in toward the beach, and foam at the edge.
        float rim=smoothstep(.09,.0,abs(sd+wob-2.35))*.9;
        float lap=fract((sd+wob*.7)*.95+T*.16);
        float ripple=smoothstep(.0,.07,lap)*smoothstep(.2,.09,lap)*smoothstep(2.1,.4,sd)*.4;
        float edge=smoothstep(.3,.05,sd+wob*.4);
        col=mix(col,foam,max(max(edge,rim),ripple));
        // Sparks of light on the water near home.
        vec2 cell=floor(W.xz*6.);vec2 fr=fract(W.xz*6.)-.5;
        float sp=step(.995,h(cell+floor(T*1.5)))*smoothstep(.18,.0,length(fr))*smoothstep(1.,3.,sd)*smoothstep(26.,10.,d);
        col+=vec3(1.,.97,.9)*sp*.45;
        // Beyond the light's reach the sea is darker and quieter.
        float inside=1.-smoothstep(lit*.82,lit*1.12+2.,d);
        col*=mix(mix(.8,.5,night),1.,inside);
        col+=vec3(1.,.82,.55)*exp(-pow((d-lit)*.45,2.))*.07*night;
        // The sky lies on the water at a low angle.
        float fres=pow(1.-max(V.y,0.),4.);
        col=mix(col,skyMid,fres*.28);
        // Glitter under the sun, or under the moon when the night is deep.
        vec2 toP=normalize(W.xz-cameraPosition.xz+1e-4);
        float path=pow(max(0.,dot(toP,glint)),mix(70.,110.,deepNight));
        float gl=n(W.xz*vec2(.7,2.6)+vec2(T*.3,T*.7));
        float twinkle=smoothstep(.6,.82,gl);
        float glK=(1.-night)*.8+deepNight*.3;
        col+=sunC*path*(twinkle*.42+.12)*glK*smoothstep(10.,40.,camD)*smoothstep(1.5,4.,sd);
        // The lighthouse beam falls on the water as a long warm pool that sweeps round.
        if(beam.z>0.){
          float along=dot(W.xz,beam.xy);
          float across=abs(W.x*beam.y-W.z*beam.x);
          float wdt=1.2+along*.16;
          float pool=smoothstep(2.,9.,along)*smoothstep(lit*1.25+8.,lit*.5,along)*exp(-across*across/(wdt*wdt));
          col+=vec3(1.,.83,.52)*pool*beam.z*(.34+.2*crest);
        }
        // Far away the sea takes the colour of the horizon, then the air's haze.
        col=mix(col,far,smoothstep(40.,200.,d));
        col=mix(col,fogC,smoothstep(fogR.x,fogR.y,camD)*.9*haze);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  let pal: Palette | null = null;
  const geo = new THREE.PlaneGeometry(520, 520, 160, 160).rotateX(-Math.PI / 2);
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
      pal = p;
      u.far.value.setHex(farSea(p, u.haze.value));
      u.skyMid.value.setHex(p.mid);
      u.sunC.value.setHex(p.sun);
      u.night.value = p.night;
      u.deepNight.value = p.deep;
      // The glitter lies toward the sun; deep in the night, toward the moon.
      const g = u.glint.value;
      if (p.deep > 0.5) g.set(MOON_DIR.x, MOON_DIR.z).normalize();
      else g.set(SUN_AZIMUTH.x, SUN_AZIMUTH.y);
    },
    setLit(r) {
      u.lit.value = r;
    },
    setBeam(angle, strength) {
      // The beam mesh turns by rotation.y = angle: it points along (cos, -sin) on the sea.
      u.beam.value.set(Math.cos(angle), -Math.sin(angle), strength);
    },
    setFog(haze, near, far) {
      u.haze.value = haze;
      if (pal) u.far.value.setHex(farSea(pal, haze));
      u.fogR.value.set(near, far);
    },
    setRough(k) {
      u.rough.value = k;
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
