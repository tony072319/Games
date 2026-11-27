/**
 * The painted sky: a soft gradient, a low sun that sinks as evening comes, a moon and stars at
 * night, drifting clouds lit from the sun's side, long streaks of cloud near the horizon, and
 * curtains of aurora over the ice sea. All drawn in one shader on the inside of a big ball.
 */
import * as THREE from 'three';
import { mixColour, type Palette } from './palette';

/** The colour of the sea far out, where it meets the sky: its own colour, lightened by the air. */
export const farSea = (p: Palette, haze = 0) => mixColour(mixColour(mixColour(p.water, p.low, 0.42), p.fog, 0.12), p.fog, haze * 0.9);

/** Where the sun sets and the moon stands (shared with the sea, so the glitter lies under them). */
export const SUN_AZIMUTH = new THREE.Vector2(-0.334, -0.942).normalize();
/** Low over the sea, left of the lighthouse as the everyday camera sees it. */
export const MOON_DIR = new THREE.Vector3(-0.541, 0.1, -0.847).normalize();
/** The sun's height (the y of its direction) for how much of it is still up: half set at its highest, then sinking. */
export const sunHeight = (sunUp: number) => -0.1 + 0.112 * sunUp;

export interface SkyDome {
  mesh: THREE.Mesh;
  setPalette(p: Palette): void;
  /** 1 under the aurora sea: green ribbons across the night sky. */
  setAurora(k: number): void;
  /** 0..1 how thick the air is (the fog sea): the clouds close in and the sun dims. */
  setHaze(k: number): void;
  tick(t: number): void;
  dispose(): void;
}

export function createSky(): SkyDome {
  let hazeK = 0;
  const u = {
    a: { value: new THREE.Color() },
    b: { value: new THREE.Color() },
    c: { value: new THREE.Color() },
    s: { value: new THREE.Color() },
    cl: { value: new THREE.Color() },
    cs: { value: new THREE.Color() },
    sea: { value: new THREE.Color() },
    T: { value: 0 },
    night: { value: 0 },
    deep: { value: 0 },
    sunY: { value: 0.1 },
    aurora: { value: 0 },
    haze: { value: 0 },
    sunAz: { value: SUN_AZIMUTH },
    moonDir: { value: MOON_DIR },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: u,
    vertexShader: `varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 a,b,c,s,cl,cs,sea;uniform float T,night,deep,sunY,aurora,haze;uniform vec2 sunAz;uniform vec3 moonDir;varying vec3 v;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float h3(vec3 p){return fract(sin(dot(p,vec3(12.9,78.2,37.7)))*43758.5);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float r=0.,w=.5;for(int i=0;i<4;i++){r+=w*n(p);p=p*2.03+vec2(17.3,9.1);w*=.5;}return r;}
      void main(){
        vec3 d=normalize(v);
        float y=d.y;
        // The gradient: warm at the horizon, through the middle colour, to the top.
        vec3 col=mix(c,b,smoothstep(.0,.16,y));
        col=mix(col,a,smoothstep(.1,.5,y));
        vec3 sd=normalize(vec3(sunAz.x,sunY,sunAz.y));
        float sdot=max(0.,dot(d,sd));
        float sunUp=smoothstep(-.1,.0,sunY);
        // The glow of the sunset: the sun's own colour deepened toward the horizon's.
        vec3 warm=mix(s,c,.55);
        float az=max(0.,dot(normalize(d.xz+1e-4),sunAz));
        col+=warm*exp(-abs(y-.01)*10.)*pow(az,4.)*(.1-.05*deep)*(1.-haze*.6);
        col+=warm*(pow(sdot,80.)*.16+pow(sdot,12.)*.06)*(.3+.7*sunUp)*(1.-deep*.8)*(1.-haze*.5);
        // The sun: a big round disc, half set.
        float disc=smoothstep(.9979,.9984,sdot);
        col=mix(col,mix(s,vec3(1.,.74,.36),.35)*1.6,disc*sunUp*(1.-haze*.5));
        // Stars: small ones everywhere, a few big ones, all twinkling.
        float up=smoothstep(.0,.03,y);
        vec3 sp=d*210.;vec3 g=floor(sp);float st=step(.996,h3(g))*smoothstep(.42,.05,length(fract(sp)-.5))*(.55+.45*sin(T*2.+h3(g)*50.));
        vec3 sp2=d*90.;vec3 g2=floor(sp2);st+=step(.9982,h3(g2+7.))*smoothstep(.3,.0,length(fract(sp2)-.5))*(.7+.3*sin(T*1.3+h3(g2)*31.))*2.2;
        col+=vec3(.95,.97,1.)*st*up*smoothstep(.35,.95,night)*(.45+.55*deep)*(1.-haze*.8);
        // A shooting star now and then.
        float m=mod(T,37.);vec3 md=normalize(vec3(.4+m*.02,.55-m*.01,-1.));
        col+=vec3(1.)*pow(max(0.,dot(d,md)),3000.)*step(m,1.2)*smoothstep(.6,1.,night)*2.;
        // The moon: a pale disc with a soft halo, out once the evening has gone.
        float mdot=max(0.,dot(d,moonDir));
        float moonK=deep*(1.-haze*.6);
        float md2=smoothstep(.99935,.99965,mdot);
        float shade=n(d.xy*90.)*.18;
        col=mix(col,vec3(1.,.98,.9)*(1.25-shade),md2*moonK);
        col+=vec3(.75,.82,1.)*(pow(mdot,300.)*.5+pow(mdot,20.)*.16)*moonK;
        // Aurora: curtains that sway, green low down and violet above.
        if(aurora>0.){
          vec2 q=d.xz/(y+.6);
          float sway=fbm(q*.9+vec2(T*.03,0.))*3.2;
          float rib=sin(q.x*2.6+sway+T*.07);
          float curtain=pow(max(0.,1.-abs(rib)),5.);
          float rays=.55+.45*n(vec2(q.x*26.+sway*4.,T*.25));
          float band=smoothstep(.006,.05,y)*smoothstep(.42,.1,y);
          vec3 ac=mix(vec3(.2,1.,.62),vec3(.62,.42,1.),smoothstep(.06,.3,y));
          col+=ac*curtain*rays*band*aurora*(.3+.7*night)*.85;
        }
        // Clouds: long heaps lying along the horizon, drifting; the low sun lights them from beneath.
        if(y>.0){
          float ang=atan(d.x,-d.z);
          vec2 q=vec2(ang*2.4+T*.004,y*13.-T*.0006);
          float cover=mix(.5,.36,haze);
          float f=fbm(q);
          float dens=smoothstep(cover,cover+.16,f);
          float under=clamp((fbm(q+vec2(.05,-.35))-f)*4.+.45,0.,1.);
          float toSun=pow(az,2.);
          vec3 cc=mix(cs,cl,smoothstep(.15,.85,mix(.55,under,.5+.5*sunUp)));
          cc+=warm*toSun*under*.3*sunUp;
          float fade=smoothstep(.012,.05,y)*(1.-smoothstep(.5,.9,y)*.7);
          col=mix(col,cc,dens*fade*mix(.92,.7,deep));
          // Thin streaks right above the horizon.
          float bandN=n(vec2(ang*5.+T*.004,y*60.));
          float streak=smoothstep(.64,.8,bandN)*smoothstep(.008,.03,y)*smoothstep(.13,.05,y);
          col=mix(col,mix(cs,cl,.7)+warm*.15*sunUp*toSun,streak*.5*(1.-haze*.5));
        }
        // Under the horizon lies the far sea, a shade darker than the sky, hazy where they meet.
        col=mix(col,mix(sea,c,smoothstep(-.03,.0,y)*.3),smoothstep(.003,-.003,y));
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  });
  const geo = new THREE.SphereGeometry(300, 48, 24);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return {
    mesh,
    setPalette(p) {
      u.a.value.setHex(p.top);
      u.b.value.setHex(p.mid);
      u.c.value.setHex(p.low);
      u.s.value.setHex(p.sun);
      u.cl.value.setHex(p.cloud);
      u.cs.value.setHex(p.cloudShade);
      u.sea.value.setHex(farSea(p, hazeK));
      u.night.value = p.night;
      u.deep.value = p.deep;
      u.sunY.value = sunHeight(p.sunUp);
    },
    setAurora(k) {
      u.aurora.value = k;
    },
    setHaze(k) {
      hazeK = k;
      u.haze.value = k;
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
