import { afterEach, beforeEach, vi } from 'vitest';
import { query as queryRouter } from '../../../query';

export type SqlResponder = (
  sql: string,
) => Promise<Record<string, unknown>[]> | Record<string, unknown>[];

export const VQUEUE_HEADERS = {
  'content-type': 'application/json',
  'x-restate-version': '1.7.2',
  'x-restate-features': 'vqueues,protocol_v7',
};

export const NO_VQUEUE_HEADERS = {
  'content-type': 'application/json',
  'x-restate-version': '1.7.2',
  'x-restate-features': 'protocol_v7',
};

export const VQUEUE_SKIP_COMPLETED_HEADERS = {
  'content-type': 'application/json',
  'x-restate-version': '1.7.3',
  'x-restate-features': 'vqueues,vqueues_migration_skip_completed,protocol_v7',
};

export function rawInvocation(
  id: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    target: `Greeter/${id}/run`,
    target_service_name: 'Greeter',
    target_service_key: id,
    target_handler_name: 'run',
    target_service_ty: 'workflow',
    status: 'ready',
    created_at: '2026-01-01T00:00:00.000Z',
    modified_at: '2026-01-01T00:00:00.000Z',
    scheduled_start_at: null,
    completed_at: null,
    pinned_service_protocol_version: 7,
    retry_count: 0,
    ...overrides,
  };
}

export function createInvocationV2QueryTestHarness() {
  const sql: string[] = [];
  let responder: SqlResponder = () => [];

  beforeEach(() => {
    sql.length = 0;
    responder = () => [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const request =
          input instanceof Request ? input : new Request(input.toString());
        const body = (await request.clone().json()) as { query: string };
        const statement = body.query.trim();
        const normalizedStatement = statement
          .replace(/\s+/g, ' ')
          .replace(/\(\s+/g, '(')
          .replace(/\s+\)/g, ')')
          .trim();
        sql.push(statement);
        return Response.json({ rows: await responder(normalizedStatement) });
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  return {
    sql,
    setResponder(nextResponder: SqlResponder) {
      responder = nextResponder;
    },
    post(
      path: string,
      body: unknown,
      headers: Record<string, string> = VQUEUE_HEADERS,
    ) {
      return queryRouter(
        new Request(`http://query.test/query${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        }),
      );
    },
    get(path: string, headers: Record<string, string> = VQUEUE_HEADERS) {
      return queryRouter(
        new Request(`http://query.test/query${path}`, {
          method: 'GET',
          headers,
        }),
      );
    },
  };
}
