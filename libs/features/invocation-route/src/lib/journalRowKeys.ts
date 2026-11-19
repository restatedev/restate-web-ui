import type { CombinedJournalEntry } from './useProcessedJournal';

const ROWS_PER_CHUNK = 50;

export function getRowKeys(rows: CombinedJournalEntry[]) {
  const seen = new Map<string, number>();
  return rows.map(({ invocationId, entry }) => {
    const id =
      entry?.category === 'group' && 'id' in entry ? entry.id : entry?.index;
    const key = `${invocationId}-${entry?.category}-${entry?.type}-${id}`;
    const repeats = seen.get(key) ?? 0;
    seen.set(key, repeats + 1);
    return repeats === 0 ? key : `${key}#${repeats}`;
  });
}

export function getRowChunks(rows: CombinedJournalEntry[]) {
  let chunk = 0;
  return rows.map(({ depth, entry }) => {
    if (
      depth === 0 &&
      entry?.category === 'command' &&
      typeof entry.commandIndex === 'number'
    ) {
      chunk = Math.max(chunk, Math.floor(entry.commandIndex / ROWS_PER_CHUNK));
    }
    return chunk;
  });
}
