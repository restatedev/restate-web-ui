import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import { describe, expect, it } from 'vitest';
import {
  hasBlockedVqueueHeadInRows,
  isVqueueEntryNextTransitionBlocked,
  vqueueEntryTimeColumns,
  vqueueEntryTransitionColumn,
} from './VQueueEntriesTable';

function snapshot(overrides: Partial<VqueueSnapshot> = {}): VqueueSnapshot {
  return {
    identity: {
      service: 'ExampleService',
      isPaused: false,
      vqueueId: 'vq-example',
    },
    status: {
      blocked: true,
      scheduling: 'blocked',
    },
    counts: {
      inbox: 3,
      running: 0,
      suspended: 0,
      paused: 0,
      finished: 0,
    },
    stageAvg: {},
    events: {},
    head: {
      entryId: 'inv-head',
      totalBlocks: [],
      nowBlocks: [],
      avgBlocks: [],
    },
    ...overrides,
  };
}

describe('isVqueueEntryNextTransitionBlocked', () => {
  it('matches the blocked head by entry ID rather than row position', () => {
    const data = snapshot();

    expect(
      isVqueueEntryNextTransitionBlocked(
        { id: 'inv-before', stage: 'inbox' },
        data,
      ),
    ).toBe(false);
    expect(
      isVqueueEntryNextTransitionBlocked(
        { id: 'inv-head', stage: 'inbox' },
        data,
      ),
    ).toBe(true);
    expect(
      isVqueueEntryNextTransitionBlocked(
        { id: 'inv-after', stage: 'inbox' },
        data,
      ),
    ).toBe(false);
  });

  it('does not report a blocked transition after the head has started running', () => {
    expect(
      isVqueueEntryNextTransitionBlocked(
        { id: 'inv-head', stage: 'running' },
        snapshot(),
      ),
    ).toBe(false);
  });

  it('does not report a blocked transition when the queue is paused', () => {
    const data = snapshot({
      identity: {
        service: 'ExampleService',
        isPaused: true,
        vqueueId: 'vq-example',
      },
    });

    expect(
      isVqueueEntryNextTransitionBlocked(
        { id: 'inv-head', stage: 'inbox' },
        data,
      ),
    ).toBe(false);
  });
});

describe('hasBlockedVqueueHeadInRows', () => {
  it('requires the blocked scheduler head to exist in the displayed rows', () => {
    const data = snapshot();

    expect(
      hasBlockedVqueueHeadInRows([{ id: 'inv-before', stage: 'inbox' }], data),
    ).toBe(false);
    expect(
      hasBlockedVqueueHeadInRows(
        [
          { id: 'inv-before', stage: 'inbox' },
          { id: 'inv-head', stage: 'inbox' },
        ],
        data,
      ),
    ).toBe(true);
  });

  it('does not match the scheduler head when its hydrated stage is no longer Inbox', () => {
    expect(
      hasBlockedVqueueHeadInRows(
        [{ id: 'inv-head', stage: 'running' }],
        snapshot(),
      ),
    ).toBe(false);
  });
});

describe('vqueueEntryTransitionColumn', () => {
  it('uses the scheduled transition only for Inbox', () => {
    expect(vqueueEntryTransitionColumn('inbox')).toEqual({
      name: 'Next transition',
      field: 'nextAt',
    });
    expect(vqueueEntryTransitionColumn('running')).toEqual({
      name: 'Running since',
      field: 'transitionedAt',
    });
    expect(vqueueEntryTransitionColumn('suspended')).toEqual({
      name: 'Suspended since',
      field: 'transitionedAt',
    });
    expect(vqueueEntryTransitionColumn('paused')).toEqual({
      name: 'Paused since',
      field: 'transitionedAt',
    });
    expect(vqueueEntryTransitionColumn('finished')).toEqual({
      name: 'Purges at',
      field: 'nextAt',
    });
  });

  it('keeps both the finish and purge timestamps for Finished entries', () => {
    expect(vqueueEntryTimeColumns('finished')).toEqual([
      { name: 'Finished at', field: 'transitionedAt' },
      { name: 'Purges at', field: 'nextAt' },
    ]);
  });
});
