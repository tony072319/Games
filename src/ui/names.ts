import type { DestId, SeaId } from '../core/data';
import type { Lang } from '../core/state';
import { t } from '../i18n';

/** Island names and descriptions differ per sea; the first sea uses the original keys. */
const key = (sea: SeaId, d: DestId, what: 'name' | 'desc') => (sea === 'dusk' ? `dest.${d}.${what}` : `dest.${sea}.${d}.${what}`);

export const destName = (lang: Lang, sea: SeaId, d: DestId) => t(lang, key(sea, d, 'name'));
export const destDesc = (lang: Lang, sea: SeaId, d: DestId) => t(lang, key(sea, d, 'desc'));
