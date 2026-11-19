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
  let bucket = 0;
  let command = 0;
  let nestedRows = 0;
  let suffix = '';
  return rows.map(({ depth, entry }) => {
    if (depth > 0) {
      nestedRows += 1;
      if (nestedRows < ROWS_PER_CHUNK) {
        return `${bucket}${suffix}`;
      }
      suffix = `+${command}`;
      return `${bucket}/${command}/${Math.floor(nestedRows / ROWS_PER_CHUNK)}`;
    }
    nestedRows = 0;
    if (
      entry?.category === 'command' &&
      typeof entry.commandIndex === 'number'
    ) {
      command = entry.commandIndex;
      const next = Math.floor(command / ROWS_PER_CHUNK);
      if (next > bucket) {
        bucket = next;
        suffix = '';
      }
    }
    return `${bucket}${suffix}`;
  });
}
