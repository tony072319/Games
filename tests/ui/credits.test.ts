import { describe, expect, test } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CREDITS } from '../../src/ui/credits';

const MODELS_DIR = join(__dirname, '../../public/models');

describe('credits', () => {
  test('every model pack in the game is credited', () => {
    const packs = readdirSync(MODELS_DIR).filter((d) => statSync(join(MODELS_DIR, d)).isDirectory());
    for (const p of packs) expect(CREDITS.some((c) => c.folder === p), p).toBe(true);
  });
  test('each credit names the pack, its author and its licence', () => {
    for (const c of CREDITS) {
      expect(c.pack.length).toBeGreaterThan(2);
      expect(c.author.length).toBeGreaterThan(1);
      expect(['CC0', 'free']).toContain(c.licence);
    }
  });
});
