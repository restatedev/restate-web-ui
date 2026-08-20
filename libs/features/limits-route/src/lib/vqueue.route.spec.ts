import { describe, expect, it } from 'vitest';
import {
  displayedVqueueStageCount,
  vqueueBatchFilters,
  vqueueStageFromSearch,
} from './vqueue.route';

describe('displayedVqueueStageCount', () => {
  it('uses an untruncated table count in either direction', () => {
    expect(displayedVqueueStageCount(0, 1, false)).toBe(1);
    expect(displayedVqueueStageCount(1, 0, false)).toBe(0);
  });

  it('treats a truncated table count as a lower bound', () => {
    expect(displayedVqueueStageCount(100, 25, true)).toBe(100);
    expect(displayedVqueueStageCount(0, 25, true)).toBe(25);
  });

  it('preserves the snapshot state before table rows load', () => {
    expect(displayedVqueueStageCount(7, undefined, undefined)).toBe(7);
    expect(
      displayedVqueueStageCount(undefined, undefined, undefined),
    ).toBeUndefined();
  });
});

describe('vqueueStageFromSearch', () => {
  it('reads each supported stage', () => {
    for (const stage of [
      'inbox',
      'running',
      'suspended',
      'paused',
      'finished',
    ]) {
      expect(vqueueStageFromSearch(new URLSearchParams({ stage }))).toBe(stage);
    }
  });

  it('defaults missing and invalid values to Inbox', () => {
    expect(vqueueStageFromSearch(new URLSearchParams())).toBe('inbox');
    expect(
      vqueueStageFromSearch(new URLSearchParams({ stage: 'unknown' })),
    ).toBe('inbox');
  });
});

describe('vqueueBatchFilters', () => {
  it('targets the selected stage of one VQueue', () => {
    expect(vqueueBatchFilters('vq_orders', 'suspended')).toEqual([
      {
        field: 'vqueue_id',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'vq_orders',
      },
      {
        field: 'stage',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'suspended',
      },
    ]);
  });

  it('restricts Inbox pause to backing-off invocations', () => {
    expect(vqueueBatchFilters('vq_orders', 'inbox', 'pause')).toEqual([
      {
        field: 'vqueue_id',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'vq_orders',
      },
      {
        field: 'stage',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'inbox',
      },
      {
        field: 'status',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'backing-off',
      },
    ]);
  });
});
