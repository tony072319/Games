import { describe, expect, test } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_MODEL_IDS, MODELS, modelUrl } from '../../src/world/assets';

const PUBLIC = join(__dirname, '../../public');
const MODELS_DIR = join(PUBLIC, 'models');

function dirSize(dir: string): number {
  return readdirSync(dir).reduce((sum, name) => {
    const p = join(dir, name);
    const s = statSync(p);
    return sum + (s.isDirectory() ? dirSize(p) : s.size);
  }, 0);
}

describe('model library', () => {
  test('every model file is in public/', () => {
    expect(ALL_MODEL_IDS.length).toBeGreaterThan(20);
    for (const id of ALL_MODEL_IDS) expect(existsSync(join(PUBLIC, modelUrl(id))), id).toBe(true);
  });

  test('every pack folder carries its licence', () => {
    const packs = new Set(ALL_MODEL_IDS.map((id) => MODELS[id].url.split('/')[1]));
    for (const p of packs) expect(existsSync(join(MODELS_DIR, p, 'LICENSE.txt')), p).toBe(true);
  });

  test('the whole library stays small enough for the web', () => {
    expect(dirSize(MODELS_DIR)).toBeLessThan(12 * 1024 * 1024);
  });
});
