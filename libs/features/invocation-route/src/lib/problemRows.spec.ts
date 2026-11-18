import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import {
  addChildProblems,
  filterJournalRows,
  findProblems,
  findJournalProblems,
  getChildIdsToCheck,
  getInvocationRetryKey,
  getPastRetries,
  getProblemStats,
  getRecoveredRows,
  getRetriedCommands,
  getRowProblem,
  insertRetryRows,
} from './problemRows';
import type { CombinedJournalEntry } from './useProcessedJournal';
import { getChildCheckInterval } from './useJournalProblems';

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

  it('keeps errors from before the first step on the invocation', () => {
    const retried = getRetriedCommands({
      [ROOT]: [
        {
          index: 1,
          category: 'event',
          type: 'Event: TransientError',
          message: 'config is missing',
        } as JournalEntryV2,
      ],
    });

    expect(retried.get(getInvocationRetryKey(ROOT))?.count).toBe(1);
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

  it('trusts the journal for a call that already finished', () => {
    expect(
      getRowProblem(
        row(command(1, { type: 'Call', invocationId: 'inv_child' })),
        retried,
        { inv_child: { status: 'backing-off' } as never },
        nothingCompleted,
      ),
    ).toBeUndefined();
  });

  it('does not count a finished command the invocation last awaited', () => {
    expect(
      getRowProblem(
        row(command(5, { isAwaitingOn: true })),
        retried,
        noChildren,
        nothingCompleted,
      ),
    ).toBeUndefined();
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

describe('getChildIdsToCheck', () => {
  it('checks sends and pending calls, once each', () => {
    const rows = [
      row(command(1, { type: 'OneWayCall', invocationId: 'inv_sent' })),
      row(command(2, { type: 'Call', invocationId: 'inv_done' })),
      row(
        command(3, { type: 'Call', invocationId: 'inv_open', isPending: true }),
      ),
      row(command(4, { type: 'AttachInvocation', invocationId: 'inv_sent' })),
      row(command(5)),
    ];
    const { childRowIndexes } = findJournalProblems(
      rows,
      new Map(),
      nothingCompleted,
    );

    expect(getChildIdsToCheck(rows, childRowIndexes)).toEqual([
      'inv_sent',
      'inv_open',
    ]);
  });
});

describe('findProblems', () => {
  it('marks a send whose child failed once its status is known', () => {
    const rows = [
      row(command(1, { type: 'OneWayCall', invocationId: 'inv_x' })),
    ];

    expect(
      findProblems(rows, new Map(), noChildren, nothingCompleted).rowIndexes,
    ).toEqual([]);
    expect(
      findProblems(
        rows,
        new Map(),
        { inv_x: { status: 'failed' } } as never,
        nothingCompleted,
      ).rowIndexes,
    ).toEqual([0]);
  });

  it('reuses the result when no child status changed', () => {
    const rows = [
      row(command(1, { type: 'OneWayCall', invocationId: 'inv_a' })),
      row(command(2, { type: 'OneWayCall', invocationId: 'inv_b' })),
    ];
    const journal = findJournalProblems(rows, new Map(), nothingCompleted);
    const running = { status: 'running' };
    const first = addChildProblems(
      journal,
      rows,
      new Map(),
      { inv_a: running, inv_b: running } as never,
      nothingCompleted,
    );
    const same = addChildProblems(
      journal,
      rows,
      new Map(),
      { inv_a: running, inv_b: { status: 'suspended' } } as never,
      nothingCompleted,
    );
    const failed = addChildProblems(
      journal,
      rows,
      new Map(),
      { inv_a: running, inv_b: { status: 'failed' } } as never,
      nothingCompleted,
    );

    expect(same).toBe(first);
    expect(failed.rowIndexes).toEqual([1]);
  });

  it('notices a child that goes from backing off to failed', () => {
    const rows = [
      row(command(1, { type: 'OneWayCall', invocationId: 'inv_a' })),
    ];
    const journal = findJournalProblems(rows, new Map(), nothingCompleted);
    const backingOff = addChildProblems(
      journal,
      rows,
      new Map(),
      { inv_a: { status: 'backing-off' } } as never,
      nothingCompleted,
    );
    const failed = addChildProblems(
      journal,
      rows,
      new Map(),
      { inv_a: { status: 'failed' } } as never,
      nothingCompleted,
    );

    expect(backingOff.failedChildRows.has(0)).toBe(false);
    expect(failed).not.toBe(backingOff);
    expect(failed.failedChildRows.has(0)).toBe(true);
  });

  it('gives retries that match no row to the invocation that owns them', () => {
    const retried = getRetriedCommands({
      [ROOT]: [
        {
          index: 1,
          category: 'event',
          type: 'Event: TransientError',
          message: 'deployment unreachable',
        } as JournalEntryV2,
      ],
      inv_child: [
        {
          index: 2,
          category: 'event',
          type: 'Event: TransientError',
          message: 'deployment unreachable',
        } as JournalEntryV2,
      ],
    });
    const rows = [
      row(command(1, { type: 'OneWayCall', invocationId: 'inv_child' })),
      row(command(1, { index: 21 }), { invocationId: 'inv_child', depth: 1 }),
    ];
    const journal = findJournalProblems(rows, retried, nothingCompleted);
    const problems = addChildProblems(
      journal,
      rows,
      retried,
      { inv_child: { status: 'succeeded' } } as never,
      nothingCompleted,
    );

    expect(journal.unmatchedRetryInvocations.has(ROOT)).toBe(true);
    expect(problems.kindByRow.get(0)).toBe('retried');
    expect(problems.rowIndexes).toEqual([0]);
  });

  it('flags a waiting call whose child recovered from errors', () => {
    const retried = getRetriedCommands({
      inv_child: [
        {
          index: 1,
          category: 'event',
          type: 'Event: TransientError',
          message: 'connection reset',
        } as JournalEntryV2,
      ],
    });
    const rows = [
      row(
        command(1, {
          type: 'Call',
          invocationId: 'inv_child',
          isPending: true,
        }),
      ),
      row(command(1, { index: 21 }), { invocationId: 'inv_child', depth: 1 }),
    ];
    const problems = findProblems(
      rows,
      retried,
      { inv_child: { status: 'running' } } as never,
      nothingCompleted,
    );

    expect(problems.kindByRow.get(0)).toBe('retried');
    expect(problems.rowIndexes).toEqual([0]);
  });

  it('leaves retries of hidden steps on those steps', () => {
    const entriesByInvocation = {
      [ROOT]: [
        command(0, { type: 'Input' }),
        command(1, { type: 'OneWayCall', invocationId: 'inv_child' }),
        command(2, { name: 'internal' }),
        transientError(3, 2, 'flaky'),
      ],
      inv_child: [
        command(0, { type: 'Input' }),
        command(1, { name: 'internal' }),
        transientError(2, 1, 'flaky'),
      ],
    };
    const retried = getRetriedCommands(entriesByInvocation);
    const rows = [
      row(command(1, { type: 'OneWayCall', invocationId: 'inv_child' })),
    ];
    const journal = findJournalProblems(
      rows,
      retried,
      nothingCompleted,
      entriesByInvocation,
    );

    expect(journal.unmatchedRetryInvocations.size).toBe(0);
    expect(journal.kindByRow.size).toBe(0);
  });

  it('gives retries of the input to the invocation', () => {
    const entriesByInvocation = {
      [ROOT]: [command(0, { type: 'Input' }), transientError(1, 0, 'bad')],
    };
    const journal = findJournalProblems(
      [],
      getRetriedCommands(entriesByInvocation),
      nothingCompleted,
      entriesByInvocation,
    );

    expect(journal.unmatchedRetryInvocations.has(ROOT)).toBe(true);
  });

  it('keeps waiting rows out of the count', () => {
    const rows = [row(command(1, { type: 'Sleep', isPending: true }))];
    const { kindByRow, rowIndexes } = findProblems(
      rows,
      new Map(),
      noChildren,
      nothingCompleted,
    );

    expect(kindByRow.get(0)).toBe('waiting');
    expect(rowIndexes).toEqual([]);
  });

  it('counts problems inside an expanded child', () => {
    const retried = getRetriedCommands({
      inv_child: [transientError(9, 1, 'timed out')],
    });
    const rows = [
      row(command(1, { type: 'Call', invocationId: 'inv_child' })),
      row(command(1, { index: 21 }), { invocationId: 'inv_child', depth: 1 }),
    ];

    expect(
      findProblems(rows, retried, noChildren, nothingCompleted).rowIndexes,
    ).toEqual([1]);
  });
});

describe('getProblemStats', () => {
  it('counts each kind of problem and keeps recovered steps apart', () => {
    const retried = getRetriedCommands({
      [ROOT]: [transientError(10, 2, 'flaky'), transientError(11, 3, 'flaky')],
    });
    const rows = [
      row(command(1, { resultType: 'failure' })),
      row(command(2)),
      row(command(3, { isRetrying: true })),
      row(command(4, { type: 'OneWayCall', invocationId: 'inv_failed' })),
      row(command(5, { type: 'OneWayCall', invocationId: 'inv_paused' })),
      row(command(6, { type: 'Sleep', isPending: true })),
    ];
    const statuses = {
      inv_failed: { status: 'failed' },
      inv_paused: { status: 'paused' },
    } as never;
    const journal = findJournalProblems(rows, retried, nothingCompleted);
    const { kindByRow } = addChildProblems(
      journal,
      rows,
      retried,
      statuses,
      nothingCompleted,
    );
    const recovered = getRecoveredRows(
      kindByRow,
      rows,
      journal.inheritedRetryRows,
    );

    expect([...recovered]).toEqual([1]);
    expect(getProblemStats(kindByRow, rows, statuses, recovered)).toEqual({
      failed: 1,
      failedChildren: 1,
      backingOffChildren: 0,
      pausedChildren: 1,
      retrying: 1,
      recovered: 1,
      waiting: 1,
    });
  });

  it('counts a waiting call as recovered once its child recovered', () => {
    const retried = getRetriedCommands({
      inv_child: [
        {
          index: 1,
          category: 'event',
          type: 'Event: TransientError',
          message: 'connection reset',
        } as JournalEntryV2,
      ],
    });
    const rows = [
      row(
        command(1, {
          type: 'Call',
          invocationId: 'inv_child',
          isPending: true,
        }),
      ),
    ];
    const journal = findJournalProblems(rows, retried, nothingCompleted);

    expect([
      ...getRecoveredRows(journal.kindByRow, rows, journal.inheritedRetryRows),
    ]).toEqual([0]);
  });
});

describe('waiting notifications', () => {
  it('flags only notifications that are still pending', () => {
    const awaited = (isPending: boolean) =>
      row({
        index: 5,
        category: 'notification',
        type: 'Signal',
        isAwaitingOn: true,
        isPending,
      } as never);

    expect(
      getRowProblem(awaited(true), new Map(), noChildren, nothingCompleted),
    ).toBe('waiting');
    expect(
      getRowProblem(awaited(false), new Map(), noChildren, nothingCompleted),
    ).toBeUndefined();
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

  it('keeps the lifecycle rows of an invocation without commands', () => {
    const lifecycleOnly = [
      row({ index: 0, category: 'event', type: 'Event: Created' } as never),
      row({ index: 1, category: 'event', type: 'Event: Pending' } as never),
    ];

    expect(
      filterJournalRows(
        lifecycleOnly,
        { problemsOnly: true, query: '' },
        new Map(),
      ).rows,
    ).toHaveLength(2);
  });

  it('searches the rows of an invocation without commands', () => {
    const lifecycleOnly = [
      row({ index: 0, category: 'event', type: 'Event: Created' } as never),
      row({
        index: 1,
        category: 'event',
        type: 'Event: TransientError',
        message: 'upstream timeout',
      } as never),
    ];

    expect(
      filterJournalRows(
        lifecycleOnly,
        { problemsOnly: false, query: 'created' },
        new Map(),
      ).rows.map(({ entry }) => entry?.index),
    ).toEqual([0]);
  });

  it('shows a successful call whose expanded child has problems', () => {
    const retried = getRetriedCommands({
      inv_child: [transientError(9, 1, 'timed out')],
    });
    const nested = [
      row(command(1, { type: 'Call', invocationId: 'inv_child' })),
      row(command(1, { index: 21 }), { invocationId: 'inv_child', depth: 1 }),
      row(command(2, { index: 22 }), { invocationId: 'inv_child', depth: 1 }),
      row(command(2)),
    ];
    const problems = findProblems(
      nested,
      retried,
      noChildren,
      nothingCompleted,
    );

    expect(
      filterJournalRows(
        nested,
        { problemsOnly: true, query: '' },
        problems.kindByRow,
      ).rows.map(({ entry }) => entry?.index),
    ).toEqual([1, 21]);
  });

  it('finds a step by the errors recorded before it completed', () => {
    const retried = getRetriedCommands({
      [ROOT]: [
        transientError(5, 1, 'connection reset'),
        transientError(6, 1, 'connection reset by peer'),
      ],
    });
    const rows = [row(command(1)), row(command(2))];

    const found = filterJournalRows(
      rows,
      { problemsOnly: false, query: 'connection reset', pastRetries: retried },
      new Map(),
    );

    expect(found.rows).toEqual([rows[0]]);
    expect(found.matches).toBe(2);
    expect(
      filterJournalRows(
        rows,
        { problemsOnly: false, query: 'connection reset' },
        new Map(),
      ).matches,
    ).toBe(0);
  });

  it('finds state keys', () => {
    const withState = [
      row(command(1)),
      row(command(2, { type: 'SetState', key: 'order-status' })),
    ];

    expect(
      filterJournalRows(
        withState,
        { problemsOnly: false, query: 'order-status' },
        new Map(),
      ).rows.map(({ entry }) => entry?.index),
    ).toEqual([2]);
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

  it('adds the errors of a call after its expanded child journal', () => {
    const retried = getRetriedCommands({
      [ROOT]: [transientError(8, 1, 'a')],
    });
    const rows = [
      row(command(1, { type: 'Call', invocationId: 'inv_child' })),
      row(command(1, { index: 21 }), { invocationId: 'inv_child', depth: 1 }),
      row(command(2)),
    ];

    const expanded = insertRetryRows(rows, retried, () => true);

    expect(expanded.map(({ entry }) => entry?.index)).toEqual([1, 21, 8, 2]);
  });
});

describe('getChildCheckInterval', () => {
  it('refreshes small fan-outs every 10 s and big ones every 20 s', () => {
    expect(getChildCheckInterval(5)).toBeCloseTo(10_002.5);
    expect(getChildCheckInterval(10_000)).toBe(15_000);
    expect(getChildCheckInterval(500_000)).toBe(20_000);
  });
});
