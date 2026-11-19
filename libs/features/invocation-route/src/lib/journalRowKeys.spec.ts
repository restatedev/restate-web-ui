import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { describe, expect, it } from 'vitest';
import { getRowChunks, getRowKeys } from './journalRowKeys';
import type { CombinedJournalEntry } from './useProcessedJournal';

function row(
  invocationId: string,
  entry: Partial<JournalEntryV2>,
  depth = 0,
): CombinedJournalEntry {
  return { invocationId, entry: entry as JournalEntryV2, depth };
}

describe('getRowKeys', () => {
  const call = row('inv_parent', {
    category: 'command',
    type: 'Call',
    index: 1,
  });
  const sleep = row('inv_parent', {
    category: 'command',
    type: 'Sleep',
    index: 2,
  });
  const childRun = row(
    'inv_child',
    { category: 'command', type: 'Run', index: 1 },
    1,
  );

  it('keeps the keys of the rows around an expanded invocation', () => {
    const [callKey, sleepKey] = getRowKeys([call, sleep]);
    const expanded = getRowKeys([call, childRun, sleep]);

    expect(expanded[0]).toBe(callKey);
    expect(expanded[2]).toBe(sleepKey);
    expect(new Set(expanded).size).toBe(3);
  });

  it('gives rows that share an entry index their own keys', () => {
    const retry = row('inv_parent', {
      category: 'event',
      type: 'Event: TransientError',
    });
    const keys = getRowKeys([call, retry, retry, sleep, retry]);

    expect(new Set(keys).size).toBe(5);
    expect(getRowKeys([call, retry, retry])).toEqual(keys.slice(0, 3));
  });
});

describe('getRowChunks', () => {
  it('keeps every row in its chunk when an invocation expands', () => {
    const rows = Array.from({ length: 120 }, (_, commandIndex) =>
      row('inv_parent', { category: 'command', type: 'Run', commandIndex }),
    );
    const nested = Array.from({ length: 70 }, (_, index) =>
      row('inv_child', { category: 'command', type: 'Run', index }, 1),
    );
    const chunks = getRowChunks(rows);
    const expanded = getRowChunks([
      ...rows.slice(0, 11),
      ...nested,
      ...rows.slice(11),
    ]);

    expect(new Set(chunks)).toEqual(new Set([0, 1, 2]));
    expect([...expanded.slice(0, 11), ...expanded.slice(81)]).toEqual(chunks);
    expect(new Set(expanded.slice(11, 81))).toEqual(new Set([0]));
  });
});
