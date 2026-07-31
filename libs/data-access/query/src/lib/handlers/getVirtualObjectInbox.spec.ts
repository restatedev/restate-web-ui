import type {
  RawInvocation,
  Service,
} from '@restate/data-access/admin-api-spec';
import { describe, expect, it, vi } from 'vitest';
import { getVirtualObjectInbox, getVqueueInbox } from './getVirtualObjectInbox';
import { getVirtualObjectInvocations } from './getVirtualObjectInvocations';
import type { QueryContext } from './shared';

const serviceMetadata = {
  handlers: [
    { name: 'add', ty: 'Exclusive' },
    { name: 'read', ty: 'Shared' },
  ],
} as Service;

function createAdminApiMock(): QueryContext['adminApi'] {
  const owner: { adminApi: QueryContext['adminApi'] } = {
    adminApi: async <T>() => serviceMetadata as T,
  };
  vi.spyOn(owner, 'adminApi');
  return owner.adminApi;
}

function rawInvocation(
  id: string,
  handler: string,
  overrides: Partial<RawInvocation> = {},
): RawInvocation {
  return {
    id,
    created_at: '2026-07-23T08:00:00.000Z',
    modified_at: '2026-07-23T08:05:00.000Z',
    scheduled_at: '2026-07-23T08:00:00.000Z',
    invoked_by: 'ingress',
    status: 'completed',
    completion_result: 'success',
    target: `Counter/customer-1/${handler}`,
    target_service_name: 'Counter',
    target_service_key: 'customer-1',
    target_handler_name: handler,
    target_service_ty: 'virtual_object',
    ...overrides,
  };
}

function contextWith(
  query: QueryContext['query'],
  features: string[],
  adminApi: QueryContext['adminApi'] = createAdminApiMock(),
) {
  return {
    query,
    adminApi,
    baseUrl: '',
    restateVersion: '1.7.2',
    features: new Set(features),
  } satisfies QueryContext;
}

function withoutInboxCountQuery(query: ReturnType<typeof vi.fn>) {
  return query.mock.calls
    .map(([statement]) => String(statement))
    .filter((statement) => !statement.includes(' AS inbox_count'));
}

describe('Virtual Object inbox and invocation query handlers', () => {
  it('returns the exact legacy sys_inbox count', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('COUNT(*) AS inbox_count')) {
        return { rows: [{ inbox_count: 42 }] };
      }
      return { rows: [] };
    });
    const context = contextWith(query, []);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(await response.json()).toMatchObject({
      supported: true,
      inboxCount: 42,
    });
    expect(query).toHaveBeenCalledWith(
      `SELECT COUNT(*) AS inbox_count
    FROM sys_inbox
    WHERE service_name = 'Counter'
      AND service_key = 'customer-1'`,
    );
  });

  it('returns the exact inbox count across matching VQueues', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('SUM(num_inbox)')) {
        return { rows: [{ inbox_count: 35_548 }] };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues', 'scoped_virtual_objects']);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(await response.json()).toMatchObject({
      supported: true,
      inboxCount: 35_548,
    });
    expect(query).toHaveBeenCalledWith(
      `SELECT SUM(num_inbox) AS inbox_count
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND lock_name = 'Counter/customer-1'
      AND scope = 'tenant-a'`,
    );
  });

  it('does not query unscoped legacy tables for a scoped instance', async () => {
    const query = vi.fn();
    const adminApi = createAdminApiMock();
    const context = contextWith(query, [], adminApi);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(await response.json()).toEqual({
      supported: false,
      rows: [],
      limit: 25,
      truncated: false,
    });

    expect(query).not.toHaveBeenCalled();
    expect(adminApi).not.toHaveBeenCalled();
  });

  it('reconciles a holder acquired after the initial flat hydration', async () => {
    let lockReadCount = 0;
    let entryStatusReadCount = 0;
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_locks')) {
        lockReadCount += 1;
        return {
          rows: [
            lockReadCount === 1
              ? {
                  acquired_by: 'mut_previous',
                  acquired_at: '2026-07-23T08:59:00.000Z',
                }
              : {
                  acquired_by: 'mut_next',
                  acquired_at: '2026-07-23T09:00:00.000Z',
                },
          ],
        };
      }
      if (statement.includes('FROM sys_vqueue_meta')) {
        return { rows: [{ id: 'vq_counter_customer_1' }] };
      }
      if (statement.includes('FROM sys_vqueues')) {
        return {
          rows: [
            {
              vqueue_id: 'vq_counter_customer_1',
              id: 'mut_next',
              kind: 'state-mutation',
              stage: 'inbox',
              status: 'pending',
              has_lock: false,
              run_at: '2026-07-23T09:00:00.000Z',
              sequence_number: 7,
              created_at: '2026-07-23T08:00:00.000Z',
              transitioned_at: '2026-07-23T08:05:00.000Z',
            },
          ],
        };
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        entryStatusReadCount += 1;
        return {
          rows: [
            {
              id: 'mut_next',
              kind: 'state-mutation',
              vqueue_id: 'vq_counter_customer_1',
              stage: entryStatusReadCount === 1 ? 'inbox' : 'running',
              status: entryStatusReadCount === 1 ? 'pending' : 'running',
              has_lock: entryStatusReadCount !== 1,
              run_at: '2026-07-23T09:00:00.000Z',
              sequence_number: 7,
              created_at: '2026-07-23T08:00:00.000Z',
              transitioned_at: '2026-07-23T08:05:00.000Z',
            },
          ],
        };
      }
      return { rows: [] };
    });
    const adminApi = createAdminApiMock();
    const context = contextWith(
      query,
      ['vqueues', 'scoped_virtual_objects'],
      adminApi,
    );

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(adminApi).not.toHaveBeenCalled();
    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope IS NULL
              AND acquired_by IS NOT NULL
            LIMIT 1",
          "SELECT id
            FROM sys_vqueue_meta
            WHERE service_name = 'Counter'
              AND lock_name = 'Counter/customer-1'
              AND scope IS NULL
            LIMIT 1",
          "SELECT
              id AS vqueue_id,
              entry_id AS id,
              entry_kind AS kind,
              stage,
              status,
              has_lock,
              run_at,
              sequence_number,
              created_at,
              transitioned_at
            FROM sys_vqueues
            WHERE id = 'vq_counter_customer_1'
              AND stage = 'inbox'
            LIMIT 26",
          "SELECT
              entry_id AS id,
              entry_kind AS kind,
              vqueue_id,
              stage,
              status,
              has_lock,
              next_at AS run_at,
              sequence_number,
              created_at,
              transitioned_at,
              first_attempt_at,
              latest_attempt_at,
              first_runnable_at,
              retry_attempts,
              retry_count_since_last_stored_command,
              num_attempts,
              num_errors,
              deployment
            FROM sys_vqueue_entry_status
            WHERE entry_id IN ('mut_next', 'mut_previous')
              AND stage <> 'finished'",
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope IS NULL
              AND acquired_by IS NOT NULL
            LIMIT 1",
          "SELECT
              entry_id AS id,
              entry_kind AS kind,
              vqueue_id,
              stage,
              status,
              has_lock,
              next_at AS run_at,
              sequence_number,
              created_at,
              transitioned_at,
              first_attempt_at,
              latest_attempt_at,
              first_runnable_at,
              retry_attempts,
              retry_count_since_last_stored_command,
              num_attempts,
              num_errors,
              deployment
            FROM sys_vqueue_entry_status
            WHERE entry_id IN ('mut_next')
              AND stage <> 'finished'",
        ]
      `);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [],
      limit: 25,
      truncated: false,
    });
  });

  it('returns scoped inbox entries ordered by run_at and hydrates the lock independently', async () => {
    const inboxEntries = [
      {
        vqueue_id: 'vq_early',
        id: 'inv_early',
        kind: 'invocation',
        stage: 'inbox',
        status: 'new',
        has_lock: false,
        run_at: '2026-07-23T09:00:00.000Z',
        sequence_number: 1,
        created_at: '2026-07-23T08:00:00.000Z',
        transitioned_at: '2026-07-23T08:00:00.000Z',
      },
      {
        vqueue_id: 'vq_late',
        id: 'mut_late',
        kind: 'state-mutation',
        stage: 'inbox',
        status: 'new',
        has_lock: false,
        run_at: '2026-07-23T09:01:00.000Z',
        sequence_number: 2,
        created_at: '2026-07-23T08:01:00.000Z',
        transitioned_at: '2026-07-23T08:01:00.000Z',
      },
    ];
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_locks')) {
        return {
          rows: [
            {
              acquired_by: 'inv_lock',
              acquired_at: '2026-07-23T09:00:00.000Z',
            },
          ],
        };
      }
      if (statement.includes('FROM sys_vqueues v')) {
        return { rows: inboxEntries };
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return {
          rows: [
            ...inboxEntries,
            {
              id: 'inv_lock',
              kind: 'invocation',
              vqueue_id: 'vq_lock',
              stage: 'running',
              status: 'started',
              has_lock: true,
            },
          ],
        };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return {
          rows: [
            rawInvocation('inv_early', 'add', {
              status: 'pending',
              completion_result: undefined,
              scope: 'tenant-a',
              limit_key: 'tenant/early',
            }),
            rawInvocation('inv_lock', 'add', {
              status: 'running',
              completion_result: undefined,
            }),
          ],
        };
      }
      return { rows: [] };
    });
    const adminApi = createAdminApiMock();
    const context = contextWith(
      query,
      ['vqueues', 'scoped_virtual_objects'],
      adminApi,
    );

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(adminApi).not.toHaveBeenCalled();
    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope = 'tenant-a'
              AND acquired_by IS NOT NULL
            LIMIT 1",
          "SELECT
              v.id AS vqueue_id,
              v.entry_id AS id,
              v.entry_kind AS kind,
              v.stage,
              v.status,
              v.has_lock,
              v.run_at,
              v.sequence_number,
              v.created_at,
              v.transitioned_at
            FROM sys_vqueues v
            WHERE v.id IN (
              SELECT vm.id
              FROM sys_vqueue_meta vm
              WHERE vm.service_name = 'Counter'
                AND vm.lock_name = 'Counter/customer-1'
                AND vm.scope = 'tenant-a'
                AND vm.num_inbox > 0
              LIMIT 250
            )
              AND v.stage = 'inbox'
            ORDER BY v.run_at ASC NULLS LAST
            LIMIT 26",
          "SELECT
              entry_id AS id,
              entry_kind AS kind,
              vqueue_id,
              stage,
              status,
              has_lock,
              next_at AS run_at,
              sequence_number,
              created_at,
              transitioned_at,
              first_attempt_at,
              latest_attempt_at,
              first_runnable_at,
              retry_attempts,
              retry_count_since_last_stored_command,
              num_attempts,
              num_errors,
              deployment
            FROM sys_vqueue_entry_status
            WHERE entry_id IN ('inv_early', 'mut_late', 'inv_lock')
              AND stage <> 'finished'",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
            FROM sys_invocation
            WHERE id IN ('inv_early', 'inv_lock')
              AND status <> 'completed'",
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope = 'tenant-a'
              AND acquired_by IS NOT NULL
            LIMIT 1",
        ]
      `);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [
        expect.objectContaining({
          id: 'inv_early',
          kind: 'invocation',
          vqueueId: 'vq_early',
          runAt: '2026-07-23T09:00:00.000Z',
          invocation: expect.objectContaining({
            id: 'inv_early',
            limit_key: 'tenant/early',
          }),
        }),
        expect.objectContaining({
          id: 'mut_late',
          kind: 'state-mutation',
          vqueueId: 'vq_late',
          runAt: '2026-07-23T09:01:00.000Z',
        }),
      ],
      limit: 25,
      truncated: false,
    });
  });

  it('reconciles a changed holder independently of inbox candidates', async () => {
    const nextLockVqueue = {
      id: 'vq_next_lock',
      limit_key: 'tenant/next',
      num_inbox: 0,
    };
    let lockReadCount = 0;
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_locks')) {
        lockReadCount += 1;
        return lockReadCount === 1
          ? {
              rows: [
                {
                  acquired_by: 'inv_previous_lock',
                  acquired_at: '2026-07-23T09:00:00.000Z',
                },
              ],
            }
          : {
              rows: [
                {
                  acquired_by: 'mut_next_lock',
                  acquired_at: '2026-07-23T09:01:00.000Z',
                },
              ],
            };
      }
      if (statement.includes('FROM sys_vqueues v')) {
        return { rows: [] };
      }
      if (statement.includes("entry_id IN ('inv_previous_lock')")) {
        return {
          rows: [
            {
              id: 'inv_previous_lock',
              kind: 'invocation',
              vqueue_id: 'vq_previous_lock',
              stage: 'finished',
              status: 'succeeded',
              has_lock: false,
            },
          ],
        };
      }
      if (statement.includes("entry_id IN ('mut_next_lock')")) {
        return {
          rows: [
            {
              id: 'mut_next_lock',
              kind: 'state-mutation',
              vqueue_id: nextLockVqueue.id,
              stage: 'running',
              status: 'started',
              has_lock: true,
            },
          ],
        };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return {
          rows: [
            rawInvocation('inv_previous_lock', 'add', {
              status: 'running',
              completion_result: undefined,
            }),
          ],
        };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues', 'scoped_virtual_objects']);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope = 'tenant-a'
              AND acquired_by IS NOT NULL
            LIMIT 1",
          "SELECT
              v.id AS vqueue_id,
              v.entry_id AS id,
              v.entry_kind AS kind,
              v.stage,
              v.status,
              v.has_lock,
              v.run_at,
              v.sequence_number,
              v.created_at,
              v.transitioned_at
            FROM sys_vqueues v
            WHERE v.id IN (
              SELECT vm.id
              FROM sys_vqueue_meta vm
              WHERE vm.service_name = 'Counter'
                AND vm.lock_name = 'Counter/customer-1'
                AND vm.scope = 'tenant-a'
                AND vm.num_inbox > 0
              LIMIT 250
            )
              AND v.stage = 'inbox'
            ORDER BY v.run_at ASC NULLS LAST
            LIMIT 26",
          "SELECT
              entry_id AS id,
              entry_kind AS kind,
              vqueue_id,
              stage,
              status,
              has_lock,
              next_at AS run_at,
              sequence_number,
              created_at,
              transitioned_at,
              first_attempt_at,
              latest_attempt_at,
              first_runnable_at,
              retry_attempts,
              retry_count_since_last_stored_command,
              num_attempts,
              num_errors,
              deployment
            FROM sys_vqueue_entry_status
            WHERE entry_id IN ('inv_previous_lock')
              AND stage <> 'finished'",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
            FROM sys_invocation
            WHERE id IN ('inv_previous_lock')
              AND status <> 'completed'",
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope = 'tenant-a'
              AND acquired_by IS NOT NULL
            LIMIT 1",
          "SELECT
              entry_id AS id,
              entry_kind AS kind,
              vqueue_id,
              stage,
              status,
              has_lock,
              next_at AS run_at,
              sequence_number,
              created_at,
              transitioned_at,
              first_attempt_at,
              latest_attempt_at,
              first_runnable_at,
              retry_attempts,
              retry_count_since_last_stored_command,
              num_attempts,
              num_errors,
              deployment
            FROM sys_vqueue_entry_status
            WHERE entry_id IN ('mut_next_lock')
              AND stage <> 'finished'",
        ]
      `);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [],
      limit: 25,
      truncated: false,
    });
  });

  it('hydrates a holder acquired after the initial lock read', async () => {
    const nextLockVqueue = {
      id: 'vq_next_lock',
      limit_key: 'tenant/next',
      num_inbox: 0,
    };
    let lockReadCount = 0;
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_locks')) {
        lockReadCount += 1;
        return lockReadCount === 1
          ? { rows: [] }
          : {
              rows: [
                {
                  acquired_by: 'mut_next_lock',
                  acquired_at: '2026-07-23T09:01:00.000Z',
                },
              ],
            };
      }
      if (statement.includes('FROM sys_vqueues v')) {
        return { rows: [] };
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return {
          rows: [
            {
              id: 'mut_next_lock',
              kind: 'state-mutation',
              vqueue_id: nextLockVqueue.id,
              stage: 'running',
              status: 'started',
              has_lock: true,
            },
          ],
        };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues', 'scoped_virtual_objects']);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope = 'tenant-a'
              AND acquired_by IS NOT NULL
            LIMIT 1",
          "SELECT
              v.id AS vqueue_id,
              v.entry_id AS id,
              v.entry_kind AS kind,
              v.stage,
              v.status,
              v.has_lock,
              v.run_at,
              v.sequence_number,
              v.created_at,
              v.transitioned_at
            FROM sys_vqueues v
            WHERE v.id IN (
              SELECT vm.id
              FROM sys_vqueue_meta vm
              WHERE vm.service_name = 'Counter'
                AND vm.lock_name = 'Counter/customer-1'
                AND vm.scope = 'tenant-a'
                AND vm.num_inbox > 0
              LIMIT 250
            )
              AND v.stage = 'inbox'
            ORDER BY v.run_at ASC NULLS LAST
            LIMIT 26",
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope = 'tenant-a'
              AND acquired_by IS NOT NULL
            LIMIT 1",
          "SELECT
              entry_id AS id,
              entry_kind AS kind,
              vqueue_id,
              stage,
              status,
              has_lock,
              next_at AS run_at,
              sequence_number,
              created_at,
              transitioned_at,
              first_attempt_at,
              latest_attempt_at,
              first_runnable_at,
              retry_attempts,
              retry_count_since_last_stored_command,
              num_attempts,
              num_errors,
              deployment
            FROM sys_vqueue_entry_status
            WHERE entry_id IN ('mut_next_lock')
              AND stage <> 'finished'",
        ]
      `);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [],
      limit: 25,
      truncated: false,
    });
  });

  it('returns snapshot_changed when the refreshed holder is inconsistent', async () => {
    let lockReadCount = 0;
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_locks')) {
        lockReadCount += 1;
        return {
          rows: [
            lockReadCount === 1
              ? {
                  acquired_by: 'inv_previous_lock',
                  acquired_at: '2026-07-23T09:00:00.000Z',
                }
              : {
                  acquired_by: 'mut_next_lock',
                  acquired_at: '2026-07-23T09:01:00.000Z',
                },
          ],
        };
      }
      if (statement.includes('FROM sys_vqueues v')) {
        return { rows: [] };
      }
      if (statement.includes("entry_id IN ('inv_previous_lock')")) {
        return { rows: [] };
      }
      if (statement.includes("entry_id IN ('mut_next_lock')")) {
        return {
          rows: [
            {
              id: 'mut_next_lock',
              kind: 'state-mutation',
              vqueue_id: 'vq_missing',
              stage: 'finished',
              status: 'succeeded',
              has_lock: false,
            },
          ],
        };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues', 'scoped_virtual_objects']);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope = 'tenant-a'
              AND acquired_by IS NOT NULL
            LIMIT 1",
          "SELECT
              v.id AS vqueue_id,
              v.entry_id AS id,
              v.entry_kind AS kind,
              v.stage,
              v.status,
              v.has_lock,
              v.run_at,
              v.sequence_number,
              v.created_at,
              v.transitioned_at
            FROM sys_vqueues v
            WHERE v.id IN (
              SELECT vm.id
              FROM sys_vqueue_meta vm
              WHERE vm.service_name = 'Counter'
                AND vm.lock_name = 'Counter/customer-1'
                AND vm.scope = 'tenant-a'
                AND vm.num_inbox > 0
              LIMIT 250
            )
              AND v.stage = 'inbox'
            ORDER BY v.run_at ASC NULLS LAST
            LIMIT 26",
          "SELECT
              entry_id AS id,
              entry_kind AS kind,
              vqueue_id,
              stage,
              status,
              has_lock,
              next_at AS run_at,
              sequence_number,
              created_at,
              transitioned_at,
              first_attempt_at,
              latest_attempt_at,
              first_runnable_at,
              retry_attempts,
              retry_count_since_last_stored_command,
              num_attempts,
              num_errors,
              deployment
            FROM sys_vqueue_entry_status
            WHERE entry_id IN ('inv_previous_lock')
              AND stage <> 'finished'",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
            FROM sys_invocation
            WHERE id IN ('inv_previous_lock')
              AND status <> 'completed'",
          "SELECT acquired_by, acquired_at
            FROM sys_locks
            WHERE lock_name = 'Counter/customer-1'
              AND scope = 'tenant-a'
              AND acquired_by IS NOT NULL
            LIMIT 1",
          "SELECT
              entry_id AS id,
              entry_kind AS kind,
              vqueue_id,
              stage,
              status,
              has_lock,
              next_at AS run_at,
              sequence_number,
              created_at,
              transitioned_at,
              first_attempt_at,
              latest_attempt_at,
              first_runnable_at,
              retry_attempts,
              retry_count_since_last_stored_command,
              num_attempts,
              num_errors,
              deployment
            FROM sys_vqueue_entry_status
            WHERE entry_id IN ('mut_next_lock')
              AND stage <> 'finished'",
        ]
      `);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: 'Object activity changed while loading—try again.',
      restate_code: 'snapshot_changed',
    });
  });

  it('uses direct key equality for recent invocations on Restate 1.7.3', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_invocation_status')) {
        return { rows: [{ id: 'inv_1shared' }] };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return { rows: [rawInvocation('inv_1shared', 'read')] };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues']);
    context.restateVersion = '1.7.3';

    const response = await getVirtualObjectInvocations.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT si.id
            FROM sys_invocation_status si
            WHERE si.target_service_ty = 'virtual_object'
              AND si.target_service_name = 'Counter'
              AND si.target_service_key = 'customer-1'
              AND si.scope = 'tenant-a'
            ORDER BY si.created_at DESC NULLS LAST
            LIMIT 51",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
            FROM sys_invocation
            WHERE id IN ('inv_1shared')",
          "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_1shared') AND entry_kind = 'invocation'",
        ]
      `);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [
        expect.objectContaining({
          id: 'inv_1shared',
          status: 'succeeded',
          target_handler_name: 'read',
        }),
      ],
      limit: 50,
      truncated: false,
    });
  });

  it('does not query unscoped invocation tables for a scoped identity without VQueues', async () => {
    const query = vi.fn();
    const context = contextWith(query, []);

    const response = await getVirtualObjectInvocations.call(
      context,
      'Counter',
      'customer-1',
      'tenant-a',
    );

    expect(query).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      supported: false,
      rows: [],
      limit: 50,
      truncated: false,
    });
  });

  it('returns lock holders among recent invocations without loading lock or inbox data', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_invocation_status')) {
        return {
          rows: [{ id: 'inv_1exclusive' }, { id: 'inv_1waiting' }],
        };
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return {
          rows: [
            {
              entry_id: 'inv_1exclusive',
              vqueue_id: 'vq_1exclusive',
              stage: 'inbox',
              status: 'backing-off',
            },
            {
              entry_id: 'inv_1waiting',
              vqueue_id: 'vq_1waiting',
              stage: 'inbox',
              status: 'pending',
            },
          ],
        };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return {
          rows: [
            rawInvocation('inv_1exclusive', 'add', {
              status: 'backing-off',
              running_at: '2026-07-23T08:10:00.000Z',
              completion_result: undefined,
            }),
            rawInvocation('inv_1waiting', 'add', {
              status: 'pending',
              completion_result: undefined,
            }),
          ],
        };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues']);

    const response = await getVirtualObjectInvocations.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
      [
        "SELECT si.id
          FROM sys_invocation_status si
          WHERE si.target_service_ty = 'virtual_object'
            AND si.target_service_name = 'Counter'
            AND SUBSTR(si.target_service_key, 1) = 'customer-1'
            AND si.scope IS NULL
          ORDER BY si.created_at DESC NULLS LAST
          LIMIT 51",
        "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure, scope, vqueue_id, limit_key
          FROM sys_invocation
          WHERE id IN ('inv_1exclusive', 'inv_1waiting')",
        "SELECT entry_id, vqueue_id, stage, status, next_at, created_at, transitioned_at, first_attempt_at, latest_attempt_at, first_runnable_at, retry_attempts, retry_count_since_last_stored_command, num_attempts, num_errors, deployment FROM sys_vqueue_entry_status WHERE entry_id IN ('inv_1exclusive', 'inv_1waiting') AND entry_kind = 'invocation'",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [
        expect.objectContaining({
          id: 'inv_1exclusive',
          status: 'backing-off',
        }),
        expect.objectContaining({
          id: 'inv_1waiting',
          status: 'pending',
        }),
      ],
      limit: 50,
      truncated: false,
    });
  });

  it('hydrates a legacy holder acquired after the initial empty lock read', async () => {
    let lockReadCount = 0;
    let invocationReadCount = 0;
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_keyed_service_status')) {
        lockReadCount += 1;
        return lockReadCount === 1
          ? { rows: [] }
          : { rows: [{ invocation_id: 'inv_1exclusive' }] };
      }
      if (statement.includes('COUNT(*) AS inbox_count')) {
        return { rows: [{ inbox_count: 1 }] };
      }
      if (statement.includes('FROM sys_inbox')) {
        return { rows: [{ id: 'inv_1exclusive' }] };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        invocationReadCount += 1;
        return {
          rows: [
            rawInvocation('inv_1exclusive', 'add', {
              status: 'running',
              running_at: '2026-07-23T08:10:00.000Z',
              completion_result: undefined,
            }),
          ],
        };
      }
      return { rows: [] };
    });
    const context = contextWith(query, []);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(lockReadCount).toBe(2);
    expect(invocationReadCount).toBe(2);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [],
      inboxCount: 0,
      limit: 25,
      truncated: false,
    });
  });

  it('uses the legacy inbox storage order without sorting', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_keyed_service_status')) {
        return { rows: [{ invocation_id: 'inv_1exclusive' }] };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return {
          rows: [
            rawInvocation('inv_1exclusive', 'add', {
              status: 'running',
              completion_result: undefined,
            }),
          ],
        };
      }
      return { rows: [{ id: 'inv_1exclusive' }] };
    });
    const context = contextWith(query, []);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT invocation_id
              FROM sys_keyed_service_status
              WHERE service_name = 'Counter'
                AND service_key = 'customer-1'
                AND invocation_id IS NOT NULL
              LIMIT 1",
          "SELECT id
            FROM sys_inbox
            WHERE service_name = 'Counter'
              AND service_key = 'customer-1'
            LIMIT 26",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure
            FROM sys_invocation
            WHERE id IN ('inv_1exclusive')
              AND status <> 'completed'",
        ]
      `);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [],
      limit: 25,
      truncated: false,
    });
  });

  it('returns no holder when the refreshed legacy lock is empty', async () => {
    let lockReadCount = 0;
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_keyed_service_status')) {
        lockReadCount += 1;
        return lockReadCount === 1
          ? { rows: [{ invocation_id: 'inv_finished_lock' }] }
          : { rows: [] };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return { rows: [rawInvocation('inv_finished_lock', 'add')] };
      }
      return { rows: [] };
    });
    const context = contextWith(query, []);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT invocation_id
              FROM sys_keyed_service_status
              WHERE service_name = 'Counter'
                AND service_key = 'customer-1'
                AND invocation_id IS NOT NULL
              LIMIT 1",
          "SELECT id
            FROM sys_inbox
            WHERE service_name = 'Counter'
              AND service_key = 'customer-1'
            LIMIT 26",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure
            FROM sys_invocation
            WHERE id IN ('inv_finished_lock')
              AND status <> 'completed'",
          "SELECT invocation_id
              FROM sys_keyed_service_status
              WHERE service_name = 'Counter'
                AND service_key = 'customer-1'
                AND invocation_id IS NOT NULL
              LIMIT 1",
        ]
      `);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [],
      limit: 25,
      truncated: false,
    });
  });

  it('returns snapshot_changed when a refreshed legacy holder remains invalid', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_keyed_service_status')) {
        return { rows: [{ invocation_id: 'inv_finished_lock' }] };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return { rows: [rawInvocation('inv_finished_lock', 'add')] };
      }
      return { rows: [] };
    });
    const context = contextWith(query, []);

    const response = await getVirtualObjectInbox.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT invocation_id
              FROM sys_keyed_service_status
              WHERE service_name = 'Counter'
                AND service_key = 'customer-1'
                AND invocation_id IS NOT NULL
              LIMIT 1",
          "SELECT id
            FROM sys_inbox
            WHERE service_name = 'Counter'
              AND service_key = 'customer-1'
            LIMIT 26",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure
            FROM sys_invocation
            WHERE id IN ('inv_finished_lock')
              AND status <> 'completed'",
          "SELECT invocation_id
              FROM sys_keyed_service_status
              WHERE service_name = 'Counter'
                AND service_key = 'customer-1'
                AND invocation_id IS NOT NULL
              LIMIT 1",
          "SELECT id, target, target_service_name, target_service_key, target_handler_name, target_service_ty, idempotency_key, invoked_by, invoked_by_id, invoked_by_subscription_id, invoked_by_target, restarted_from, pinned_deployment_id, pinned_service_protocol_version, journal_size, journal_commands_size, created_at, modified_at, inboxed_at, scheduled_at, scheduled_start_at, running_at, completed_at, completion_retention, journal_retention, retry_count, last_start_at, next_retry_at, last_attempt_deployment_id, last_attempt_server, last_failure, last_failure_error_code, status, completion_result, completion_failure
            FROM sys_invocation
            WHERE id IN ('inv_finished_lock')
              AND status <> 'completed'",
        ]
      `);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: 'Object activity changed while loading—try again.',
      restate_code: 'snapshot_changed',
    });
  });
});

describe('GET /query/vqueues/:vqueueId/inbox', () => {
  it('keeps state mutations that are still inboxed after hydration', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_vqueues')) {
        return {
          rows: [
            {
              vqueue_id: 'vq_customer',
              id: 'mut_1state',
              kind: 'state-mutation',
              stage: 'inbox',
              status: 'new',
              has_lock: false,
              run_at: '2026-07-23T09:00:00.000Z',
              sequence_number: 3,
            },
            {
              vqueue_id: 'vq_customer',
              id: 'mut_2running',
              kind: 'state-mutation',
              stage: 'inbox',
              status: 'new',
              has_lock: false,
              run_at: '2026-07-23T09:01:00.000Z',
              sequence_number: 4,
            },
          ],
        };
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return {
          rows: [
            {
              id: 'mut_1state',
              kind: 'state-mutation',
              vqueue_id: 'vq_customer',
              stage: 'inbox',
              status: 'pending',
              has_lock: false,
              run_at: '2026-07-23T09:00:00.000Z',
              sequence_number: 3,
              transitioned_at: '2026-07-23T08:05:00.000Z',
            },
            {
              id: 'mut_2running',
              kind: 'state-mutation',
              vqueue_id: 'vq_customer',
              stage: 'running',
              status: 'started',
              has_lock: true,
              run_at: '2026-07-23T09:01:00.000Z',
              sequence_number: 4,
              transitioned_at: '2026-07-23T08:06:00.000Z',
            },
          ],
        };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues']);

    const response = await getVqueueInbox.call(context, 'vq_customer');

    expect(withoutInboxCountQuery(query)).toMatchInlineSnapshot(`
        [
          "SELECT
              id AS vqueue_id,
              entry_id AS id,
              entry_kind AS kind,
              stage,
              status,
              has_lock,
              run_at,
              sequence_number,
              created_at,
              transitioned_at
            FROM sys_vqueues
            WHERE id = 'vq_customer'
              AND stage = 'inbox'
            LIMIT 26",
          "SELECT
              entry_id AS id,
              entry_kind AS kind,
              vqueue_id,
              stage,
              status,
              has_lock,
              next_at AS run_at,
              sequence_number,
              created_at,
              transitioned_at,
              first_attempt_at,
              latest_attempt_at,
              first_runnable_at,
              retry_attempts,
              retry_count_since_last_stored_command,
              num_attempts,
              num_errors,
              deployment
            FROM sys_vqueue_entry_status
            WHERE entry_id IN ('mut_1state', 'mut_2running')
              AND stage <> 'finished'",
        ]
      `);
    expect(await response.json()).toEqual({
      supported: true,
      rows: [
        {
          id: 'mut_1state',
          kind: 'state-mutation',
          vqueueId: 'vq_customer',
          hasLock: false,
          runAt: '2026-07-23T09:00:00.000Z',
          sequenceNumber: 3,
          stage: 'inbox',
          status: 'pending',
          transitionedAt: '2026-07-23T08:05:00.000Z',
        },
      ],
      limit: 25,
      truncated: false,
    });
  });

  it('hydrates all candidates before applying the final limit', async () => {
    const candidates = Array.from({ length: 26 }, (_, index) => ({
      vqueue_id: 'vq_customer',
      id: `inv_${index}`,
      kind: 'invocation',
    }));
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM sys_vqueues')) {
        return { rows: candidates };
      }
      if (statement.includes('FROM sys_vqueue_entry_status')) {
        return {
          rows: candidates.map((candidate, index) => ({
            ...candidate,
            stage: 'inbox',
            status: 'new',
            sequence_number: index,
          })),
        };
      }
      if (statement.includes('FROM sys_invocation\n')) {
        return {
          rows: candidates.slice(1).map((candidate) =>
            rawInvocation(candidate.id, 'add', {
              status: 'running',
              completion_result: undefined,
            }),
          ),
        };
      }
      return { rows: [] };
    });
    const context = contextWith(query, ['vqueues']);

    const response = await getVqueueInbox.call(context, 'vq_customer');
    const body = await response.json();

    expect(body.rows).toHaveLength(25);
    expect(body.rows[0].id).toBe('inv_1');
    expect(body.rows[24].id).toBe('inv_25');
    expect(body.truncated).toBe(true);
  });
});
