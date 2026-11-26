/** The voyage log's line for a trip, with its luck if it had any. */
import type { DestId } from '../core/data';
import type { Lang } from '../core/state';
import type { Story } from '../core/voyageLog';
import { t } from '../i18n';

export function storyText(lang: Lang, dest: DestId, story: Story | undefined, name: string): string {
  if (!story) return '';
  const line = t(lang, `story.${dest}.${story.n}`, { name });
  return story.bonus ? `${line}${t(lang, `story.bonus.${story.bonus}`)}` : line;
}
