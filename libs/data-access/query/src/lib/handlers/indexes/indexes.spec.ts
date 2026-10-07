import { describe, expect, it, vi } from 'vitest';
import {
  BUSY_VQUEUE,
  countFromIndex,
  ENTRY_BY_SERVICE,
  ENTRY_BY_VIRTUAL_OBJECT,
  selectFromIndex,
  SERVICE_STATS,
} from './index';

function createContext(rows: Record<string, unknown>[] = []) {
  const query = vi.fn<
    (sql: string, id: string) => Promise<{ rows: Record<string, unknown>[] }>
  >(async () => ({ rows }));
  return {
    query,
    statements: () => query.mock.calls.map(([sql]) => sql),
  };
}

describe('index table helpers', () => {
  it('emits key clauses in the table key order', async () => {
    const context = createContext([{ entry_id: 'inv_1' }]);

    const rows = await selectFromIndex(context, ENTRY_BY_VIRTUAL_OBJECT, {
      keys: { stage: ['inbox', 'running'], key: 'k', service_name: "O'Brien" },
      columns: ['entry_id'],
      limit: 5,
      id: 'indexes/entries-by-virtual-object',
    });

    expect(rows).toEqual([{ entry_id: 'inv_1' }]);
    expect(context.query).toHaveBeenCalledWith(
      expect.any(String),
      'indexes/entries-by-virtual-object',
    );
    expect(context.statements()).toEqual([
      [
        'SELECT entry_id',
        'FROM _idx_entry_by_virtual_object',
        "WHERE service_name = 'O''Brien'",
        "  AND key = 'k'",
        "  AND stage IN ('inbox', 'running')",
        'LIMIT 5',
      ].join('\n'),
    ]);
  });

  it('treats null as IS NULL and skips undefined keys', async () => {
    const context = createContext();

    await selectFromIndex(context, ENTRY_BY_VIRTUAL_OBJECT, {
      keys: { service_name: 'S', scope: null, key: 'k', stage: undefined },
      id: 'indexes/entries-by-virtual-object',
    });

    expect(context.statements()).toEqual([
      [
        'SELECT service_name, scope, key, stage, transitioned_at, entry_id',
        'FROM _idx_entry_by_virtual_object',
        "WHERE service_name = 'S'",
        '  AND scope IS NULL',
        "  AND key = 'k'",
      ].join('\n'),
    ]);
  });

  it('sorts by the natural index order only when asked', async () => {
    const context = createContext();

    await selectFromIndex(context, ENTRY_BY_SERVICE, {
      keys: { service_name: ['A', 'B'] },
      columns: ['entry_id'],
      limit: 250,
      id: 'indexes/entries-by-service',
    });

    await selectFromIndex(context, BUSY_VQUEUE, {
      columns: ['vqueue_id'],
      sorted: true,
      limit: 251,
      id: 'indexes/busy-vqueues',
    });

    expect(context.statements()).toEqual([
      [
        'SELECT entry_id',
        'FROM _idx_entry_by_service',
        "WHERE service_name IN ('A', 'B')",
        'LIMIT 250',
      ].join('\n'),
      [
        'SELECT vqueue_id',
        'FROM _idx_busy_vqueue',
        'ORDER BY total_non_completed DESC, last_modified DESC',
        'LIMIT 251',
      ].join('\n'),
    ]);
  });

  it('selects every table column by default', async () => {
    const context = createContext();

    await selectFromIndex(context, SERVICE_STATS, { id: 'stats/services' });

    expect(context.statements()).toEqual([
      'SELECT service_name, handler, kind, stage, status, num_entries\nFROM sys_service_stats',
    ]);
  });

  it('rejects sorting a table without a natural order', async () => {
    const context = createContext();

    await expect(
      selectFromIndex(context, SERVICE_STATS, {
        sorted: true,
        id: 'stats/services',
      }),
    ).rejects.toThrow('sys_service_stats has no natural order');
    expect(context.statements()).toEqual([]);
  });

  it('counts with the same key clauses', async () => {
    const context = createContext([{ count: 7 }]);

    const count = await countFromIndex(context, ENTRY_BY_SERVICE, {
      keys: { service_name: 'S', stage: 'running' },
      id: 'indexes/count-entries-by-service',
    });

    expect(count).toBe(7);
    expect(context.statements()).toEqual([
      [
        'SELECT COUNT(*) AS count',
        'FROM _idx_entry_by_service',
        "WHERE stage = 'running'",
        "  AND service_name = 'S'",
      ].join('\n'),
    ]);
  });
});

export function rejectsKeysAndColumnsFromOtherTables() {
  const context = createContext();
  void selectFromIndex(context, ENTRY_BY_SERVICE, {
    // @ts-expect-error key is not an index key of this table
    keys: { key: 'k' },
    id: 'indexes/entries-by-service',
  });
  void selectFromIndex(context, ENTRY_BY_SERVICE, {
    // @ts-expect-error scope is not a column of this table
    columns: ['scope'],
    id: 'indexes/entries-by-service',
  });
}
