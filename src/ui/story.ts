/** The voyage log's line for a trip, with its luck if it had any. */
import type { DestId, SeaId } from '../core/data';
import type { Lang } from '../core/state';
import type { Story } from '../core/voyageLog';
import { t } from '../i18n';

export function storyText(lang: Lang, dest: DestId, story: Story | undefined, name: string, sea: SeaId = 'dusk'): string {
  if (!story) return '';
  // The fog and aurora seas have their own lines; the dusk sea uses the first set.
  const key = sea === 'dusk' ? `story.${dest}.${story.n}` : `story.${sea}.${dest}.${story.n}`;
  const line = t(lang, key, { name });
  return story.bonus ? `${line}${t(lang, `story.bonus.${story.bonus}`)}` : line;
}
