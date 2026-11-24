import './ui/theme.css';
import './ui/style.css';
import './ui/ui.css';
import { prefixedKV, type KV } from './core/save';
import { startApp } from './ui/app';
import { createTestClock } from './core/testClock';

/** localStorage can throw (private mode, disabled storage); fall back to memory so the game still runs. */
function storage(): KV {
  try {
    const k = '__lk_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
  }
}

// ?debug=1 (or ?test=1) is the test build: unlimited materials and its own save.
const params = new URLSearchParams(location.search);
const debug = params.has('debug') || params.has('test');

const root = document.getElementById('app');
if (root) {
  const kv = debug ? prefixedKV(storage(), 'test:') : storage();
  // The test build's clock can run faster than real time.
  const clock = debug ? createTestClock(Date.now, kv) : undefined;
  startApp(root, {
    now: clock ? clock.now : Date.now,
    clock,
    kv,
    navLangs: navigator.languages?.length ? navigator.languages : [navigator.language],
    debug,
  });
}
