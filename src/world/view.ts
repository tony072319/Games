/** The camera's standing views (pure: no renderer), shared by the scene and the layout's horizon. */
import * as THREE from 'three';

// A little in front of the lighthouse, so the sea where finds drift past is in the picture.
export const DEFAULT_TARGET = new THREE.Vector3(0.8, 1.8, 4.2);
// Near enough that the island fills the picture, with a rim of sea round it.
export const DEFAULT_CAM = DEFAULT_TARGET.clone().add(new THREE.Vector3(13, 11, 27).sub(DEFAULT_TARGET).multiplyScalar(0.92));
/** Which way the everyday camera looks across the sea (angle in the ground plane, radians): the far horizon. */
export const FAR_SIDE = Math.atan2(DEFAULT_TARGET.z - DEFAULT_CAM.z, DEFAULT_TARGET.x - DEFAULT_CAM.x);

/** Looking out over the whole lit sea: from the everyday side, pulled back, so the far horizon is in frame. */
export function seaView(light: number): { target: THREE.Vector3; dir: THREE.Vector3; dist: number } {
  void light;
  const dir = DEFAULT_CAM.clone().sub(DEFAULT_TARGET).normalize();
  return { target: new THREE.Vector3(0, 0, 0), dir, dist: 92 };
}
