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
  let rootRows = 0;
  return rows.map(({ depth }) => {
    if (depth === 0) {
      rootRows += 1;
    }
    return Math.floor(Math.max(rootRows - 1, 0) / ROWS_PER_CHUNK);
  });
}
