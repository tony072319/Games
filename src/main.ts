import './ui/style.css';
import type { KV } from './core/save';
import { startApp } from './ui/app';

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

const root = document.getElementById('app');
if (root) {
  startApp(root, {
    now: Date.now,
    kv: storage(),
    navLangs: navigator.languages?.length ? navigator.languages : [navigator.language],
    debug: new URLSearchParams(location.search).has('debug'),
  });
}
