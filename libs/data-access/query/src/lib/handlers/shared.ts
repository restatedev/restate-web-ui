import ky, { HTTPError, TimeoutError } from 'ky';
import type { QueryId } from '../queryDefinitions';
import { RESTATE_FEATURES_HEADER } from '../getFeatures';
import { UI_FEATURES_HEADER } from '../uiFeatures';
import {
  QUERY_CLIENT,
  QUERY_CLIENT_HEADER,
  QUERY_ORIGIN_HEADER,
  type QueryOrigin,
} from '../queryOrigin';
import {
  getCurrentQueryPage,
  recordQuery,
  type QueryOutcome,
} from '../queryStats';

export const QUERY_HANDLER_DOWNSTREAM_TIMEOUT_MS = 10 * 60_000;
export const QUERY_HANDLER_DOWNSTREAM_TIMEOUT_LABEL = '10m';
export const BEST_EFFORT_INVOCATION_CANDIDATE_LIMIT = 500;

export function quoteSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function targetServiceKeyClause(
  key: string,
  column = 'target_service_key',
): string {
  return `${column} = ${quoteSqlString(key)}`;
}

export const SYS_INVOCATION_LIST_COLUMNS = [
  'id',
  'target',
  'target_service_name',
  'target_service_key',
  'target_handler_name',
  'target_service_ty',
  'idempotency_key',
  'invoked_by',
  'invoked_by_id',
  'invoked_by_subscription_id',
  'invoked_by_target',
  'restarted_from',
  'pinned_deployment_id',
  'pinned_service_protocol_version',
  'journal_size',
  'journal_commands_size',
  'created_at',
  'modified_at',
  'inboxed_at',
  'scheduled_at',
  'scheduled_start_at',
  'running_at',
  'completed_at',
  'completion_retention',
  'journal_retention',
  'retry_count',
  'last_start_at',
  'next_retry_at',
  'last_attempt_deployment_id',
  'last_attempt_server',
  'last_failure',
  'last_failure_error_code',
  'status',
  'completion_result',
  'completion_failure',
] as const;

const SYS_INVOCATION_WAITING_COLUMNS = [
  'last_awaiting_on_future_json',
  'suspended_waiting_for_completions',
  'suspended_waiting_for_signals',
  'suspended_waiting_future_json',
] as const;

const SYS_INVOCATION_DETAIL_COLUMNS = [
  'invoked_by_service_name',
  'trace_id',
  'created_using_restate_version',
  'last_failure_related_entry_index',
  'last_failure_related_entry_name',
  'last_failure_related_entry_type',
  'last_failure_related_command_index',
  'last_failure_related_command_name',
  'last_failure_related_command_type',
] as const;

export const SYS_INVOCATION_LIST_SELECT_COLUMNS = [
  ...SYS_INVOCATION_LIST_COLUMNS,
  ...SYS_INVOCATION_WAITING_COLUMNS,
  'scope',
  'vqueue_id',
  'limit_key',
] as const;

export const SYS_INVOCATION_SELECT_COLUMNS = [
  ...SYS_INVOCATION_LIST_SELECT_COLUMNS,
  ...SYS_INVOCATION_DETAIL_COLUMNS,
] as const;

export type QueryContext = {
  query: (sql: string, id: QueryId) => Promise<{ rows: any[] }>;
  adminApi: <T>(
    path: string,
    options?: { method?: string; json?: unknown },
  ) => Promise<T>;
  baseUrl: string;
  features: Set<string>;
};

export function scopeClause(explicitScope?: string): string {
  if (explicitScope !== undefined) {
    return ` AND scope = ${quoteSqlString(explicitScope)}`;
  }
  return ' AND scope IS NULL';
}

// Network failures (refused connection, DNS, CORS) reject with a bare
// `TypeError: Failed to fetch` that — unlike ky's HTTPError/TimeoutError —
// carries no request context. Append the real downstream call so the /query
// proxy reports what actually failed, not the in-browser /query/* route.
function withRequestContext(method: string, url: string) {
  return (error: unknown): never => {
    if (
      error instanceof Error &&
      !(error instanceof HTTPError) &&
      !(error instanceof TimeoutError) &&
      error.name !== 'AbortError'
    ) {
      error.message = `${error.message}: ${method.toUpperCase()} ${url}`;
    }
    throw error;
  };
}

function queryFetcher(
  query: string,
  {
    baseUrl,
    headers = new Headers(),
    signal,
  }: { baseUrl: string; headers: Headers; signal?: AbortSignal },
) {
  const queryHeaders = new Headers(headers);
  queryHeaders.set('accept', 'application/json');
  queryHeaders.set('content-type', 'application/json');
  queryHeaders.set(QUERY_CLIENT_HEADER, QUERY_CLIENT);
  queryHeaders.set(QUERY_ORIGIN_HEADER, 'built-in' satisfies QueryOrigin);

  const url = `${baseUrl}/query`;
  return ky
    .post(url, {
      json: { query },
      headers: queryHeaders,
      timeout: QUERY_HANDLER_DOWNSTREAM_TIMEOUT_MS,
      signal,
    })
    .json<{ rows: any[] }>()
    .catch(withRequestContext('POST', url));
}

function adminApiFetcher<T>(
  path: string,
  {
    baseUrl,
    headers = new Headers(),
    method = 'GET',
    json,
    signal,
  }: {
    baseUrl: string;
    headers: Headers;
    method?: string;
    json?: unknown;
    signal?: AbortSignal;
  },
): Promise<T> {
  const apiHeaders = new Headers(headers);
  apiHeaders.set('accept', 'application/json');
  if (json) {
    apiHeaders.set('content-type', 'application/json');
  }

  const url = `${baseUrl}${path}`;
  return ky(url, {
    method,
    headers: apiHeaders,
    json,
    timeout: QUERY_HANDLER_DOWNSTREAM_TIMEOUT_MS,
    signal,
  })
    .json<T>()
    .catch(withRequestContext(method, url));
}

function classifyQueryError(error: unknown): QueryOutcome {
  if (error instanceof TimeoutError) {
    return 'timeout';
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return 'aborted';
  }
  return 'error';
}

export function createQueryContext(
  baseUrl: string,
  headers: Headers,
  features: Set<string>,
  signal?: AbortSignal,
): QueryContext {
  const downstreamHeaders = new Headers(headers);
  downstreamHeaders.delete(RESTATE_FEATURES_HEADER);
  downstreamHeaders.delete(UI_FEATURES_HEADER);

  return {
    query: (sql: string, id: QueryId) => {
      const page = getCurrentQueryPage();
      const executedAt = Date.now();
      const startedAt = performance.now();
      const record = (outcome: QueryOutcome) =>
        recordQuery({
          id,
          sql,
          durationMs: performance.now() - startedAt,
          outcome,
          executedAt,
          baseUrl,
          page,
        });
      return queryFetcher(sql, {
        baseUrl,
        headers: downstreamHeaders,
        signal,
      }).then(
        (result) => {
          record('success');
          return result;
        },
        (error) => {
          record(classifyQueryError(error));
          throw error;
        },
      );
    },
    adminApi: <T>(
      path: string,
      options?: { method?: string; json?: unknown },
    ) =>
      adminApiFetcher<T>(path, {
        baseUrl,
        headers: downstreamHeaders,
        method: options?.method,
        json: options?.json,
        signal,
      }),
    baseUrl,
    features,
  };
}

export function isInvocationId(id: string) {
  return id.startsWith('inv_');
}
