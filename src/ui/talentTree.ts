import type { GameState, Lang } from '../core/state';
import { TALENTS, has, learn, lockReason, resetTalents, talentPoints, type TalentId } from '../core/talents';
import { formatNumber, t } from '../i18n';
import { dismiss, el } from './dom';

export interface TalentTreeActions {
  learned(id: TalentId, node: Element): void;
  changed(): void;
  close(): void;
}

/** The starlight tree: three branches of four, points to spend, free reset. */
export function createTalentTree(lang: Lang, state: GameState, act: TalentTreeActions): HTMLElement {
  const overlay = el('div', 'overlay sheet-overlay');
  const box = el('div', 'seamap tree');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const head = el('div', 'map-head');
  const title = el('h2');
  title.textContent = t(lang, 'tree.title');
  const close = el('button', 'btn-ghost map-close');
  close.type = 'button';
  close.textContent = t(lang, 'map.close');
  close.addEventListener('click', act.close);
  head.append(title, close);
  const points = el('p', 'tree-points');
  const passive = el('p', 'tree-passive');
  passive.textContent = t(lang, 'tree.passive');
  const cols = el('div', 'tree-cols');
  const foot = el('div', 'tree-foot');
  box.append(head, points, passive, cols, foot);
  overlay.append(box);

  function render() {
    points.textContent = t(lang, 'tree.points', { n: formatNumber(talentPoints(state), lang), total: formatNumber(state.starlight, lang) });
    cols.replaceChildren();
    for (const b of ['fire', 'sail', 'star'] as const) {
      const col = el('div', 'tree-col');
      const h = el('h3');
      h.textContent = t(lang, `branch.${b}`);
      col.append(h);
      for (const x of TALENTS.filter((y) => y.branch === b)) {
        const reason = lockReason(state, x.id);
        const node = el('div', `tree-node${has(state, x.id) ? ' learned' : reason === null ? ' ready' : ''}`);
        node.dataset.talent = x.id;
        const n = el('h3');
        n.textContent = t(lang, `talent.${x.id}.name`);
        const d = el('span', 'tree-desc');
        d.textContent = t(lang, `talent.${x.id}.desc`);
        node.append(n, d);
        if (has(state, x.id)) {
          const lit = el('span', 'tree-state');
          lit.textContent = t(lang, 'tree.learned');
          node.append(lit);
        } else {
          const btn = el('button', 'buy');
          btn.type = 'button';
          btn.textContent = `${t(lang, 'tree.learn')} · ${t(lang, 'tree.cost', { n: x.cost })}`;
          btn.disabled = reason !== null;
          btn.addEventListener('click', () => {
            if (!learn(state, x.id)) return;
            act.changed();
            render();
            act.learned(x.id, cols.querySelector(`[data-talent="${x.id}"]`) ?? node);
          });
          node.append(btn);
          if (reason && reason !== 'learned') {
            const why = el('span', 'tree-state');
            why.textContent = t(lang, `tree.lock.${reason}`);
            node.append(why);
          }
        }
        col.append(node);
      }
      cols.append(col);
    }
    foot.replaceChildren();
    if (state.talents.length > 0) {
      const reset = el('button', 'btn-ghost');
      reset.type = 'button';
      reset.textContent = t(lang, 'tree.reset');
      reset.addEventListener('click', () =>
        confirmReset(() => {
          resetTalents(state);
          act.changed();
          render();
        }),
      );
      foot.append(reset);
    }
  }

  /** The game's own confirmation, on the shared dialog frame. */
  function confirmReset(ok: () => void) {
    const o = el('div', 'overlay');
    const p = el('div', 'popup');
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-modal', 'true');
    const h = el('h2');
    h.textContent = t(lang, 'tree.resetTitle');
    const text = el('p');
    text.textContent = t(lang, 'tree.resetConfirm');
    const actions = el('div', 'actions');
    const no = el('button', 'btn-ghost');
    no.type = 'button';
    no.textContent = t(lang, 'pass.wait');
    no.addEventListener('click', () => dismiss(o));
    const yes = el('button', 'btn-primary');
    yes.type = 'button';
    yes.textContent = t(lang, 'tree.reset');
    yes.addEventListener('click', () => {
      dismiss(o);
      ok();
    });
    actions.append(no, yes);
    p.append(h, text, actions);
    o.append(p);
    overlay.parentElement?.append(o);
    yes.focus();
  }

  render();
  return overlay;
}
