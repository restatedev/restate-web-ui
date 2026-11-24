import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import {
  findLineRow,
  getLineHash,
  getRowLinePath,
  LAST_FAILURE_HASH,
  parseLineHash,
} from './journalLineLinks';
import type { CombinedJournalEntry } from './useProcessedJournal';

function row(
  invocationId: string,
  commandIndex: number,
  commandPath: number[] = [],
): CombinedJournalEntry {
  return {
    invocationId,
    depth: commandPath.length,
    commandPath,
    entry: { commandIndex, category: 'command', type: 'Run' } as JournalEntryV2,
  };
}

describe('line hashes', () => {
  it('reads and writes top-level and nested lines', () => {
    expect(parseLineHash('#command-5')).toEqual([5]);
    expect(parseLineHash(getLineHash([5, 4, 12]))).toEqual([5, 4, 12]);
  });

  it('ignores other hashes', () => {
    for (const hash of [
      '',
      '#details',
      '#command-',
      '#command-5:',
      '#command-5:x',
      LAST_FAILURE_HASH,
    ]) {
      expect(parseLineHash(hash)).toBeUndefined();
    }
  });
});

describe('getRowLinePath', () => {
  it('appends the command index to the parent calls', () => {
    expect(getRowLinePath(row('inv_a', 4, [2]))).toEqual([2, 4]);
  });

  it('gives rows without a line number no path', () => {
    expect(
      getRowLinePath({
        invocationId: 'inv_root',
        depth: 0,
        entry: { category: 'event', type: 'Running' } as JournalEntryV2,
      }),
    ).toBeUndefined();
  });
});

describe('findLineRow', () => {
  const rows = [
    row('inv_root', 1),
    row('inv_root', 2),
    row('inv_a', 1, [2]),
    row('inv_a', 3, [2]),
    row('inv_root', 3),
  ];

  it('finds the row of a nested line', () => {
    expect(findLineRow(rows, [2, 3])).toEqual({ index: 3, depth: 2 });
  });

  it('stops at the deepest shown line on the path', () => {
    expect(findLineRow(rows, [2, 3, 1])).toEqual({ index: 3, depth: 2 });
    expect(findLineRow(rows, [3, 1])).toEqual({ index: 4, depth: 1 });
    expect(findLineRow(rows, [9])).toEqual({ index: -1, depth: 0 });
  });
});
