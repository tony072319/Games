/**
 * The paint on the islands' ground. The mesh only knows its shape and where the roads run; this
 * material works out, point by point, what lies there: grass in lighter and deeper patches with
 * dabs of flowers, sand that darkens where the sea wets it, rock in layers on the steep faces
 * (drawn in flat facets, so cliffs keep their cut-stone look), and roads of packed earth.
 * In the ice sea snow lies on everything flat; in the fog sea the colours are muted.
 */
import * as THREE from 'three';

export interface GroundPaint {
  sand: number;
  grass: number;
  rock: number;
  path: number;
  /** Blend toward this colour by this much (snow, fog, an island still in the dark). */
  wash?: [number, number];
  /** Above this height everything is rock (a sea stack); leave out for ordinary islands. */
  rockAbove?: number;
}

let softRamp: THREE.DataTexture | null = null;
/** The same four tones as the models' cartoon shading, but blended, so rolling ground has no hard bands of light. */
function groundRamp(): THREE.DataTexture {
  if (softRamp) return softRamp;
  softRamp = new THREE.DataTexture(new Uint8Array([150, 200, 235, 255]), 4, 1, THREE.RedFormat);
  softRamp.minFilter = softRamp.magFilter = THREE.LinearFilter;
  softRamp.needsUpdate = true;
  return softRamp;
}

const lum = (c: THREE.Color) => 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;

export function groundMaterial(p: GroundPaint): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: groundRamp() });
  const wash = new THREE.Color(p.wash?.[0] ?? 0xffffff);
  const washK = p.wash?.[1] ?? 0;
  // A pale wash is snow: it lies on the flat and leaves the cliffs mostly bare.
  const snow = washK > 0 && lum(wash) > 0.7;
  const u = {
    uSand: { value: new THREE.Color(p.sand) },
    uGrass: { value: new THREE.Color(p.grass) },
    uRock: { value: new THREE.Color(p.rock) },
    uPath: { value: new THREE.Color(p.path) },
    uWash: { value: new THREE.Vector4(wash.r, wash.g, wash.b, washK) },
    uRockWash: { value: snow ? 0.32 : 1 },
    uSnow: { value: snow ? 1 : 0 },
    uRockAbove: { value: p.rockAbove ?? 1e3 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aRoad;varying float vRoad;varying vec3 vW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;vRoad=aRoad;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uSand,uGrass,uRock,uPath;uniform vec4 uWash;uniform float uRockWash,uSnow,uRockAbove;
        varying float vRoad;varying vec3 vW;
        float gRock=0.;
        float gh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float gn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(gh(i),gh(i+vec2(1,0)),f.x),mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x),f.y);}`,
      )
      .replace(
        '#include <color_fragment>',
        `{
          vec3 W=vW;float hgt=W.y;
          vec3 fN=normalize(cross(dFdx(W),dFdy(W)));
          float slope=1.-abs(fN.y);
          float n1=gn(W.xz*.33),n2=gn(W.xz*1.6+5.),n3=gn(W.xz*6.5);
          // Grass: deeper and sunnier patches, a few drier ones, darker dabs where it grows thick.
          vec3 g=mix(uGrass*vec3(.66,.86,.64),uGrass*vec3(1.12,1.08,.88),smoothstep(.25,.75,n1*.65+n2*.35));
          g=mix(g,uGrass*vec3(1.22,1.08,.7),smoothstep(.6,.85,gn(W.xz*.17+3.))*.4);
          g*=.95+.1*n3;
          g=mix(g,g*.84,smoothstep(.66,.8,gn(W.xz*vec2(4.2,7.6)+n1*3.))*.5);
          // Flowers: small round dabs, in drifts.
          vec2 fc=W.xz*6.;vec2 fi=floor(fc);
          float fr=length(fract(fc)-.5-(vec2(gh(fi),gh(fi+3.1))-.5)*.5);
          float fl=step(.9,gh(fi+.7))*smoothstep(.2,.1,fr)*smoothstep(.5,.72,gn(W.xz*.42+9.))*(1.-uSnow);
          float pick=gh(fi+5.);
          g=mix(g,pick<.4?vec3(1.,.97,.88):pick<.75?vec3(1.,.82,.3):vec3(1.,.6,.72),fl);
          // Sand: darker where the sea wets it, faint ripples at the water's edge.
          vec3 s=mix(uSand*vec3(.76,.72,.66),uSand,smoothstep(-.02,.14,hgt+(n2-.5)*.05));
          s*=.96+.07*n3;
          s=mix(s,s*.9,smoothstep(.72,.9,gn(W.xz*vec2(2.,9.)))*.35*smoothstep(.22,.04,hgt));
          // Rock: layers lying one on another, an ochre one now and then, streaks down the face.
          float lay=hgt*1.9+n1*.7+gn(W.xz*.9)*.25;
          float band=fract(lay);
          vec3 r=mix(uRock*vec3(1.06,1.03,.98),uRock*vec3(.86,.84,.86),smoothstep(.35,.5,band)-smoothstep(.85,.97,band));
          r=mix(r,uRock*vec3(1.02,.9,.74),step(.7,gh(vec2(floor(lay),3.)))*.5);
          r*=.9+.14*gn(vec2(atan(W.z,W.x)*26.,hgt*3.));
          // Roads: packed earth with a pebble here and there, darker at the edges.
          vec3 pth=uPath*(.94+.1*n3);
          pth=mix(pth,pth*.8,step(.88,gh(floor(W.xz*5.)))*smoothstep(.3,.14,length(fract(W.xz*5.)-.5))*.7);
          pth=mix(pth*.86,pth,smoothstep(.5,.9,vRoad));
          // What lies where.
          float rockK=max(smoothstep(.34,.5,slope+(n2-.5)*.1),smoothstep(uRockAbove,uRockAbove+.3,hgt));
          float sandK=1.-smoothstep(.33,.46,hgt+(n2-.5)*.1);
          float roadK=smoothstep(.35,.6,vRoad+(n3-.5)*.25)*(1.-sandK);
          vec3 col=mix(g,s,sandK);
          col=mix(col,pth,roadK);
          // Moss creeps onto the gentler rock.
          col=mix(col,mix(r,g*.8,smoothstep(.62,.4,slope)*.5),rockK);
          col=mix(col,uWash.rgb,uWash.a*mix(1.,uRockWash,rockK));
          // Snow glitters a little.
          col+=uSnow*(1.-rockK)*step(.985,gh(floor(W.xz*14.)))*.12;
          diffuseColor.rgb=col;
          gRock=rockK;
        }`,
      )
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal=normalize(mix(normal,normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition))),gRock));');
  };
  m.customProgramCacheKey = () => 'ground';
  return m;
}

export function disposeGround(): void {
  softRamp?.dispose();
  softRamp = null;
}
