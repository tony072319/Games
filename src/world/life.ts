/** Ambient life in the world (Task 5 fills this in). */
import type * as THREE from 'three';
import type { ModelId } from './assets';

export interface LifeContext {
  night: number;
  light: number;
  calm: boolean;
  cam: THREE.Camera;
}
export interface Life {
  update(dt: number, t: number, ctx: LifeContext): void;
  dispose(): void;
}
export type TemplateFn = (id: ModelId) => Promise<unknown>;
export type InstanceFn = (t: never, item: { model: ModelId; size?: number; tint?: number }) => THREE.Object3D;

export function createLife(_scene: THREE.Scene, _template: TemplateFn, _instance: InstanceFn): Life {
  return { update() {}, dispose() {} };
}
