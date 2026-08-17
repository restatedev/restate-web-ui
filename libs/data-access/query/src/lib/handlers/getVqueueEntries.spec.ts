import { describe, expect, it } from 'vitest';
import {
  createInvocationV2QueryTestHarness,
  NO_VQUEUE_HEADERS,
  rawInvocation,
} from './invocationsV2/tests/testUtils';

describe('GET /query/vqueues/:vqueueId/entries', () => {
  const { get, setResponder, sql } = createInvocationV2QueryTestHarness();

  it('returns no content when VQueues are unavailable', async () => {
    const response = await get(
      '/vqueues/vq_orders/entries?stage=inbox',
      NO_VQUEUE_HEADERS,
    );

    expect(response.status).toBe(204);
    expect(sql).toEqual([]);
  });

  it('rejects a missing or invalid stage', async () => {
    const response = await get('/vqueues/vq_orders/entries?stage=unknown');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: 'A valid VQueue stage is required.',
    });
    expect(sql).toEqual([]);
  });

  it('returns hydrated entries with stage metrics in native queue order', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_vqueues')) {
        return [
          {
            vqueue_id: 'vq_orders',
            id: 'inv_finished',
            kind: 'invocation',
            stage: 'finished',
            status: 'succeeded',
            has_lock: false,
            sequence_number: 7,
            created_at: '2026-08-16T09:00:00.000Z',
            transitioned_at: '2026-08-16T09:04:00.000Z',
            first_runnable_at: '2026-08-16T09:00:01.000Z',
            first_attempt_at: '2026-08-16T09:00:02.000Z',
            latest_attempt_at: '2026-08-16T09:03:00.000Z',
            num_attempts: 3,
            num_errors: 2,
            num_pauses: 1,
            num_suspensions: 1,
            num_yields: 2,
            deployment: 'dp_123',
          },
          {
            vqueue_id: 'vq_orders',
            id: 'mut_finished',
            kind: 'state-mutation',
            stage: 'finished',
            status: 'succeeded',
            has_lock: false,
            sequence_number: 8,
            created_at: '2026-08-16T09:05:00.000Z',
            transitioned_at: '2026-08-16T09:06:00.000Z',
            num_attempts: 1,
            num_errors: 0,
            num_pauses: 0,
            num_suspensions: 0,
            num_yields: 0,
          },
        ];
      }
      if (statement.includes('FROM sys_invocation')) {
        return [
          rawInvocation('inv_finished', {
            status: 'completed',
            completed_at: '2026-08-16T09:04:00.000Z',
            completion_result: 'success',
          }),
        ];
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return [
          {
            id: 'inv_finished',
            kind: 'invocation',
            vqueue_id: 'vq_orders',
            stage: 'finished',
            status: 'succeeded',
            run_at: '2026-08-17T09:04:00.000Z',
          },
          {
            id: 'mut_finished',
            kind: 'state-mutation',
            vqueue_id: 'vq_orders',
            stage: 'finished',
            status: 'succeeded',
            run_at: '2026-08-17T09:06:00.000Z',
          },
        ];
      }
      return [];
    });

    const response = await get('/vqueues/vq_orders/entries?stage=finished');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      stage: 'finished',
      limit: 25,
      truncated: false,
      rows: [
        {
          id: 'inv_finished',
          kind: 'invocation',
          stage: 'finished',
          status: 'succeeded',
          transitionedAt: '2026-08-16T09:04:00.000Z',
          nextAt: '2026-08-17T09:04:00.000Z',
          numAttempts: 3,
          numErrors: 2,
          numPauses: 1,
          numSuspensions: 1,
          numYields: 2,
          deployment: 'dp_123',
          invocation: {
            id: 'inv_finished',
            status: 'succeeded',
          },
        },
        {
          id: 'mut_finished',
          kind: 'state-mutation',
          stage: 'finished',
          transitionedAt: '2026-08-16T09:06:00.000Z',
          nextAt: '2026-08-17T09:06:00.000Z',
          numAttempts: 1,
          numErrors: 0,
        },
      ],
    });
    expect(sql).toHaveLength(3);
    expect(sql[0]).toContain('FROM sys_vqueues');
    expect(sql[1]).toContain('FROM sys_vqueue_entry_status');
    expect(sql[2]).toContain('FROM sys_invocation');
  });

  it('omits entries that move out of the requested stage during hydration', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_vqueues')) {
        return [
          {
            vqueue_id: 'vq_orders',
            id: 'inv_started',
            kind: 'invocation',
            stage: 'inbox',
            status: 'pending',
            created_at: '2026-08-17T09:00:00.000Z',
          },
        ];
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return [
          {
            id: 'inv_started',
            kind: 'invocation',
            vqueue_id: 'vq_orders',
            stage: 'running',
            status: 'running',
          },
        ];
      }
      if (statement.includes('FROM sys_invocation')) {
        return [rawInvocation('inv_started', { status: 'running' })];
      }
      return [];
    });

    const response = await get('/vqueues/vq_orders/entries?stage=inbox');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      stage: 'inbox',
      rows: [],
    });
  });
});
