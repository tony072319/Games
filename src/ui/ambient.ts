import type { Sky } from './sky';

/**
 * Small things that happen on their own every so often, so the sea feels alive:
 * a shooting star, seabirds, a ship on the horizon, a fish jumping, a whale's tail.
 * Drawn into an SVG overlay that shares the scene's 360x640 coordinates.
 */
export type AmbientKind = 'star' | 'birds' | 'ship' | 'fish' | 'whale';

const NS = 'http://www.w3.org/2000/svg';

function add(layer: SVGSVGElement, html: string, cls: string, lifeMs: number): void {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', `amb ${cls}`);
  g.innerHTML = html;
  layer.append(g);
  setTimeout(() => g.remove(), lifeMs);
}

/** Which events suit the current sky. */
export function allowedEvents(sky: Sky): AmbientKind[] {
  const out: AmbientKind[] = ['ship', 'fish'];
  if (sky.stars > 0.65) out.push('star', 'star');
  if (sky.sun > 0.15 || sky.moon > 0.3) out.push('birds');
  out.push('whale');
  return out;
}

/**
 * Play an event. Far things (horizon, sky) go in `far`, which sits behind the
 * lighthouse; things close to the viewer go in `near`.
 */
export function playAmbient(far: SVGSVGElement, near: SVGSVGElement, kind: AmbientKind, rnd: () => number = Math.random): void {
  const layer = kind === 'fish' ? near : far;
  switch (kind) {
    case 'star': {
      const x = 140 + rnd() * 200;
      const y = 30 + rnd() * 120;
      add(layer, `<line x1="${x}" y1="${y}" x2="${x + 26}" y2="${y - 10}" stroke="url(#ambStar)" stroke-width="1.4" stroke-linecap="round"/>`, 'a-star', 1600);
      break;
    }
    case 'birds': {
      const y = 150 + rnd() * 110;
      const bird = (dx: number, dy: number, s: number) =>
        `<path class="wing" d="M${dx - 6 * s} ${dy} Q${dx - 3 * s} ${dy - 3 * s} ${dx} ${dy} Q${dx + 3 * s} ${dy - 3 * s} ${dx + 6 * s} ${dy}" fill="none" stroke="#1d1830" stroke-width="1.3" stroke-linecap="round"/>`;
      add(layer, `<g style="--y:${y.toFixed(0)}px">${bird(0, 0, 1)}${bird(14, 6, 0.8)}${bird(-12, 8, 0.7)}</g>`, 'a-birds', 26000);
      break;
    }
    case 'ship': {
      const ship = `<path d="M-14 0 L14 0 L10 4 L-10 4 Z" fill="#1a1630"/><path d="M0 -1 L0 -20 L11 -3 Z" fill="#2a2446"/><path d="M-1 -2 L-1 -15 L-9 -3 Z" fill="#2a2446"/><circle class="lamp" cx="0" cy="-21" r="1.4" fill="var(--lamp)"/>`;
      add(layer, `<g transform="translate(0 329)"><g class="ship-move">${ship}</g></g>`, 'a-ship', 90000);
      break;
    }
    case 'fish': {
      const x = 40 + rnd() * 280;
      const y = 500 + rnd() * 80;
      add(
        layer,
        `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><g class="fish-jump"><path d="M-6 0 Q0 -4 6 0 Q0 4 -6 0 Z M6 0 L10 -3 L10 3 Z" fill="#9fb2d8"/></g><ellipse class="splash" cx="0" cy="2" rx="10" ry="2" fill="none" stroke="#e8e0ff" stroke-width="1"/></g>`,
        'a-fish',
        1800,
      );
      break;
    }
    case 'whale': {
      const x = 30 + rnd() * 120;
      add(
        layer,
        `<g transform="translate(${x.toFixed(0)} 352)"><g class="whale-tail"><path d="M0 0 Q-2 -10 -10 -16 Q-4 -15 0 -12 Q4 -15 10 -16 Q2 -10 0 0 Z" fill="#141228"/></g><ellipse class="splash" cx="0" cy="1" rx="12" ry="1.6" fill="none" stroke="#e8e0ff" stroke-opacity="0.6" stroke-width="0.8"/></g>`,
        'a-whale',
        5200,
      );
      break;
    }
  }
}

export function ambientLayer(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 360 640');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('class', 'ambient');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs><linearGradient id="ambStar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
  return svg;
}
