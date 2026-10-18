import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness } from './invocationsV2/tests/testUtils.js';
import { quoteSqlString } from './shared.js';

const KEYS = [
  'percent%',
  'literal%2Fkey',
  'literal/key',
  'with space',
  'ünïcødé-キー',
  'question?and#hash',
  'already%20encoded-looking',
];

function stateSql(sql: string[]) {
  return sql.find((statement) => statement.includes('FROM state'));
}

describe('query router path parameter decoding', () => {
  const { get, sql } = createInvocationV2QueryTestHarness();

  it.each(KEYS)('decodes the key %j exactly once', async (key) => {
    const response = await get(
      `/services/StatefulCounter/keys/${encodeURIComponent(key)}/state`,
    );

    expect(response.status).toBe(200);
    expect(stateSql(sql)).toContain(`service_key = ${quoteSqlString(key)}`);
  });

  it.each(KEYS)(
    'decodes the scope and key %j exactly once on scoped routes',
    async (key) => {
      const scope = `scope ${key}`;
      const response = await get(
        `/services/StatefulCounter/scopes/${encodeURIComponent(scope)}/keys/${encodeURIComponent(key)}/state`,
      );

      expect(response.status).toBe(200);
      const statement = stateSql(sql);
      expect(statement).toContain(`service_key = ${quoteSqlString(key)}`);
      expect(statement).toContain(quoteSqlString(scope));
    },
  );

  it('keeps a literal %2F key distinct from a slash key', async () => {
    await get(
      `/services/StatefulCounter/keys/${encodeURIComponent('literal%2Fkey')}/state`,
    );
    await get(
      `/services/StatefulCounter/keys/${encodeURIComponent('literal/key')}/state`,
    );

    const statements = sql.filter((statement) =>
      statement.includes('FROM state'),
    );
    expect(statements[0]).toContain(quoteSqlString('literal%2Fkey'));
    expect(statements[1]).toContain(quoteSqlString('literal/key'));
  });
});
