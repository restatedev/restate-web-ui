import { describe, expect, it, vi } from 'vitest';
import { listVirtualObjectInstances } from './listVirtualObjectInstances';
import type { QueryContext } from './shared';

function createContext(
  responder: (
    sql: string,
  ) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>,
  features = new Set(['vqueues', 'scoped_virtual_objects']),
) {
  const query = vi.fn(async (sql: string) => ({
    rows: await responder(sql),
  }));
  const context = {
    query,
    features,
    adminApi: vi.fn(),
    baseUrl: '',
    restateVersion: '1.7.0',
  } as unknown as QueryContext;
  return { context, query };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('listVirtualObjectInstances', () => {
  it('force-includes and hydrates a requested candidate', async () => {
    const { context, query } = createContext((sql) => {
      if (sql.includes('SUM(num_inbox) AS backlog')) {
        return [
          {
            lock_name: 'Counter/remembered',
            scope: 'tenant-a',
            backlog: 4,
          },
        ];
      }
      if (sql.includes('FROM sys_locks')) {
        return [
          {
            lock_name: 'Counter/remembered',
            scope: 'tenant-a',
            acquired_by: 'inv_lock',
            acquired_at: '2026-08-28T10:00:00.000Z',
          },
        ];
      }
      return [];
    });

    const response = await listVirtualObjectInstances.call(context, 'Counter', {
      candidates: [{ key: 'remembered', scope: 'tenant-a' }],
    });

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND lock_name IS NOT NULL
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
    LIMIT 51`,
      `SELECT
      lock_name,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND (
        (lock_name = 'Counter/remembered' AND scope = 'tenant-a')
      )
    GROUP BY lock_name, scope`,
      `SELECT
      lock_name,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        (lock_name = 'Counter/remembered' AND scope = 'tenant-a')
      )`,
    ]);
    expect(await response.json()).toEqual({
      rows: [
        {
          key: 'remembered',
          scope: 'tenant-a',
          backlog: 4,
          lockHolder: {
            id: 'inv_lock',
            kind: 'invocation',
            acquiredAt: '2026-08-28T10:00:00.000Z',
          },
        },
      ],
      truncated: false,
    });
  });

  it('does not include a requested candidate that misses the active filter', async () => {
    const { context, query } = createContext(() => []);

    const response = await listVirtualObjectInstances.call(context, 'Counter', {
      candidates: [{ key: 'remembered', scope: 'tenant-a' }],
      filters: [
        {
          field: 'key',
          type: 'STRING',
          operation: 'CONTAINS',
          value: 'other',
        },
      ],
    });

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND status <> 'completed'
      AND target_service_key ILIKE '%other%'
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
      AND SUBSTR(lock_name, CHAR_LENGTH('Counter/') + 1) ILIKE '%other%'
    LIMIT 51`,
    ]);
    expect(await response.json()).toEqual({ rows: [], truncated: false });
  });

  it('uses exact key and scope predicates for active identity sources', async () => {
    const { context, query } = createContext(() => []);

    const response = await listVirtualObjectInstances.call(context, 'Counter', {
      filters: [
        {
          field: 'key',
          type: 'STRING',
          operation: 'EQUALS',
          value: "Customer's",
        },
        {
          field: 'scope',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'Tenant-A',
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND status <> 'completed'
      AND target_service_key = 'Customer''s'
      AND scope = 'Tenant-A'
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
      AND lock_name = 'Counter/Customer''s'
      AND scope = 'Tenant-A'
    LIMIT 51`,
    ]);
  });

  it('uses simple key substring predicates for contains filters', async () => {
    const { context, query } = createContext(() => []);

    const response = await listVirtualObjectInstances.call(context, 'Counter', {
      filters: [
        {
          field: 'key',
          type: 'STRING',
          operation: 'CONTAINS',
          value: "Customer's",
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND status <> 'completed'
      AND target_service_key ILIKE '%Customer''s%'
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
      AND SUBSTR(lock_name, CHAR_LENGTH('Counter/') + 1) ILIKE '%Customer''s%'
    LIMIT 51`,
    ]);
  });

  it('uses an exact key and null scope to select an unscoped partition', async () => {
    const { context, query } = createContext(
      (sql) => {
        if (sql.includes('SUM(num_inbox)') || sql.includes('FROM sys_locks')) {
          return [];
        }
        if (sql.includes('FROM sys_invocation_status')) {
          return [{ partition_key: '7', object_key: 'hot-object-0' }];
        }
        return [];
      },
      new Set(['vqueues']),
    );

    const response = await listVirtualObjectInstances.call(context, 'Counter', {
      filters: [
        {
          field: 'key',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'hot-object-0',
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND status <> 'completed'
      AND target_service_key = 'hot-object-0'
      AND scope IS NULL
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
      AND lock_name = 'Counter/hot-object-0'
      AND scope IS NULL
    LIMIT 51`,
      `SELECT
      lock_name,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE partition_key IN (7)
      AND service_name = 'Counter'
      AND (
        (lock_name = 'Counter/hot-object-0' AND scope IS NULL)
      )
    GROUP BY lock_name, scope`,
      `SELECT
      lock_name,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        (lock_name = 'Counter/hot-object-0' AND scope IS NULL)
      )`,
    ]);
    expect(await response.json()).toEqual({
      rows: [{ key: 'hot-object-0', backlog: 0 }],
      truncated: false,
    });
  });

  it('rejects scope filters when scoped identities are unavailable', async () => {
    const { context, query } = createContext(() => [], new Set(['vqueues']));

    const response = await listVirtualObjectInstances.call(context, 'Counter', {
      filters: [
        {
          field: 'scope',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'tenant-a',
        },
      ],
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Unsupported filter field: scope');
    expect(query).not.toHaveBeenCalled();
  });

  it('uses active invocation identities for vqueue servers', async () => {
    const { context, query } = createContext((sql) => {
      if (sql.includes('SUM(num_inbox) AS backlog')) {
        return [
          {
            lock_name: "Counter's/both",
            scope: 'tenant-a',
            backlog: 3,
          },
          {
            lock_name: "Counter's/mutation-only",
            scope: 'tenant-b',
            backlog: 4,
          },
        ];
      }
      if (sql.includes('FROM sys_locks')) {
        return [
          {
            lock_name: "Counter's/both",
            scope: 'tenant-a',
            acquired_by: 'inv_lock-holder',
            acquired_at: '2026-07-25T12:00:00.000Z',
          },
        ];
      }
      return [
        {
          partition_key: '1',
          object_key: 'both',
          scope: 'tenant-a',
        },
        {
          partition_key: '3',
          object_key: 'shared-only',
          scope: 'tenant-c',
        },
      ];
    });

    const response = await listVirtualObjectInstances.call(
      context,
      "Counter's",
      { search: "o'hare%_!\\path" },
    );

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter''s'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
      AND (target_service_key LIKE '%o''hare\\%\\_!\\\\path%' OR scope LIKE '%o''hare\\%\\_!\\\\path%')
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter''s'
      AND lock_name IS NOT NULL
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
      AND (SUBSTR(lock_name, CHAR_LENGTH('Counter''s/') + 1) LIKE '%o''hare\\%\\_!\\\\path%' OR scope LIKE '%o''hare\\%\\_!\\\\path%')
    LIMIT 51`,
      `SELECT
      lock_name,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE partition_key IN (1, 3)
      AND service_name = 'Counter''s'
      AND (
        (lock_name = 'Counter''s/both' AND scope = 'tenant-a')
        OR (lock_name = 'Counter''s/shared-only' AND scope = 'tenant-c')
      )
    GROUP BY lock_name, scope`,
      `SELECT
      lock_name,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        (lock_name = 'Counter''s/both' AND scope = 'tenant-a')
        OR (lock_name = 'Counter''s/shared-only' AND scope = 'tenant-c')
      )`,
    ]);
    expect(await response.json()).toEqual({
      rows: [
        {
          key: 'both',
          scope: 'tenant-a',
          backlog: 3,
          lockHolder: {
            id: 'inv_lock-holder',
            kind: 'invocation',
            acquiredAt: '2026-07-25T12:00:00.000Z',
          },
        },
        {
          key: 'shared-only',
          scope: 'tenant-c',
          backlog: 0,
        },
      ],
      truncated: false,
    });
  });

  it('uses vqueue identities when that query finishes first', async () => {
    const invocationRows = deferred<Record<string, unknown>[]>();
    const { context, query } = createContext((sql) => {
      if (sql.includes('FROM sys_invocation_status')) {
        return invocationRows.promise;
      }
      if (
        sql.includes('SELECT DISTINCT') &&
        sql.includes('FROM sys_vqueue_meta')
      ) {
        return [{ partition_key: '5', lock_name: 'Counter/vqueue-first' }];
      }
      if (sql.includes('SUM(num_inbox) AS backlog')) {
        return [{ lock_name: 'Counter/vqueue-first', backlog: 2 }];
      }
      return [];
    });

    const response = await listVirtualObjectInstances.call(context, 'Counter');
    invocationRows.resolve([
      { partition_key: '7', object_key: 'invocation-later' },
    ]);

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND lock_name IS NOT NULL
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
    LIMIT 51`,
      `SELECT
      lock_name,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE partition_key IN (5)
      AND service_name = 'Counter'
      AND (
        (lock_name = 'Counter/vqueue-first' AND scope IS NULL)
      )
    GROUP BY lock_name, scope`,
      `SELECT
      lock_name,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        (lock_name = 'Counter/vqueue-first' AND scope IS NULL)
      )`,
    ]);
    expect(await response.json()).toEqual({
      rows: [{ key: 'vqueue-first', backlog: 2 }],
      truncated: false,
    });
  });

  it('preserves partition keys above JavaScript integer precision', async () => {
    const exactPartitionKey = '14239471964036668491';
    const { context, query } = createContext((sql) => {
      if (sql.includes('SUM(num_inbox) AS backlog')) {
        return [{ lock_name: 'Counter/invocation-only', backlog: 1 }];
      }
      if (sql.includes('FROM sys_invocation_status')) {
        return [
          {
            partition_key: exactPartitionKey,
            object_key: 'invocation-only',
          },
        ];
      }
      return [];
    });

    await listVirtualObjectInstances.call(context, 'Counter');

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND lock_name IS NOT NULL
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
    LIMIT 51`,
      `SELECT
      lock_name,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE partition_key IN (${exactPartitionKey})
      AND service_name = 'Counter'
      AND (
        (lock_name = 'Counter/invocation-only' AND scope IS NULL)
      )
    GROUP BY lock_name, scope`,
      `SELECT
      lock_name,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        (lock_name = 'Counter/invocation-only' AND scope IS NULL)
      )`,
    ]);
  });

  it('rejects numeric partition keys from JSON', async () => {
    const { context, query } = createContext((sql) => {
      if (sql.includes('FROM sys_invocation_status')) {
        return [
          {
            partition_key: Number('14239471964036668491'),
            object_key: 'invocation-only',
          },
        ];
      }
      return [];
    });

    await expect(
      listVirtualObjectInstances.call(context, 'Counter'),
    ).rejects.toThrow('Invalid partition key:');

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND lock_name IS NOT NULL
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
    LIMIT 51`,
    ]);
  });

  it('preserves a zero backlog', async () => {
    const { context, query } = createContext((sql) => {
      if (sql.includes('SUM(num_inbox) AS backlog')) {
        return [{ lock_name: 'Counter/invocation-only', backlog: 0 }];
      }
      if (sql.includes('FROM sys_invocation_status')) {
        return [
          {
            partition_key: '7',
            object_key: 'invocation-only',
          },
        ];
      }
      return [];
    });

    const response = await listVirtualObjectInstances.call(context, 'Counter');

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND lock_name IS NOT NULL
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
    LIMIT 51`,
      `SELECT
      lock_name,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE partition_key IN (7)
      AND service_name = 'Counter'
      AND (
        (lock_name = 'Counter/invocation-only' AND scope IS NULL)
      )
    GROUP BY lock_name, scope`,
      `SELECT
      lock_name,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        (lock_name = 'Counter/invocation-only' AND scope IS NULL)
      )`,
    ]);
    expect(await response.json()).toEqual({
      rows: [
        {
          key: 'invocation-only',
          backlog: 0,
        },
      ],
      truncated: false,
    });
  });

  it('uses active invocation identities on servers without vqueues', async () => {
    const { context, query } = createContext((sql) => {
      if (sql.includes('FROM sys_invocation_status')) {
        return [{ object_key: 'invocation-only' }];
      }
      if (sql.includes('FROM sys_inbox')) {
        return [{ object_key: 'invocation-only', backlog: 2 }];
      }
      return [
        {
          object_key: 'invocation-only',
          acquired_by: 'inv_legacy-holder',
        },
      ];
    }, new Set());

    const response = await listVirtualObjectInstances.call(context, 'Counter', {
      search: 'customer',
    });

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      target_service_key AS object_key
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
      AND (target_service_key LIKE '%customer%')
    LIMIT 51`,
      `SELECT
      service_key AS object_key,
      COUNT(*) AS backlog
    FROM sys_inbox
    WHERE service_name = 'Counter'
      AND (
        (service_key = 'invocation-only')
      )
    GROUP BY service_key`,
      `SELECT
      service_key AS object_key,
      invocation_id AS acquired_by
    FROM sys_keyed_service_status
    WHERE service_name = 'Counter'
      AND invocation_id IS NOT NULL
      AND (
        (service_key = 'invocation-only')
      )`,
    ]);
    expect(await response.json()).toEqual({
      rows: [
        {
          key: 'invocation-only',
          backlog: 2,
          lockHolder: {
            id: 'inv_legacy-holder',
            kind: 'invocation',
          },
        },
      ],
      truncated: false,
    });
  });

  it('reports truncation when any discovery source is truncated', async () => {
    const invocationRows = Array.from({ length: 51 }, () => ({
      partition_key: '100',
      object_key: 'shared-only',
    }));
    const { context, query } = createContext((sql) => {
      if (sql.includes('FROM sys_vqueue_meta')) return [];
      if (sql.includes('FROM sys_locks')) return [];
      return invocationRows;
    });

    const response = await listVirtualObjectInstances.call(context, 'Counter');
    const body = await response.json();

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
    LIMIT 51`,
      `SELECT DISTINCT
      CAST(partition_key AS VARCHAR) AS partition_key,
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND lock_name IS NOT NULL
      AND (
        num_inbox > 0
        OR num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
    LIMIT 51`,
      `SELECT
      lock_name,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE partition_key IN (100)
      AND service_name = 'Counter'
      AND (
        (lock_name = 'Counter/shared-only' AND scope IS NULL)
      )
    GROUP BY lock_name, scope`,
      `SELECT
      lock_name,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        (lock_name = 'Counter/shared-only' AND scope IS NULL)
      )`,
    ]);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toEqual({
      key: 'shared-only',
      backlog: 0,
    });
    expect(body.truncated).toBe(true);
  });

  it('sorts by the exact service backlog only when requested', async () => {
    const { context, query } = createContext((sql) => {
      if (
        sql.includes('FROM sys_vqueue_meta') &&
        sql.includes('ORDER BY backlog DESC')
      ) {
        return [
          {
            lock_name: 'Counter/hot',
            scope: 'tenant-a',
            backlog: 80,
          },
          {
            lock_name: 'Counter/warm',
            scope: 'tenant-b',
            backlog: 12,
          },
        ];
      }
      if (sql.includes('FROM sys_vqueue_meta')) {
        return [
          {
            lock_name: 'Counter/warm',
            scope: 'tenant-b',
          },
        ];
      }
      if (sql.includes('FROM sys_invocation_status')) {
        return [{ object_key: 'cold' }];
      }
      return [
        {
          lock_name: 'Counter/hot',
          scope: 'tenant-a',
          acquired_by: 'mut_hot',
        },
      ];
    });

    const response = await listVirtualObjectInstances.call(context, 'Counter', {
      search: 'customer',
      sort: { field: 'backlog', order: 'DESC' },
    });

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
      AND (target_service_key LIKE '%customer%' OR scope LIKE '%customer%')
    LIMIT 51`,
      `SELECT DISTINCT
      lock_name,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND lock_name IS NOT NULL
      AND (
        num_running > 0
        OR num_suspended > 0
        OR num_paused > 0
      )
      AND (SUBSTR(lock_name, CHAR_LENGTH('Counter/') + 1) LIKE '%customer%' OR scope LIKE '%customer%')
    LIMIT 51`,
      `SELECT
      lock_name,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE service_name = 'Counter'
      AND lock_name IS NOT NULL
      AND num_inbox > 0
      AND (SUBSTR(lock_name, CHAR_LENGTH('Counter/') + 1) LIKE '%customer%' OR scope LIKE '%customer%')
    GROUP BY lock_name, scope
    ORDER BY backlog DESC, lock_name ASC, scope ASC NULLS FIRST
    LIMIT 51`,
      `SELECT
      lock_name,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        (lock_name = 'Counter/hot' AND scope = 'tenant-a')
        OR (lock_name = 'Counter/warm' AND scope = 'tenant-b')
        OR (lock_name = 'Counter/cold' AND scope IS NULL)
      )`,
    ]);
    expect(await response.json()).toEqual({
      rows: [
        {
          key: 'hot',
          scope: 'tenant-a',
          backlog: 80,
          lockHolder: { id: 'mut_hot', kind: 'state-mutation' },
        },
        {
          key: 'warm',
          scope: 'tenant-b',
          backlog: 12,
        },
        {
          key: 'cold',
          backlog: 0,
        },
      ],
      truncated: false,
    });
  });

  it('uses the legacy inbox aggregate for an explicit backlog sort', async () => {
    const { context, query } = createContext((sql) => {
      if (sql.includes('FROM sys_inbox')) {
        return [{ object_key: 'hot', backlog: 9 }];
      }
      return [];
    }, new Set());

    const response = await listVirtualObjectInstances.call(context, 'Counter', {
      sort: { field: 'backlog', order: 'DESC' },
    });

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      `SELECT DISTINCT
      target_service_key AS object_key
    FROM sys_invocation_status
    WHERE target_service_name = 'Counter'
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
      AND status <> 'completed'
    LIMIT 51`,
      `SELECT
      service_key AS object_key,
      COUNT(*) AS backlog
    FROM sys_inbox
    WHERE service_name = 'Counter'
    GROUP BY service_key
    ORDER BY backlog DESC, object_key ASC
    LIMIT 51`,
      `SELECT
      service_key AS object_key,
      invocation_id AS acquired_by
    FROM sys_keyed_service_status
    WHERE service_name = 'Counter'
      AND invocation_id IS NOT NULL
      AND (
        (service_key = 'hot')
      )`,
    ]);
    expect(await response.json()).toEqual({
      rows: [
        {
          key: 'hot',
          backlog: 9,
        },
      ],
      truncated: false,
    });
  });
});
