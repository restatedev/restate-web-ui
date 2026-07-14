import { describe, expect, it } from 'vitest';
import {
  NO_VQUEUE_HEADERS,
  VQUEUE_SKIP_COMPLETED_HEADERS,
  createInvocationV2QueryTestHarness,
  rawInvocation,
} from './testUtils';

describe('POST /query/v2/invocations', () => {
  const { sql, post, setResponder } = createInvocationV2QueryTestHarness();

  describe('VQueue exact', () => {
    it('queries durable and terminal statuses from invocation status', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['paused', 'failed'],
          },
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['myService'],
          },
          {
            field: 'scope',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'global',
          },
          {
            field: 'target_service_ty',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'workflow',
          },
          {
            field: 'limit_key',
            type: 'STRING',
            operation: 'IS NOT NULL',
          },
        ],
        sort: { field: 'modified_at', order: 'DESC' },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE (ss.status = 'paused' OR (ss.status = 'completed' AND ss.completion_result = 'failure' AND COALESCE(LOWER(ss.completion_failure), '') NOT IN ('[409] killed', '[409] canceled', '[409] cancelled')))
                AND ss.target_service_name IN ('myService')
                AND ss.scope = 'global'
                AND ss.target_service_ty = 'workflow'
                AND ss.limit_key IS NOT NULL
              ORDER BY ss.modified_at DESC NULLS LAST
              LIMIT 250",
        ]
      `);
    });

    it('keeps service filtering on invocation status when its status is sufficient', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'pending',
          },
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['myService'],
          },
        ],
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE ss.status = 'inboxed'
                AND ss.target_service_name IN ('myService')
              LIMIT 250",
        ]
      `);
    });

    it('queries statuses only available from VQueues without a join', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['running', 'backing-off', 'ready', 'yielded'],
          },
          {
            field: 'created_at',
            type: 'DATE',
            operation: 'AFTER',
            value: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
                AND v.stage IN ('inbox', 'running')
                AND ((v.stage = 'inbox' AND v.status IN ('backing-off', 'started', 'yielded')) OR v.stage = 'running')
                AND v.created_at > '2026-01-01T00:00:00.000Z'
              LIMIT 250",
        ]
      `);
    });

    it('queries the Stuck shortcut entirely from VQueues with transitioned_at', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['pending', 'backing-off', 'paused', 'ready', 'yielded'],
          },
        ],
        sort: { field: 'transitioned_at', order: 'ASC' },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
                AND v.stage IN ('inbox', 'paused')
                AND ((v.stage = 'inbox' AND v.status IN ('new', 'backing-off', 'started', 'yielded')) OR v.stage = 'paused')
              ORDER BY v.transitioned_at ASC NULLS LAST
              LIMIT 250",
        ]
      `);
    });

    it('queries the In-flight shortcut entirely from VQueues', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'NOT_IN',
            value: ['succeeded', 'failed', 'cancelled', 'killed', 'scheduled'],
          },
        ],
        sort: { field: 'created_at', order: 'DESC' },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
                AND v.stage IN ('inbox', 'running', 'suspended', 'paused')
                AND ((v.stage = 'inbox' AND v.status IN ('new', 'backing-off', 'started', 'yielded')) OR v.stage = 'running' OR v.stage = 'suspended' OR v.stage = 'paused')
              ORDER BY v.created_at DESC NULLS LAST
              LIMIT 250",
        ]
      `);
    });

    it('queries the Processing shortcut entirely from VQueues', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['running', 'backing-off'],
          },
        ],
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
                AND v.stage IN ('inbox', 'running')
                AND ((v.stage = 'inbox' AND v.status IN ('backing-off')) OR v.stage = 'running')
              LIMIT 250",
        ]
      `);
    });

    it('uses a bounded service metadata semi-join and reports truncation', async () => {
      setResponder((statement) => {
        if (statement.includes('COUNT(1) AS queue_count')) {
          return [{ queue_count: 100001 }];
        }
        if (statement.includes('FROM sys_vqueues v')) {
          return [{ id: 'inv-live' }];
        }
        if (statement.includes('FROM sys_invocation i')) {
          return [
            rawInvocation('inv-live', {
              target_service_name: 'myService',
              status: 'ready',
            }),
          ];
        }
        return [
          {
            entry_id: 'inv-live',
            stage: 'inbox',
            status: 'backing-off',
            transitioned_at: '2026-01-01T00:00:04.000Z',
          },
        ];
      });

      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['pending', 'backing-off', 'paused', 'ready'],
          },
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['myService'],
          },
        ],
        sort: { field: 'transitioned_at', order: 'DESC' },
      });

      expect(await response.json()).toMatchObject({
        rows: [{ id: 'inv-live', status: 'backing-off' }],
        mode: 'exact',
        isPartial: true,
        partial: {
          reason: 'vqueue-limit',
          queueLimit: 100000,
        },
      });
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.id IN (
                SELECT vm.id
                FROM sys_vqueue_meta vm
                WHERE vm.service_name IN ('myService')
                  AND (vm.num_inbox > 0 OR vm.num_paused > 0)
                LIMIT 100000
              )
                AND v.entry_kind = 'invocation'
                AND v.stage IN ('inbox', 'paused')
                AND ((v.stage = 'inbox' AND v.status IN ('new', 'backing-off', 'started')) OR v.stage = 'paused')
              ORDER BY v.transitioned_at DESC NULLS LAST
              LIMIT 250",
          "SELECT
                COUNT(1) AS queue_count
              FROM (
                SELECT vm.id
                FROM sys_vqueue_meta vm
                WHERE vm.service_name IN ('myService')
                  AND (vm.num_inbox > 0 OR vm.num_paused > 0)
                LIMIT 100001
              ) limited_service_queues",
          "SELECT
                id,
        target,
        target_service_name,
        target_service_key,
        target_handler_name,
        target_service_ty,
        idempotency_key,
        invoked_by,
        invoked_by_id,
        invoked_by_subscription_id,
        invoked_by_target,
        restarted_from,
        pinned_deployment_id,
        pinned_service_protocol_version,
        journal_size,
        journal_commands_size,
        created_at,
        modified_at,
        inboxed_at,
        scheduled_at,
        scheduled_start_at,
        running_at,
        completed_at,
        completion_retention,
        journal_retention,
        retry_count,
        last_start_at,
        next_retry_at,
        last_attempt_deployment_id,
        last_attempt_server,
        last_failure,
        last_failure_error_code,
        status,
        completion_result,
        completion_failure,
        last_awaiting_on_future_json,
        suspended_waiting_for_completions,
        suspended_waiting_for_signals,
        suspended_waiting_future_json,
        scope,
        vqueue_id,
        limit_key
              FROM sys_invocation i
              WHERE i.id IN ('inv-live')
                AND i.target_service_name IN ('myService')",
          "SELECT
                v.entry_id,
                v.vqueue_id,
                v.stage,
                v.status,
                v.next_at,
                v.created_at,
                v.transitioned_at,
                v.first_attempt_at,
                v.latest_attempt_at,
                v.first_runnable_at,
                v.retry_attempts,
                v.num_attempts,
                v.num_errors,
                v.deployment
              FROM sys_vqueue_entry_status v
              WHERE v.entry_id IN ('inv-live')
                AND v.entry_kind = 'invocation'
              ORDER BY v.transitioned_at DESC NULLS LAST",
        ]
      `);
    });

    it('uses VQueue metadata columns for granular scope and limit-key filters', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'backing-off',
          },
          {
            field: 'scope',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'global',
          },
          {
            field: 'limit_key',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'tenant-a',
          },
        ],
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.id IN (
                SELECT vm.id
                FROM sys_vqueue_meta vm
                WHERE vm.scope = 'global'
                  AND vm.limit_key = 'tenant-a'
                  AND (vm.num_inbox > 0)
                LIMIT 100000
              )
                AND v.entry_kind = 'invocation'
                AND v.stage = 'inbox'
                AND (v.stage = 'inbox' AND v.status IN ('backing-off'))
              LIMIT 250",
          "SELECT
                COUNT(1) AS queue_count
              FROM (
                SELECT vm.id
                FROM sys_vqueue_meta vm
                WHERE vm.scope = 'global'
                  AND vm.limit_key = 'tenant-a'
                  AND (vm.num_inbox > 0)
                LIMIT 100001
              ) limited_service_queues",
        ]
      `);
    });

    it('rejects transitioned_at when invocation filters require status refinement', async () => {
      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'backing-off',
          },
          {
            field: 'target_handler_name',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'longPass',
          },
        ],
        sort: { field: 'transitioned_at', order: 'DESC' },
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message:
          'transitioned_at cannot be combined with invocation-status-owned filters',
      });
      expect(sql).toEqual([]);
    });

    it('bounds invocation-status candidates before refining VQueue-only statuses', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['running', 'backing-off'],
          },
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['myService'],
          },
          {
            field: 'target_handler_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['longPass'],
          },
          {
            field: 'scope',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'global',
          },
        ],
        sort: { field: 'modified_at', order: 'DESC' },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE ss.status IN ('invoked')
                AND ss.target_service_name IN ('myService')
                AND ss.target_handler_name IN ('longPass')
                AND ss.scope = 'global'
              ORDER BY ss.modified_at DESC NULLS LAST
              LIMIT 500",
        ]
      `);
    });

    it('reports a full invocation-status candidate set as partial without pagination', async () => {
      setResponder((statement) =>
        statement.startsWith('SELECT ss.id AS id')
          ? Array.from({ length: 500 }, (_, index) => ({
              id: `inv-${index}`,
            }))
          : [],
      );

      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'backing-off',
          },
          {
            field: 'target_handler_name',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'longPass',
          },
        ],
      });

      expect(await response.json()).toEqual({
        rows: [],
        limit: 250,
        mode: 'exact',
        isPartial: true,
        partial: {
          reason: 'candidate-limit',
          candidateLimit: 500,
        },
      });
    });

    it('does not invent a durable-status predicate for yielded refinement', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'yielded',
          },
          {
            field: 'target_handler_name',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'longPass',
          },
        ],
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE ss.target_handler_name = 'longPass'
              LIMIT 500",
        ]
      `);
    });

    it('uses one invocation-status stream when modified_at owns the order', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['succeeded', 'backing-off'],
          },
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['myService'],
          },
        ],
        sort: { field: 'modified_at', order: 'DESC' },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE ss.status IN ('invoked', 'completed')
                AND ss.target_service_name IN ('myService')
              ORDER BY ss.modified_at DESC NULLS LAST
              LIMIT 500",
        ]
      `);
    });

    it('queries mixed live and terminal statuses from complete VQueues', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['succeeded', 'pending', 'backing-off'],
          },
        ],
        sort: { field: 'created_at', order: 'DESC' },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
                AND v.stage IN ('inbox', 'finished')
                AND ((v.stage = 'inbox' AND v.status IN ('new', 'backing-off')) OR (v.stage = 'finished' AND v.status IN ('succeeded')))
              ORDER BY v.created_at DESC NULLS LAST
              LIMIT 250",
        ]
      `);
    });

    it('plans terminal and live migration queries by physical source', async () => {
      await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['succeeded', 'pending', 'backing-off'],
            },
          ],
          sort: { field: 'created_at', order: 'DESC' },
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE (ss.status = 'completed' AND ss.completion_result = 'success')
              ORDER BY ss.created_at DESC NULLS LAST
              LIMIT 250",
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
                AND v.stage = 'inbox'
                AND (v.stage = 'inbox' AND v.status IN ('new', 'backing-off'))
              ORDER BY v.created_at DESC NULLS LAST
              LIMIT 250",
        ]
      `);
    });

    it('orders parallel migration candidates during hydration', async () => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_invocation_status ss')) {
          return [{ id: 'inv-finished' }];
        }
        if (statement.includes('FROM sys_vqueues v')) {
          return [{ id: 'inv-live' }];
        }
        if (statement.includes('FROM sys_invocation i')) {
          return [
            rawInvocation('inv-live', { status: 'ready' }),
            rawInvocation('inv-finished', {
              status: 'completed',
              completion_result: 'success',
            }),
          ];
        }
        return [
          {
            entry_id: 'inv-live',
            stage: 'inbox',
            status: 'backing-off',
          },
        ];
      });

      const response = await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['succeeded', 'backing-off'],
            },
          ],
          sort: { field: 'created_at', order: 'DESC' },
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(
        (await response.json()).rows.map((row: { id: string }) => row.id),
      ).toEqual(['inv-live', 'inv-finished']);
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE (ss.status = 'completed' AND ss.completion_result = 'success')
              ORDER BY ss.created_at DESC NULLS LAST
              LIMIT 250",
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
                AND v.stage = 'inbox'
                AND (v.stage = 'inbox' AND v.status IN ('backing-off'))
              ORDER BY v.created_at DESC NULLS LAST
              LIMIT 250",
          "SELECT
                id,
        target,
        target_service_name,
        target_service_key,
        target_handler_name,
        target_service_ty,
        idempotency_key,
        invoked_by,
        invoked_by_id,
        invoked_by_subscription_id,
        invoked_by_target,
        restarted_from,
        pinned_deployment_id,
        pinned_service_protocol_version,
        journal_size,
        journal_commands_size,
        created_at,
        modified_at,
        inboxed_at,
        scheduled_at,
        scheduled_start_at,
        running_at,
        completed_at,
        completion_retention,
        journal_retention,
        retry_count,
        last_start_at,
        next_retry_at,
        last_attempt_deployment_id,
        last_attempt_server,
        last_failure,
        last_failure_error_code,
        status,
        completion_result,
        completion_failure,
        last_awaiting_on_future_json,
        suspended_waiting_for_completions,
        suspended_waiting_for_signals,
        suspended_waiting_future_json,
        scope,
        vqueue_id,
        limit_key
              FROM sys_invocation i
              WHERE i.id IN ('inv-finished', 'inv-live')
              ORDER BY i.created_at DESC NULLS LAST",
          "SELECT
                v.entry_id,
                v.vqueue_id,
                v.stage,
                v.status,
                v.next_at,
                v.created_at,
                v.transitioned_at,
                v.first_attempt_at,
                v.latest_attempt_at,
                v.first_runnable_at,
                v.retry_attempts,
                v.num_attempts,
                v.num_errors,
                v.deployment
              FROM sys_vqueue_entry_status v
              WHERE v.entry_id IN ('inv-finished', 'inv-live')
                AND v.entry_kind = 'invocation'",
        ]
      `);
    });

    it('uses the normal VQueue plan for live-only statuses during migration', async () => {
      await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['pending', 'backing-off'],
            },
          ],
          sort: { field: 'created_at', order: 'DESC' },
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
                AND v.stage = 'inbox'
                AND (v.stage = 'inbox' AND v.status IN ('new', 'backing-off'))
              ORDER BY v.created_at DESC NULLS LAST
              LIMIT 250",
        ]
      `);
    });

    it('uses one status query when migration statuses need no VQueue refinement', async () => {
      await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['succeeded', 'pending'],
            },
            {
              field: 'target_service_name',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['myService'],
            },
          ],
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE (ss.status = 'inboxed' OR (ss.status = 'completed' AND ss.completion_result = 'success'))
                AND ss.target_service_name IN ('myService')
              LIMIT 250",
        ]
      `);
    });

    it('uses the composite stream when modified_at cannot merge live and terminal sources', async () => {
      await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['succeeded', 'backing-off'],
            },
            {
              field: 'target_service_name',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['myService'],
            },
          ],
          sort: { field: 'modified_at', order: 'DESC' },
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE ss.status IN ('invoked', 'completed')
                AND ss.target_service_name IN ('myService')
              ORDER BY ss.modified_at DESC NULLS LAST
              LIMIT 500",
        ]
      `);
    });

    it('rejects transitioned_at when migration omitted terminal VQueue rows', async () => {
      const response = await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['succeeded', 'backing-off'],
            },
          ],
          sort: { field: 'transitioned_at', order: 'DESC' },
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message:
          'transitioned_at cannot sort terminal invocations when VQueue migration skipped completed rows',
      });
      expect(sql).toEqual([]);
    });

    it('uses invocation status for completed rows when migration skipped VQueue completion', async () => {
      await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING',
              operation: 'EQUALS',
              value: 'succeeded',
            },
          ],
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE (ss.status = 'completed' AND ss.completion_result = 'success')
              LIMIT 250",
        ]
      `);
    });

    it('uses invocation status when no status filter is supplied', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['myService'],
          },
        ],
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE ss.target_service_name IN ('myService')
              LIMIT 250",
        ]
      `);
    });

    it('queries the All shortcut from VQueues', async () => {
      await post('/v2/invocations', {});

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
              LIMIT 250",
        ]
      `);
    });

    it('lets SQL resolve contradictory status filters', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'pending',
          },
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'failed',
          },
        ],
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
                AND FALSE
              LIMIT 250",
        ]
      `);
    });

    it('keeps contradictory service filters in the query', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'target_service_name',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'service-a',
          },
          {
            field: 'target_service_name',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'service-b',
          },
        ],
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE ss.target_service_name = 'service-a'
                AND ss.target_service_name = 'service-b'
              LIMIT 250",
        ]
      `);
    });

    it('does not add a status predicate for an unfiltered transitioned_at sort', async () => {
      await post('/v2/invocations', {
        sort: { field: 'transitioned_at', order: 'DESC' },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM sys_vqueues v
              WHERE v.entry_kind = 'invocation'
              ORDER BY v.transitioned_at DESC NULLS LAST
              LIMIT 250",
        ]
      `);
    });

    it('skips candidate scans for a bounded id list and runs both point reads', async () => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_invocation i')) {
          return [rawInvocation('inv-a'), rawInvocation('inv-b')];
        }
        return [
          {
            entry_id: 'inv-b',
            stage: 'inbox',
            status: 'backing-off',
            transitioned_at: '2026-01-01T00:00:02.000Z',
            num_errors: 3,
          },
          {
            entry_id: 'inv-a',
            stage: 'running',
            status: 'started',
            transitioned_at: '2026-01-01T00:00:01.000Z',
          },
        ];
      });

      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'id',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['inv-a', 'inv-b'],
          },
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['running', 'backing-off'],
          },
        ],
        sort: { field: 'transitioned_at', order: 'DESC' },
      });

      expect(
        (await response.json()).rows.map((row: { id: string }) => row.id),
      ).toEqual(['inv-b', 'inv-a']);
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                id,
        target,
        target_service_name,
        target_service_key,
        target_handler_name,
        target_service_ty,
        idempotency_key,
        invoked_by,
        invoked_by_id,
        invoked_by_subscription_id,
        invoked_by_target,
        restarted_from,
        pinned_deployment_id,
        pinned_service_protocol_version,
        journal_size,
        journal_commands_size,
        created_at,
        modified_at,
        inboxed_at,
        scheduled_at,
        scheduled_start_at,
        running_at,
        completed_at,
        completion_retention,
        journal_retention,
        retry_count,
        last_start_at,
        next_retry_at,
        last_attempt_deployment_id,
        last_attempt_server,
        last_failure,
        last_failure_error_code,
        status,
        completion_result,
        completion_failure,
        last_awaiting_on_future_json,
        suspended_waiting_for_completions,
        suspended_waiting_for_signals,
        suspended_waiting_future_json,
        scope,
        vqueue_id,
        limit_key
              FROM sys_invocation i
              WHERE i.id IN ('inv-a', 'inv-b')",
          "SELECT
                v.entry_id,
                v.vqueue_id,
                v.stage,
                v.status,
                v.next_at,
                v.created_at,
                v.transitioned_at,
                v.first_attempt_at,
                v.latest_attempt_at,
                v.first_runnable_at,
                v.retry_attempts,
                v.num_attempts,
                v.num_errors,
                v.deployment
              FROM sys_vqueue_entry_status v
              WHERE v.entry_id IN ('inv-a', 'inv-b')
                AND v.entry_kind = 'invocation'
              ORDER BY v.transitioned_at DESC NULLS LAST",
        ]
      `);
    });

    it('intersects every exact id filter before point lookup', async () => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_invocation i')) {
          return [rawInvocation('inv-b')];
        }
        return [
          {
            entry_id: 'inv-b',
            stage: 'inbox',
            status: 'started',
          },
        ];
      });

      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'id',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['inv-a', 'inv-b'],
          },
          {
            field: 'id',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['inv-b', 'inv-c'],
          },
        ],
      });

      expect(
        (await response.json()).rows.map((row: { id: string }) => row.id),
      ).toEqual(['inv-b']);
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                id,
        target,
        target_service_name,
        target_service_key,
        target_handler_name,
        target_service_ty,
        idempotency_key,
        invoked_by,
        invoked_by_id,
        invoked_by_subscription_id,
        invoked_by_target,
        restarted_from,
        pinned_deployment_id,
        pinned_service_protocol_version,
        journal_size,
        journal_commands_size,
        created_at,
        modified_at,
        inboxed_at,
        scheduled_at,
        scheduled_start_at,
        running_at,
        completed_at,
        completion_retention,
        journal_retention,
        retry_count,
        last_start_at,
        next_retry_at,
        last_attempt_deployment_id,
        last_attempt_server,
        last_failure,
        last_failure_error_code,
        status,
        completion_result,
        completion_failure,
        last_awaiting_on_future_json,
        suspended_waiting_for_completions,
        suspended_waiting_for_signals,
        suspended_waiting_future_json,
        scope,
        vqueue_id,
        limit_key
              FROM sys_invocation i
              WHERE i.id IN ('inv-b')",
          "SELECT
                v.entry_id,
                v.vqueue_id,
                v.stage,
                v.status,
                v.next_at,
                v.created_at,
                v.transitioned_at,
                v.first_attempt_at,
                v.latest_attempt_at,
                v.first_runnable_at,
                v.retry_attempts,
                v.num_attempts,
                v.num_errors,
                v.deployment
              FROM sys_vqueue_entry_status v
              WHERE v.entry_id IN ('inv-b')
                AND v.entry_kind = 'invocation'",
        ]
      `);
    });

    it('revalidates mixed direct ids against both status classes', async () => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_vqueue_entry_status v')) {
          return [
            {
              entry_id: 'inv-live',
              stage: 'inbox',
              status: 'yielded',
              deployment: 'dep-live',
            },
          ];
        }
        return [rawInvocation('inv-live', { status: 'ready' })];
      });

      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'id',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'inv-live',
          },
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['failed', 'yielded'],
          },
          {
            field: 'deployment',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'dep-live',
          },
        ],
      });

      expect(await response.json()).toMatchObject({
        rows: [{ id: 'inv-live', status: 'yielded' }],
      });
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                id,
        target,
        target_service_name,
        target_service_key,
        target_handler_name,
        target_service_ty,
        idempotency_key,
        invoked_by,
        invoked_by_id,
        invoked_by_subscription_id,
        invoked_by_target,
        restarted_from,
        pinned_deployment_id,
        pinned_service_protocol_version,
        journal_size,
        journal_commands_size,
        created_at,
        modified_at,
        inboxed_at,
        scheduled_at,
        scheduled_start_at,
        running_at,
        completed_at,
        completion_retention,
        journal_retention,
        retry_count,
        last_start_at,
        next_retry_at,
        last_attempt_deployment_id,
        last_attempt_server,
        last_failure,
        last_failure_error_code,
        status,
        completion_result,
        completion_failure,
        last_awaiting_on_future_json,
        suspended_waiting_for_completions,
        suspended_waiting_for_signals,
        suspended_waiting_future_json,
        scope,
        vqueue_id,
        limit_key
              FROM sys_invocation i
              WHERE i.id IN ('inv-live')
                AND i.pinned_deployment_id = 'dep-live'",
          "SELECT
                v.entry_id,
                v.vqueue_id,
                v.stage,
                v.status,
                v.next_at,
                v.created_at,
                v.transitioned_at,
                v.first_attempt_at,
                v.latest_attempt_at,
                v.first_runnable_at,
                v.retry_attempts,
                v.num_attempts,
                v.num_errors,
                v.deployment
              FROM sys_vqueue_entry_status v
              WHERE v.entry_id IN ('inv-live')
                AND v.entry_kind = 'invocation'
                AND v.deployment = 'dep-live'",
        ]
      `);
    });

    it('keeps a migrated direct-id row when its VQueue overlay is unavailable', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_entry_status v')
          ? []
          : [rawInvocation('inv-live', { vqueue_id: 'vq-live' })],
      );

      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'id',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'inv-live',
          },
        ],
      });

      expect(await response.json()).toMatchObject({
        rows: [{ id: 'inv-live', status: 'ready' }],
      });
    });

    it('keeps overlay-less direct ids after rows ordered by a VQueue field', async () => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_vqueue_entry_status v')) {
          return [
            {
              entry_id: 'inv-live',
              stage: 'running',
              status: 'running',
              transitioned_at: '2026-01-01T00:00:02.000Z',
            },
          ];
        }
        return [
          rawInvocation('inv-terminal', {
            status: 'completed',
            completion_result: 'success',
            completed_at: '2026-01-01T00:00:01.000Z',
          }),
          rawInvocation('inv-live'),
        ];
      });

      const response = await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'id',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['inv-terminal', 'inv-live'],
            },
          ],
          sort: { field: 'transitioned_at', order: 'DESC' },
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(
        (await response.json()).rows.map(
          (row: { id: string; status: string }) => [row.id, row.status],
        ),
      ).toEqual([
        ['inv-live', 'running'],
        ['inv-terminal', 'succeeded'],
      ]);
    });

    it('uses one modified_at-ordered stream and point-refines its statuses', async () => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_invocation_status ss')) {
          return [{ id: 'inv-live' }, { id: 'inv-finished' }];
        }
        if (statement.includes('FROM sys_invocation i')) {
          return [
            rawInvocation('inv-live', {
              status: 'ready',
              modified_at: '2026-01-01T00:00:04.000Z',
            }),
            rawInvocation('inv-finished', {
              status: 'completed',
              completion_result: 'success',
              modified_at: '2026-01-01T00:00:03.000Z',
            }),
          ];
        }
        return [
          {
            entry_id: 'inv-live',
            stage: 'inbox',
            status: 'backing-off',
          },
        ];
      });

      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['succeeded', 'backing-off'],
          },
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['Greeter'],
          },
        ],
        sort: { field: 'modified_at', order: 'DESC' },
      });
      const body = await response.json();

      expect(body.rows.map((row: { id: string }) => row.id)).toEqual([
        'inv-live',
        'inv-finished',
      ]);
      expect(body.rows.map((row: { status: string }) => row.status)).toEqual([
        'backing-off',
        'succeeded',
      ]);
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              WHERE ss.status IN ('invoked', 'completed')
                AND ss.target_service_name IN ('Greeter')
              ORDER BY ss.modified_at DESC NULLS LAST
              LIMIT 500",
          "SELECT
                id,
        target,
        target_service_name,
        target_service_key,
        target_handler_name,
        target_service_ty,
        idempotency_key,
        invoked_by,
        invoked_by_id,
        invoked_by_subscription_id,
        invoked_by_target,
        restarted_from,
        pinned_deployment_id,
        pinned_service_protocol_version,
        journal_size,
        journal_commands_size,
        created_at,
        modified_at,
        inboxed_at,
        scheduled_at,
        scheduled_start_at,
        running_at,
        completed_at,
        completion_retention,
        journal_retention,
        retry_count,
        last_start_at,
        next_retry_at,
        last_attempt_deployment_id,
        last_attempt_server,
        last_failure,
        last_failure_error_code,
        status,
        completion_result,
        completion_failure,
        last_awaiting_on_future_json,
        suspended_waiting_for_completions,
        suspended_waiting_for_signals,
        suspended_waiting_future_json,
        scope,
        vqueue_id,
        limit_key
              FROM sys_invocation i
              WHERE i.id IN ('inv-live', 'inv-finished')
                AND i.target_service_name IN ('Greeter')
              ORDER BY i.modified_at DESC NULLS LAST",
          "SELECT
                v.entry_id,
                v.vqueue_id,
                v.stage,
                v.status,
                v.next_at,
                v.created_at,
                v.transitioned_at,
                v.first_attempt_at,
                v.latest_attempt_at,
                v.first_runnable_at,
                v.retry_attempts,
                v.num_attempts,
                v.num_errors,
                v.deployment
              FROM sys_vqueue_entry_status v
              WHERE v.entry_id IN ('inv-live', 'inv-finished')
                AND v.entry_kind = 'invocation'",
        ]
      `);
    });

    it('drops an invoked candidate whose point lookup changed status', async () => {
      setResponder((statement) => {
        if (statement.includes('LIMIT 250')) return [{ id: 'inv-a' }];
        if (statement.includes('FROM sys_invocation i')) {
          return [rawInvocation('inv-a', { status: 'paused' })];
        }
        return [{ entry_id: 'inv-a', stage: 'paused', status: 'started' }];
      });

      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'running',
          },
        ],
      });

      expect((await response.json()).rows).toEqual([]);
    });
  });

  describe('VQueue sampled', () => {
    it('samples invocation status before durable predicates', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'failed',
          },
          {
            field: 'scope',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'global',
          },
        ],
        sort: { field: 'modified_at', order: 'DESC' },
        mode: { type: 'sampled', sampleSize: 50000 },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM (
                  SELECT
                    id,
                    scope,
                    status,
                    completion_result,
                    completion_failure,
                    modified_at
                  FROM sys_invocation_status
                  LIMIT 50000
                ) ss
              WHERE (ss.status = 'completed' AND ss.completion_result = 'failure' AND COALESCE(LOWER(ss.completion_failure), '') NOT IN ('[409] killed', '[409] canceled', '[409] cancelled'))
                AND ss.scope = 'global'
              ORDER BY ss.modified_at DESC NULLS LAST
              LIMIT 250",
        ]
      `);
    });

    it('samples VQueues before invoked predicates', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['running', 'ready'],
          },
        ],
        mode: { type: 'sampled', sampleSize: 50000 },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM (
                  SELECT
                    entry_id,
                    entry_kind,
                    stage,
                    status
                  FROM sys_vqueues
                  LIMIT 50000
                ) v
              WHERE v.entry_kind = 'invocation'
                AND v.stage IN ('inbox', 'running')
                AND ((v.stage = 'inbox' AND v.status IN ('started')) OR v.stage = 'running')
              LIMIT 250",
        ]
      `);
    });

    it('samples invocation status before VQueue status refinement', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'backing-off',
          },
          {
            field: 'target_handler_name',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'longPass',
          },
        ],
        sort: { field: 'created_at', order: 'DESC' },
        mode: { type: 'sampled', sampleSize: 50000 },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM (
                  SELECT
                    id,
                    status,
                    target_handler_name,
                    created_at
                  FROM sys_invocation_status
                  LIMIT 50000
                ) ss
              WHERE ss.status IN ('invoked')
                AND ss.target_handler_name = 'longPass'
              ORDER BY ss.created_at DESC NULLS LAST
              LIMIT 500",
        ]
      `);
    });

    it('bounds the VQueue side before the sampled service semi-join', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'backing-off',
          },
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['myService'],
          },
        ],
        mode: { type: 'sampled', sampleSize: 50000 },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM (
                  SELECT
                    id,
                    entry_id,
                    entry_kind,
                    stage,
                    status
                  FROM sys_vqueues
                  LIMIT 50000
                ) v
              WHERE v.id IN (
                SELECT vm.id
                FROM sys_vqueue_meta vm
                WHERE vm.service_name IN ('myService')
                  AND (vm.num_inbox > 0)
                LIMIT 100000
              )
                AND v.entry_kind = 'invocation'
                AND v.stage = 'inbox'
                AND (v.stage = 'inbox' AND v.status IN ('backing-off'))
              LIMIT 250",
        ]
      `);
    });

    it('samples one VQueue branch for mixed live statuses and service', async () => {
      await post('/v2/invocations', {
        filters: [
          {
            field: 'status',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['paused', 'yielded'],
          },
          {
            field: 'target_service_name',
            type: 'STRING_LIST',
            operation: 'IN',
            value: ['myService'],
          },
        ],
        sort: { field: 'created_at', order: 'DESC' },
        mode: { type: 'sampled', sampleSize: 1000 },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.entry_id AS id
              FROM (
                  SELECT
                    id,
                    entry_id,
                    entry_kind,
                    stage,
                    status,
                    created_at
                  FROM sys_vqueues
                  LIMIT 1000
                ) v
              WHERE v.id IN (
                SELECT vm.id
                FROM sys_vqueue_meta vm
                WHERE vm.service_name IN ('myService')
                  AND (vm.num_inbox > 0 OR vm.num_paused > 0)
                LIMIT 100000
              )
                AND v.entry_kind = 'invocation'
                AND v.stage IN ('inbox', 'paused')
                AND ((v.stage = 'inbox' AND v.status IN ('yielded')) OR v.stage = 'paused')
              ORDER BY v.created_at DESC NULLS LAST
              LIMIT 250",
        ]
      `);
    });
  });

  describe('without VQueues exact', () => {
    it('revalidates status during the invocation point lookup', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_status ss')
          ? [{ id: 'inv-a' }]
          : [],
      );

      const response = await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['ready', 'paused'],
            },
          ],
        },
        NO_VQUEUE_HEADERS,
      );

      expect(await response.json()).toMatchObject({ rows: [] });
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              LEFT JOIN (
                SELECT
                  id AS state_id,
                  in_flight,
                  retry_count
                FROM sys_invocation_state
              ) sis
                ON sis.state_id = ss.id
              WHERE ss.status IN ('invoked', 'paused') AND ((ss.status = 'invoked' AND sis.in_flight IS NOT TRUE AND COALESCE(sis.retry_count, 0) = 0) OR (ss.status = 'paused'))
              LIMIT 250",
          "SELECT
                id,
        target,
        target_service_name,
        target_service_key,
        target_handler_name,
        target_service_ty,
        idempotency_key,
        invoked_by,
        invoked_by_id,
        invoked_by_subscription_id,
        invoked_by_target,
        restarted_from,
        pinned_deployment_id,
        pinned_service_protocol_version,
        journal_size,
        journal_commands_size,
        created_at,
        modified_at,
        inboxed_at,
        scheduled_at,
        scheduled_start_at,
        running_at,
        completed_at,
        completion_retention,
        journal_retention,
        retry_count,
        last_start_at,
        next_retry_at,
        last_attempt_deployment_id,
        last_attempt_server,
        last_failure,
        last_failure_error_code,
        status,
        completion_result,
        completion_failure,
        last_awaiting_on_future_json,
        suspended_waiting_for_completions,
        suspended_waiting_for_signals,
        suspended_waiting_future_json
              FROM sys_invocation i
              WHERE i.id IN ('inv-a')
                AND ((i.status = 'ready') OR (i.status = 'paused'))",
        ]
      `);
    });

    it('rejects scope and limit key when VQueues are unavailable', async () => {
      const response = await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'target_service_name',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['myService'],
            },
            {
              field: 'scope',
              type: 'STRING',
              operation: 'EQUALS',
              value: 'global',
            },
            {
              field: 'limit_key',
              type: 'STRING',
              operation: 'IS NULL',
            },
          ],
          sort: { field: 'modified_at', order: 'DESC' },
        },
        NO_VQUEUE_HEADERS,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'scope is not available on this Restate server',
      });
      expect(sql).toEqual([]);
    });

    it('uses invocation state for an unsorted running/backing-off request', async () => {
      await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['running', 'backing-off'],
            },
          ],
        },
        NO_VQUEUE_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id
              FROM sys_invocation_state
              LIMIT 250",
        ]
      `);
    });

    it('joins invocation state when ready is combined with service filtering', async () => {
      await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING',
              operation: 'EQUALS',
              value: 'ready',
            },
            {
              field: 'target_service_name',
              type: 'STRING_LIST',
              operation: 'IN',
              value: ['myService'],
            },
          ],
        },
        NO_VQUEUE_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.id AS id
              FROM sys_invocation_status ss
              LEFT JOIN (
                SELECT
                  id AS state_id,
                  in_flight,
                  retry_count
                FROM sys_invocation_state
              ) sis
                ON sis.state_id = ss.id
              WHERE ss.status IN ('invoked') AND ((ss.status = 'invoked' AND sis.in_flight IS NOT TRUE AND COALESCE(sis.retry_count, 0) = 0)) AND ss.target_service_name IN ('myService')
              LIMIT 250",
        ]
      `);
    });
  });

  describe('without VQueues sampled', () => {
    it('samples invocation status before filtering', async () => {
      await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING',
              operation: 'EQUALS',
              value: 'paused',
            },
          ],
          mode: { type: 'sampled', sampleSize: 1000 },
        },
        NO_VQUEUE_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                  ss.id AS id
                FROM (
                  SELECT
                    id, status
                  FROM sys_invocation_status
                  LIMIT 1000
                ) ss
                WHERE ss.status IN ('paused') AND ((ss.status = 'paused'))
                LIMIT 250",
        ]
      `);
    });

    it('keeps the small state-only shortcut exact in sampled mode', async () => {
      const response = await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'status',
              type: 'STRING',
              operation: 'EQUALS',
              value: 'backing-off',
            },
          ],
          mode: { type: 'sampled', sampleSize: 1000 },
        },
        NO_VQUEUE_HEADERS,
      );

      expect((await response.json()).isPartial).toBe(true);
      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT id
              FROM sys_invocation_state
              WHERE in_flight IS NOT TRUE
              LIMIT 250",
        ]
      `);
    });
  });

  describe('contract errors', () => {
    it('rejects samples above one million before querying', async () => {
      const response = await post('/v2/invocations', {
        mode: { type: 'sampled', sampleSize: 1_000_001 },
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'mode.sampleSize must be at most 1000000',
      });
      expect(sql).toEqual([]);
    });

    it('rejects transitioned_at before the VQueue list version', async () => {
      const response = await post(
        '/v2/invocations',
        { sort: { field: 'transitioned_at', order: 'DESC' } },
        {
          'content-type': 'application/json',
          'x-restate-version': '1.7.1',
          'x-restate-features': 'vqueues,protocol_v7',
        },
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'transitioned_at is not available on this Restate server',
      });
      expect(sql).toEqual([]);
    });

    it('rejects fields introduced after the server version', async () => {
      const response = await post(
        '/v2/invocations',
        {
          filters: [
            {
              field: 'scope',
              type: 'STRING',
              operation: 'EQUALS',
              value: 'global',
            },
          ],
        },
        {
          'content-type': 'application/json',
          'x-restate-version': '1.6.2',
          'x-restate-features': 'vqueues,protocol_v7',
        },
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'scope is not available on this Restate server',
      });
      expect(sql).toEqual([]);
    });

    it('rejects non-point id filters', async () => {
      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'id',
            type: 'STRING',
            operation: 'CONTAINS',
            value: 'inv',
          },
        ],
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'id supports only STRING EQUALS or STRING_LIST IN filters',
      });
      expect(sql).toEqual([]);
    });

    it('rejects first_runnable_at as a sort', async () => {
      const response = await post('/v2/invocations', {
        sort: { field: 'first_runnable_at', order: 'ASC' },
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'Unsupported invocation sort field: first_runnable_at',
      });
      expect(sql).toEqual([]);
    });

    it('rejects scheduled_start_at as a sort', async () => {
      const response = await post('/v2/invocations', {
        sort: { field: 'scheduled_start_at', order: 'ASC' },
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'Unsupported invocation sort field: scheduled_start_at',
      });
      expect(sql).toEqual([]);
    });

    it('rejects first_runnable_at as a filter', async () => {
      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'first_runnable_at',
            type: 'DATE',
            operation: 'AFTER',
            value: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'Unsupported invocation filter field: first_runnable_at',
      });
      expect(sql).toEqual([]);
    });

    it('rejects scheduled_start_at as a filter', async () => {
      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'scheduled_start_at',
            type: 'DATE',
            operation: 'AFTER',
            value: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'Unsupported invocation filter field: scheduled_start_at',
      });
      expect(sql).toEqual([]);
    });

    it('rejects num_errors as a sort', async () => {
      const response = await post('/v2/invocations', {
        sort: { field: 'num_errors', order: 'DESC' },
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'Unsupported invocation sort field: num_errors',
      });
      expect(sql).toEqual([]);
    });

    it('rejects num_errors as a filter', async () => {
      const response = await post('/v2/invocations', {
        filters: [
          {
            field: 'num_errors',
            type: 'NUMBER',
            operation: 'GREATER_THAN',
            value: 0,
          },
        ],
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'Unsupported invocation filter field: num_errors',
      });
      expect(sql).toEqual([]);
    });
  });
});
