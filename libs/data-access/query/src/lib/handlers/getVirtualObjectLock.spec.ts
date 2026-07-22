import { describe, expect, it, vi } from 'vitest';
import type { QueryContext } from './shared';
import { getVirtualObjectLock } from './getVirtualObjectLock';
import {
  createInvocationV2QueryTestHarness,
  NO_VQUEUE_HEADERS,
} from './invocationsV2/tests/testUtils';

describe('GET /query/virtual-objects/:service/instances/:key/lock', () => {
  const { get, setResponder, sql } = createInvocationV2QueryTestHarness();

  it('returns the invocation currently holding the scoped lock', async () => {
    setResponder(() => [
      {
        acquired_by: 'inv_1lock',
        acquired_at: '2026-07-23T09:00:00.000Z',
      },
    ]);

    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/lock?scope=tenant-a',
    );

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT acquired_by, acquired_at
          FROM sys_locks
          WHERE lock_name = 'Counter/customer-1'
            AND scope = 'tenant-a'
            AND acquired_by IS NOT NULL
          LIMIT 1",
      ]
    `);
    expect(await response.json()).toMatchObject({
      supported: true,
      lockHolder: {
        id: 'inv_1lock',
        kind: 'invocation',
        acquiredAt: '2026-07-23T09:00:00.000Z',
      },
    });
  });

  it('returns a state mutation lock holder without invocation hydration', async () => {
    setResponder(() => [
      {
        acquired_by: 'mut_1sm',
        acquired_at: '2026-07-23T09:05:00.000Z',
      },
    ]);

    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/lock',
    );

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT acquired_by, acquired_at
          FROM sys_locks
          WHERE lock_name = 'Counter/customer-1'
            AND scope IS NULL
            AND acquired_by IS NOT NULL
          LIMIT 1",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      lockHolder: {
        id: 'mut_1sm',
        kind: 'state-mutation',
        acquiredAt: '2026-07-23T09:05:00.000Z',
      },
    });
  });

  it('preserves an unrecognized lock holder kind', async () => {
    setResponder(() => [
      {
        acquired_by: 'migration-holder',
        acquired_at: '2026-07-23T09:10:00.000Z',
      },
    ]);

    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/lock',
    );

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT acquired_by, acquired_at
          FROM sys_locks
          WHERE lock_name = 'Counter/customer-1'
            AND scope IS NULL
            AND acquired_by IS NOT NULL
          LIMIT 1",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      lockHolder: {
        id: 'migration-holder',
        kind: 'other',
        acquiredAt: '2026-07-23T09:10:00.000Z',
      },
    });
  });

  it('uses the legacy keyed service lock for unscoped objects', async () => {
    const query = vi.fn(async (_statement: string) => ({
      rows: [{ invocation_id: 'inv_1legacy' }],
    }));
    const context = {
      query,
      baseUrl: '',
      restateVersion: '1.7.3',
      features: new Set(['protocol_v7']),
    } as unknown as QueryContext;

    const response = await getVirtualObjectLock.call(
      context,
      'Counter',
      'customer-1',
    );

    expect(query.mock.calls.map(([statement]) => statement))
      .toMatchInlineSnapshot(`
        [
          "SELECT invocation_id
              FROM sys_keyed_service_status
              WHERE service_name = 'Counter'
                AND service_key = 'customer-1'
                AND invocation_id IS NOT NULL
              LIMIT 1",
        ]
      `);
    expect(await response.json()).toMatchObject({
      supported: true,
      lockHolder: {
        id: 'inv_1legacy',
        kind: 'invocation',
      },
    });
  });

  it('reports scoped locks as unsupported without Virtual Queues', async () => {
    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/lock?scope=tenant-a',
      NO_VQUEUE_HEADERS,
    );

    expect(sql).toEqual([]);
    expect(await response.json()).toEqual({ supported: false });
  });
});
