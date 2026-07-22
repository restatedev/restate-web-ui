import type { RawInvocation } from '@restate/data-access/admin-api-spec';
import { describe, expect, it } from 'vitest';
import {
  convertInvocation,
  getInvocationStatusFromVqueue,
  type VqueueStatus,
} from './convertInvocation';

function rawInvocation(overrides: Partial<RawInvocation> = {}): RawInvocation {
  return {
    id: 'inv-a',
    invoked_by: 'ingress',
    status: 'ready',
    target: 'Greeter/inv-a/run',
    target_handler_name: 'run',
    target_service_name: 'Greeter',
    target_service_ty: 'workflow',
    created_at: '2026-01-01T00:00:00.000Z',
    modified_at: '2026-01-01T00:00:00.000Z',
    scheduled_at: '2026-01-01T00:00:00.000Z',
    pinned_service_protocol_version: 7,
    ...overrides,
  };
}

describe('getInvocationStatusFromVqueue', () => {
  it.each<[VqueueStatus, string]>([
    [{ stage: 'inbox', status: 'new' }, 'pending'],
    [{ stage: 'inbox', status: 'scheduled' }, 'scheduled'],
    [{ stage: 'inbox', status: 'backing-off' }, 'backing-off'],
    [{ stage: 'inbox', status: 'started' }, 'ready'],
    [{ stage: 'inbox', status: 'yielded' }, 'yielded'],
    [{ stage: 'running', status: 'started' }, 'running'],
    [{ stage: 'suspended', status: 'started' }, 'suspended'],
    [{ stage: 'paused', status: 'started' }, 'paused'],
    [{ stage: 'finished', status: 'succeeded' }, 'succeeded'],
    [{ stage: 'finished', status: 'failed' }, 'failed'],
    [{ stage: 'finished', status: 'cancelled' }, 'cancelled'],
    [{ stage: 'finished', status: 'killed' }, 'killed'],
  ])('maps %o to %s', (vqueue, status) => {
    expect(getInvocationStatusFromVqueue(vqueue)).toBe(status);
  });

  it('does not invent an invocation status for an unknown VQueue state', () => {
    expect(
      getInvocationStatusFromVqueue({ stage: 'inbox', status: 'unknown' }),
    ).toBeUndefined();
    expect(
      getInvocationStatusFromVqueue({
        stage: 'finished',
        status: 'unknown',
      }),
    ).toBeUndefined();
  });
});

describe('convertInvocation VQueue overlay', () => {
  it('applies scheduler-owned status and invocation fields without inventing a scheduled start', () => {
    const invocation = convertInvocation(
      rawInvocation({ scheduled_start_at: undefined }),
      {
        stage: 'inbox',
        status: 'backing-off',
        next_at: '2026-01-01T00:00:20.000Z',
        deployment: 'dp-1',
        retry_attempts: 3,
        retry_count_since_last_stored_command: 7,
        num_attempts: 4,
        num_errors: 2,
        first_runnable_at: '2026-01-01T00:00:01.000Z',
        first_attempt_at: '2026-01-01T00:00:02.000Z',
        latest_attempt_at: '2026-01-01T00:00:10.000Z',
      },
    );

    expect(invocation).toMatchObject({
      status: 'backing-off',
      isRetrying: true,
      pinned_deployment_id: 'dp-1',
      first_runnable_at: '2026-01-01T00:00:01.000Z',
      num_attempts: 4,
      num_errors: 2,
      retry_count: 7,
      running_at: '2026-01-01T00:00:02.000Z',
      last_start_at: '2026-01-01T00:00:10.000Z',
      next_retry_at: '2026-01-01T00:00:20.000Z',
    });
    expect(invocation?.scheduled_start_at).toBeUndefined();
  });

  it('preserves the requested scheduled start separately from first runnable', () => {
    const invocation = convertInvocation(
      rawInvocation({ scheduled_start_at: '2026-01-02T00:00:00.000Z' }),
      {
        stage: 'inbox',
        status: 'scheduled',
        first_runnable_at: '2026-01-03T00:00:00.000Z',
      },
    );

    expect(invocation).toMatchObject({
      scheduled_start_at: '2026-01-02T00:00:00.000Z',
      first_runnable_at: '2026-01-03T00:00:00.000Z',
    });
  });

  it('falls back to the invocation retry count when the VQueue retry count is unavailable', () => {
    const invocation = convertInvocation(rawInvocation({ retry_count: 5 }), {
      stage: 'inbox',
      status: 'backing-off',
      retry_attempts: 2,
    });

    expect(invocation.retry_count).toBe(5);
  });

  it('marks a running VQueue invocation as retrying from its current-command retry count', () => {
    const invocation = convertInvocation(rawInvocation(), {
      stage: 'running',
      status: 'started',
      retry_count_since_last_stored_command: 1,
    });

    expect(invocation).toMatchObject({
      status: 'running',
      retry_count: 1,
      isRetrying: true,
    });
  });

  it('clears retrying after a running VQueue invocation stores a new command', () => {
    const invocation = convertInvocation(
      rawInvocation({ retry_count: 5, last_failure: 'previous failure' }),
      {
        stage: 'running',
        status: 'started',
        retry_count_since_last_stored_command: 0,
      },
    );

    expect(invocation).toMatchObject({
      status: 'running',
      retry_count: 0,
      isRetrying: false,
    });
  });

  it('keeps the last-failure guard for legacy running invocations', () => {
    expect(
      convertInvocation(
        rawInvocation({
          status: 'running',
          retry_count: 2,
          last_failure: 'previous failure',
        }),
      ).isRetrying,
    ).toBe(true);
    expect(
      convertInvocation(rawInvocation({ status: 'running', retry_count: 2 }))
        .isRetrying,
    ).toBe(false);
  });

  it('uses the exact VQueue terminal outcome instead of the raw completion', () => {
    const invocation = convertInvocation(
      rawInvocation({
        status: 'completed',
        completion_result: 'failure',
        completion_failure: '[409] killed',
      }),
      { stage: 'finished', status: 'cancelled' },
    );

    expect(invocation).toMatchObject({
      status: 'cancelled',
      isRetrying: false,
    });
  });

  it.each(['succeeded', 'failed', 'cancelled', 'killed'] as const)(
    'keeps the authoritative VQueue %s status throughout conversion',
    (status) => {
      const invocation = convertInvocation(
        rawInvocation({
          status: 'completed',
          completion_result: 'failure',
          completion_failure: '[409] killed',
        }),
        { stage: 'finished', status },
      );

      expect(invocation).toMatchObject({ status, isRetrying: false });
    },
  );

  it('keeps invocation status when a migrated invocation has no VQueue overlay', () => {
    expect(
      convertInvocation(
        rawInvocation({
          vqueue_id: 'vq-a',
          status: 'completed',
          completion_result: 'success',
        }),
      ),
    ).toMatchObject({ status: 'succeeded' });
  });

  it('uses invocation status when skip-completed migration left no VQueue marker', () => {
    expect(
      convertInvocation(
        rawInvocation({
          vqueue_id: undefined,
          status: 'completed',
          completion_result: 'success',
        }),
      ),
    ).toMatchObject({ status: 'succeeded' });
  });
});
