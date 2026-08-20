import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueryContext } from './shared';

const { selectInvocationCandidatesV2 } = vi.hoisted(() => ({
  selectInvocationCandidatesV2: vi.fn(),
}));

vi.mock('./invocationsV2', () => ({ selectInvocationCandidatesV2 }));

import { getInvocationIds } from './getInvocationIds';

function candidateResult(
  rows: { id: string; created_at: string }[],
  options?: { limit?: number; isPartial?: boolean },
) {
  return {
    rows,
    limit: options?.limit ?? 250,
    ...(options?.isPartial && {
      partial: { reason: 'candidate-limit', candidateLimit: 500 } as const,
    }),
  };
}

describe('getInvocationIds', () => {
  const context = {} as QueryContext;

  beforeEach(() => {
    selectInvocationCandidatesV2.mockReset();
  });

  it('selects invocation ids with the v2 exact query', async () => {
    selectInvocationCandidatesV2.mockResolvedValue(
      candidateResult([
        { id: 'inv_1', created_at: '2026-08-20T10:00:01.000Z' },
        { id: 'inv_2', created_at: '2026-08-20T10:00:02.000Z' },
      ]),
    );

    const result = await getInvocationIds.call(context, {
      filters: [
        {
          field: 'status',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'running',
        },
      ],
      pageSize: 100,
      createdAfter: '2026-08-20T10:00:00.000Z',
    });

    expect(selectInvocationCandidatesV2).toHaveBeenCalledWith(context, {
      filters: [
        {
          field: 'status',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'running',
        },
        {
          field: 'created_at',
          type: 'DATE',
          operation: 'AFTER',
          value: '2026-08-20T10:00:00.000Z',
        },
      ],
      sort: { field: 'created_at', order: 'ASC' },
      mode: { type: 'exact' },
      includeInvocationDetails: true,
      limit: 100,
    });
    expect(result).toEqual({
      invocationIds: ['inv_1', 'inv_2'],
      hasMore: false,
      lastCreatedAt: '2026-08-20T10:00:02.000Z',
    });
  });

  it('uses the requested page size as the batch cursor boundary', async () => {
    selectInvocationCandidatesV2.mockResolvedValue(
      candidateResult([
        { id: 'inv_1', created_at: '2026-08-20T10:00:01.000Z' },
        { id: 'inv_2', created_at: '2026-08-20T10:00:02.000Z' },
      ]),
    );

    const result = await getInvocationIds.call(context, {
      filters: [],
      pageSize: 1,
    });

    expect(result).toEqual({
      invocationIds: ['inv_1'],
      hasMore: true,
      lastCreatedAt: '2026-08-20T10:00:01.000Z',
    });
  });

  it('continues when the v2 result reaches its limit', async () => {
    selectInvocationCandidatesV2.mockResolvedValue(
      candidateResult(
        [
          { id: 'inv_1', created_at: '2026-08-20T10:00:01.000Z' },
          { id: 'inv_2', created_at: '2026-08-20T10:00:02.000Z' },
        ],
        { limit: 2 },
      ),
    );

    const result = await getInvocationIds.call(context, {
      filters: [],
    });

    expect(result.hasMore).toBe(true);
  });

  it('rejects a partial result that cannot advance the cursor', async () => {
    selectInvocationCandidatesV2.mockResolvedValue(
      candidateResult([], { isPartial: true }),
    );

    await expect(
      getInvocationIds.call(context, { filters: [] }),
    ).rejects.toThrow('Unable to continue partial batch invocation selection');
  });
});
