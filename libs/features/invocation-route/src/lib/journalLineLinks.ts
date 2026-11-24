import type { CombinedJournalEntry } from './useProcessedJournal';

export const LAST_FAILURE_HASH = '#last-failure';

export function parseLineHash(hash: string) {
  const match = /^#command-(\d+(?::\d+)*)$/.exec(hash);
  return match?.[1]?.split(':').map(Number);
}

export function getLineHash(path: readonly number[]) {
  return `#command-${path.join(':')}`;
}

export function getRowLinePath({
  entry,
  commandPath = [],
}: CombinedJournalEntry) {
  return entry?.category === 'command' && typeof entry.commandIndex === 'number'
    ? [...commandPath, entry.commandIndex]
    : undefined;
}

export function findLineRow(
  rows: CombinedJournalEntry[],
  path: readonly number[],
) {
  let found = { index: -1, depth: 0 };
  rows.forEach(({ entry, commandPath = [] }, index) => {
    const depth = commandPath.length;
    if (
      entry?.category === 'command' &&
      depth >= found.depth &&
      entry.commandIndex === path[depth] &&
      commandPath.every((commandIndex, level) => commandIndex === path[level])
    ) {
      found = { index, depth: depth + 1 };
    }
  });
  return found;
}
