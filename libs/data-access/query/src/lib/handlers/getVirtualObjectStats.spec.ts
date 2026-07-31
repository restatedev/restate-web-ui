import { describe, expect, it } from 'vitest';
import {
  createInvocationV2QueryTestHarness,
  NO_VQUEUE_HEADERS,
  VQUEUE_HEADERS,
} from './invocationsV2/tests/testUtils';

const SCOPED_VQUEUE_HEADERS = {
  'content-type': 'application/json',
  'x-restate-version': '1.7.3',
  'x-restate-features': 'vqueues,scoped_virtual_objects,protocol_v7',
};

describe('GET /query/virtual-objects/:service/instances/:key/stats', () => {
  const { get, setResponder, sql } = createInvocationV2QueryTestHarness();

  it('returns ranges across all scoped Virtual Queues with samples', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_vqueues v')) {
        return [{ oldest_inboxed_at: '2026-07-29T11:00:00.000Z' }];
      }
      if (statement.includes('FROM sys_vqueue_meta')) {
        return [
          {
            attempted_vqueue_count: 4,
            min_avg_inbox_duration: 'PT1.5S',
            max_avg_inbox_duration: 'PT8S',
            oldest_attempt_at: '2026-01-01T00:00:01.000Z',
            latest_attempt_at: '2026-07-31T09:00:01.000Z',
            min_avg_blocked_on_concurrency_rules: 'PT0S',
            max_avg_blocked_on_concurrency_rules: 'PT1.2S',
            min_avg_blocked_on_invoker_concurrency: 'PT0S',
            max_avg_blocked_on_invoker_concurrency: 'PT0.4S',
            min_avg_blocked_on_invoker_throttling: 'PT0S',
            max_avg_blocked_on_invoker_throttling: 'PT0.7S',
            min_avg_blocked_on_lock: 'PT0S',
            max_avg_blocked_on_lock: 'PT2.1S',
            num_inbox: 1176,
            last_enqueued_at: '2026-07-31T08:59:58.000Z',
            latest_start_at: '2026-07-31T09:00:00.000Z',
            last_finish_at: '2026-07-31T09:00:05.000Z',
          },
        ];
      }
      if (statement.includes('FROM state')) {
        return [{ num_keys: 12, total_size: 49152 }];
      }
      return [];
    });

    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/stats?scope=tenant-a',
      SCOPED_VQUEUE_HEADERS,
    );

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT
            COUNT(last_attempt_at) AS attempted_vqueue_count,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_inbox_duration END) AS min_avg_inbox_duration,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_inbox_duration END) AS max_avg_inbox_duration,
            MIN(last_attempt_at) AS oldest_attempt_at,
            MAX(last_attempt_at) AS latest_attempt_at,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_concurrency_rules END) AS min_avg_blocked_on_concurrency_rules,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_concurrency_rules END) AS max_avg_blocked_on_concurrency_rules,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_concurrency END) AS min_avg_blocked_on_invoker_concurrency,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_concurrency END) AS max_avg_blocked_on_invoker_concurrency,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_throttling END) AS min_avg_blocked_on_invoker_throttling,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_throttling END) AS max_avg_blocked_on_invoker_throttling,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_lock END) AS min_avg_blocked_on_lock,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_lock END) AS max_avg_blocked_on_lock,
            COALESCE(SUM(num_inbox), 0) AS num_inbox,
            MAX(last_enqueued_at) AS last_enqueued_at,
            MAX(last_start_at) AS latest_start_at,
            MAX(last_finish_at) AS last_finish_at
          FROM sys_vqueue_meta
          WHERE service_name = 'Counter'
            AND lock_name = 'Counter/customer-1'
            AND scope = 'tenant-a'",
        "SELECT MIN(v.transitioned_at) AS oldest_inboxed_at
          FROM sys_vqueues v
          WHERE v.id IN (
            SELECT vm.id
            FROM sys_vqueue_meta vm
            WHERE vm.service_name = 'Counter'
              AND vm.lock_name = 'Counter/customer-1'
              AND vm.scope = 'tenant-a'
              AND vm.num_inbox > 0
          )
            AND v.stage = 'inbox'",
        "SELECT
            COUNT(*) AS num_keys,
            COALESCE(SUM(value_length), 0) AS total_size
          FROM state
          WHERE service_name = 'Counter'
            AND service_key = 'customer-1' AND scope = 'tenant-a'",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      averageInboxDuration: {
        min: 'PT1.5S',
        max: 'PT8S',
        vqueueCount: 4,
        oldestUpdatedAt: '2026-01-01T00:00:01.000Z',
        latestUpdatedAt: '2026-07-31T09:00:01.000Z',
      },
      numInbox: 1176,
      averageBlockedDurations: [
        {
          gate: 'concurrency_rules',
          min: 'PT0S',
          max: 'PT1.2S',
          vqueueCount: 4,
          oldestUpdatedAt: '2026-01-01T00:00:01.000Z',
          latestUpdatedAt: '2026-07-31T09:00:01.000Z',
        },
        {
          gate: 'invoker_concurrency',
          min: 'PT0S',
          max: 'PT0.4S',
          vqueueCount: 4,
          oldestUpdatedAt: '2026-01-01T00:00:01.000Z',
          latestUpdatedAt: '2026-07-31T09:00:01.000Z',
        },
        {
          gate: 'invoker_throttling',
          min: 'PT0S',
          max: 'PT0.7S',
          vqueueCount: 4,
          oldestUpdatedAt: '2026-01-01T00:00:01.000Z',
          latestUpdatedAt: '2026-07-31T09:00:01.000Z',
        },
        {
          gate: 'lock',
          min: 'PT0S',
          max: 'PT2.1S',
          vqueueCount: 4,
          oldestUpdatedAt: '2026-01-01T00:00:01.000Z',
          latestUpdatedAt: '2026-07-31T09:00:01.000Z',
        },
      ],
      activity: {
        oldestInboxedAt: '2026-07-29T11:00:00.000Z',
        lastEnqueuedAt: '2026-07-31T08:59:58.000Z',
        lastStartedAt: '2026-07-31T09:00:00.000Z',
        lastAttemptAt: '2026-07-31T09:00:01.000Z',
        lastFinishedAt: '2026-07-31T09:00:05.000Z',
      },
      state: {
        numKeys: 12,
        totalSize: 49152,
      },
    });
  });

  it('uses the unscoped Virtual Queue and state rows when scopes are disabled', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_vqueues v')) {
        return [{ oldest_inboxed_at: '2026-07-31T08:00:00.000Z' }];
      }
      if (statement.includes('FROM sys_vqueue_meta')) {
        return [
          {
            attempted_vqueue_count: 1,
            min_avg_inbox_duration: 'PT4S',
            max_avg_inbox_duration: 'PT4S',
            oldest_attempt_at: '2026-07-31T09:00:01.000Z',
            latest_attempt_at: '2026-07-31T09:00:01.000Z',
            latest_start_at: '2026-07-31T09:00:00.000Z',
            num_inbox: 2,
          },
        ];
      }
      if (statement.includes('FROM state')) {
        return [{ num_keys: 2, total_size: 128 }];
      }
      return [];
    });

    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/stats',
      VQUEUE_HEADERS,
    );

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT
            COUNT(last_attempt_at) AS attempted_vqueue_count,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_inbox_duration END) AS min_avg_inbox_duration,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_inbox_duration END) AS max_avg_inbox_duration,
            MIN(last_attempt_at) AS oldest_attempt_at,
            MAX(last_attempt_at) AS latest_attempt_at,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_concurrency_rules END) AS min_avg_blocked_on_concurrency_rules,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_concurrency_rules END) AS max_avg_blocked_on_concurrency_rules,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_concurrency END) AS min_avg_blocked_on_invoker_concurrency,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_concurrency END) AS max_avg_blocked_on_invoker_concurrency,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_throttling END) AS min_avg_blocked_on_invoker_throttling,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_throttling END) AS max_avg_blocked_on_invoker_throttling,
            MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_lock END) AS min_avg_blocked_on_lock,
            MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_lock END) AS max_avg_blocked_on_lock,
            COALESCE(SUM(num_inbox), 0) AS num_inbox,
            MAX(last_enqueued_at) AS last_enqueued_at,
            MAX(last_start_at) AS latest_start_at,
            MAX(last_finish_at) AS last_finish_at
          FROM sys_vqueue_meta
          WHERE service_name = 'Counter'
            AND lock_name = 'Counter/customer-1'
            AND scope IS NULL",
        "SELECT MIN(v.transitioned_at) AS oldest_inboxed_at
          FROM sys_vqueues v
          WHERE v.id IN (
            SELECT vm.id
            FROM sys_vqueue_meta vm
            WHERE vm.service_name = 'Counter'
              AND vm.lock_name = 'Counter/customer-1'
              AND vm.scope IS NULL
              AND vm.num_inbox > 0
          )
            AND v.stage = 'inbox'",
        "SELECT
            COUNT(*) AS num_keys,
            COALESCE(SUM(value_length), 0) AS total_size
          FROM state
          WHERE service_name = 'Counter'
            AND service_key = 'customer-1' AND scope IS NULL",
      ]
    `);
    expect(await response.json()).toEqual({
      supported: true,
      averageInboxDuration: {
        min: 'PT4S',
        max: 'PT4S',
        vqueueCount: 1,
        oldestUpdatedAt: '2026-07-31T09:00:01.000Z',
        latestUpdatedAt: '2026-07-31T09:00:01.000Z',
      },
      numInbox: 2,
      averageBlockedDurations: [],
      activity: {
        oldestInboxedAt: '2026-07-31T08:00:00.000Z',
        lastStartedAt: '2026-07-31T09:00:00.000Z',
        lastAttemptAt: '2026-07-31T09:00:01.000Z',
      },
      state: {
        numKeys: 2,
        totalSize: 128,
      },
    });
  });

  it('reports stats as unsupported without Virtual Queues', async () => {
    const response = await get(
      '/virtual-objects/Counter/instances/customer-1/stats',
      NO_VQUEUE_HEADERS,
    );

    expect(sql).toEqual([]);
    expect(await response.json()).toEqual({ supported: false });
  });
});
