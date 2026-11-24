/** Tiny helper to create an element with a class and optional HTML. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

/** Close a dialog with its exit motion (shared by every dialog), then remove it. */
export function dismiss(overlay: HTMLElement, after?: () => void): void {
  if (overlay.classList.contains('closing')) return;
  overlay.classList.add('closing');
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Wait as long as the exit motion lasts (the theme's --t-small).
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-small')) || 200;
  setTimeout(() => {
    overlay.remove();
    after?.();
  }, reduce ? 0 : ms);
}

/**
 * A small menu anchored under a button. Closes on choice, outside tap or Escape.
 * Returns a function that closes it.
 */
export function openMenu(host: HTMLElement, anchor: HTMLElement, items: { label: string; value?: string; on?: boolean; pick(): void }[]): () => void {
  const menu = el('div', 'menu');
  menu.setAttribute('role', 'menu');
  const h = host.getBoundingClientRect();
  const a = anchor.getBoundingClientRect();
  menu.style.top = `${a.bottom - h.top + 8}px`; // --sp-2 below the button
  if (a.left - h.left > h.width / 2) menu.style.right = `${h.right - a.right}px`;
  else menu.style.left = `${a.left - h.left}px`;
  const close = () => {
    menu.remove();
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', key, true);
  };
  const outside = (e: Event) => {
    if (!menu.contains(e.target as Node) && e.target !== anchor && !anchor.contains(e.target as Node)) close();
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      anchor.focus();
    }
  };
  for (const it of items) {
    const b = el('button', it.on ? 'on' : '');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    const l = el('span');
    l.textContent = it.label;
    b.append(l);
    if (it.value) {
      const v = el('span', 'val');
      v.textContent = it.value;
      b.append(v);
    }
    b.addEventListener('click', () => {
      close();
      it.pick();
    });
    menu.append(b);
  }
  host.append(menu);
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', key, true);
  (menu.querySelector('button') as HTMLElement | null)?.focus();
  return close;
}
