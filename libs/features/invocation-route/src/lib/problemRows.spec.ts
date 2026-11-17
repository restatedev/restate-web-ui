import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import {
  filterJournalRows,
  findProblems,
  getPastRetries,
  getProblemChildIds,
  getRetriedCommands,
  getRowProblem,
  insertRetryRows,
} from './problemRows';
import type { CombinedJournalEntry } from './useProcessedJournal';

const ROOT = 'inv_root';

function command(
  index: number,
  fields: Partial<JournalEntryV2> & Record<string, unknown> = {},
): JournalEntryV2 {
  return {
    index,
    commandIndex: index,
    category: 'command',
    type: 'Run',
    name: `step-${index}`,
    ...fields,
  } as JournalEntryV2;
}

function transientError(
  index: number,
  relatedCommandIndex: number,
  message: string,
): JournalEntryV2 {
  return {
    index,
    category: 'event',
    type: 'Event: TransientError',
    relatedCommandIndex,
    message,
  } as JournalEntryV2;
}

function row(
  entry: JournalEntryV2,
  fields: Partial<CombinedJournalEntry> = {},
): CombinedJournalEntry {
  return { invocationId: ROOT, entry, depth: 0, ...fields };
}

const noChildren = {};
const nothingCompleted = new Set<string>();

describe('getRetriedCommands', () => {
  it('groups transient errors by command and keeps the last message', () => {
    const retried = getRetriedCommands({
      [ROOT]: [
        command(1),
        transientError(2, 1, 'timed out'),
        transientError(3, 1, 'connection reset'),
        transientError(4, 7, 'other'),
      ],
    });

    expect(retried.get(`${ROOT}:1`)).toMatchObject({
      count: 2,
      lastMessage: 'connection reset',
    });
    expect(retried.get(`${ROOT}:1`)?.events).toHaveLength(2);
    expect(retried.get(`${ROOT}:7`)?.count).toBe(1);
  });
});

describe('getPastRetries', () => {
  const retried = getRetriedCommands({
    [ROOT]: [transientError(2, 1, 'timed out')],
  });

  it('returns the retries of a command that finished', () => {
    expect(getPastRetries(row(command(1)), retried)?.count).toBe(1);
  });

  it('skips commands that are still retrying or pending', () => {
    expect(
      getPastRetries(row(command(1, { isRetrying: true })), retried),
    ).toBeUndefined();
    expect(
      getPastRetries(row(command(1, { isPending: true })), retried),
    ).toBeUndefined();
  });
});

describe('getRowProblem', () => {
  const retried = getRetriedCommands({
    [ROOT]: [transientError(9, 2, 'timed out')],
  });

  it('tells failed, retried and waiting commands apart', () => {
    expect(
      getRowProblem(
        row(command(1, { resultType: 'failure' })),
        retried,
        noChildren,
        nothingCompleted,
      ),
    ).toBe('failed');
    expect(
      getRowProblem(row(command(2)), retried, noChildren, nothingCompleted),
    ).toBe('retried');
    expect(
      getRowProblem(
        row(command(3, { isPending: true })),
        retried,
        noChildren,
        nothingCompleted,
      ),
    ).toBe('waiting');
    expect(
      getRowProblem(row(command(4)), retried, noChildren, nothingCompleted),
    ).toBeUndefined();
  });

  it('flags calls whose child is in trouble', () => {
    expect(
      getRowProblem(
        row(command(1, { type: 'OneWayCall', invocationId: 'inv_child' })),
        retried,
        { inv_child: { status: 'backing-off' } as never },
        nothingCompleted,
      ),
    ).toBe('children');
  });

  it('does not count leftover pending entries of a finished invocation', () => {
    expect(
      getRowProblem(
        row(command(3, { isPending: true })),
        retried,
        noChildren,
        new Set([ROOT]),
      ),
    ).toBeUndefined();
  });
});

describe('getProblemChildIds', () => {
  it('includes failed calls whose child failed', () => {
    const rows = [
      row(
        command(1, {
          type: 'Call',
          invocationId: 'inv_failed',
          resultType: 'failure',
        }),
      ),
      row(command(2, { type: 'Call', invocationId: 'inv_ok' })),
    ];
    const statuses = {
      inv_failed: { status: 'failed' },
      inv_ok: { status: 'succeeded' },
    } as never;
    const { rowIndexes } = findProblems(
      rows,
      new Map(),
      statuses,
      nothingCompleted,
    );

    expect(getProblemChildIds(rows, rowIndexes, statuses)).toEqual([
      'inv_failed',
    ]);
  });
});

describe('filterJournalRows', () => {
  const failed = command(2, { resultType: 'failure' });
  const rows = [
    row({ index: 0, category: 'event', type: 'Event: Created' } as never),
    row(command(1)),
    row(failed),
    row(
      { index: 3, category: 'notification', type: 'CompletionNotification' },
      { parentCommand: failed },
    ),
    row(command(4, { type: 'SetState', name: 'phase' })),
  ];
  const { kindByRow } = findProblems(
    rows,
    new Map(),
    noChildren,
    nothingCompleted,
  );

  it('keeps leading lifecycle rows, problems and their detail rows', () => {
    const { rows: shown, matches } = filterJournalRows(
      rows,
      { problemsOnly: true, query: '' },
      kindByRow,
    );

    expect(shown.map(({ entry }) => entry?.index)).toEqual([0, 2, 3]);
    expect(matches).toBe(1);
  });

  it('finds entries by type label', () => {
    const { rows: shown, matches } = filterJournalRows(
      rows,
      { problemsOnly: false, query: 'set state' },
      kindByRow,
    );

    expect(shown.map(({ entry }) => entry?.index)).toEqual([0, 4]);
    expect(matches).toBe(1);
  });
});

describe('insertRetryRows', () => {
  it('adds the errors under expanded commands only', () => {
    const retried = getRetriedCommands({
      [ROOT]: [transientError(8, 1, 'a'), transientError(9, 2, 'b')],
    });
    const rows = [row(command(1)), row(command(2))];

    const expanded = insertRetryRows(
      rows,
      retried,
      (key) => key === `${ROOT}:2`,
    );

    expect(expanded.map(({ entry }) => entry?.index)).toEqual([1, 2, 9]);
  });
});
