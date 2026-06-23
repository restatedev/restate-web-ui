import ky, { HTTPError, TimeoutError } from 'ky';
import semverGte from 'semver/functions/gte';
import semverCoerce from 'semver/functions/coerce';

export const DURATION_CALC =
  "CASE WHEN status = 'scheduled' THEN NULL ELSE COALESCE(completed_at, now()) - COALESCE(scheduled_start_at, created_at) END";

export const DURATION_EXPRESSION = `${DURATION_CALC} AS duration`;

export function quoteSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
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

// `raw_length` was added to sys_journal in 1.7.0; older servers don't have the
// column and DataFusion errors on an unknown column, so gate it to avoid
// breaking the whole journal query.
export function supportsJournalRawLength(restateVersion: string): boolean {
  const coerced = semverCoerce(restateVersion);
  return coerced ? semverGte(coerced, '1.7.0') : false;
}

export function getSysInvocationListColumns(
  features: Set<string>,
): readonly string[] {
  const base = features.has('protocol_v7')
    ? [...SYS_INVOCATION_LIST_COLUMNS, ...SYS_INVOCATION_WAITING_COLUMNS]
    : SYS_INVOCATION_LIST_COLUMNS;
  return features.has('vqueues')
    ? [...base, 'scope', 'vqueue_id', 'limit_key']
    : base;
}

export function getSysInvocationColumns(
  features: Set<string>,
): readonly string[] {
  return [
    ...getSysInvocationListColumns(features),
    ...SYS_INVOCATION_DETAIL_COLUMNS,
  ];
}

export type QueryContext = {
  query: (sql: string) => Promise<{ rows: any[] }>;
  adminApi: <T>(
    path: string,
    options?: { method?: string; json?: unknown },
  ) => Promise<T>;
  baseUrl: string;
  restateVersion: string;
  features: Set<string>;
};

export type StateServiceType = 'virtual_object' | 'workflow' | 'service';

export function shouldFilterScopeIsNull(
  context: { features: Set<string> },
  serviceType?: StateServiceType,
): boolean {
  if (!context.features.has('vqueues')) return false;
  // Virtual objects don't expose scope to users — force the NULL filter even
  // when the `vqueues` feature is enabled (scope is only meaningful for vqueue
  // services, not VOs).
  if (serviceType === 'virtual_object') return true;
  return false;
}

export function scopeClause(
  context: { features: Set<string> },
  explicitScope?: string,
  serviceType?: StateServiceType,
): string {
  if (!context.features.has('vqueues')) return '';
  if (explicitScope !== undefined) {
    return ` AND scope = ${quoteSqlString(explicitScope)}`;
  }
  return shouldFilterScopeIsNull(context, serviceType)
    ? ' AND scope IS NULL'
    : '';
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

  const url = `${baseUrl}/query`;
  return ky
    .post(url, {
      json: { query },
      headers: queryHeaders,
      timeout: 60_000,
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
    timeout: 60_000,
    signal,
  })
    .json<T>()
    .catch(withRequestContext(method, url));
}

export function createQueryContext(
  baseUrl: string,
  headers: Headers,
  restateVersion: string,
  features: Set<string>,
  signal?: AbortSignal,
): QueryContext {
  return {
    query: (sql: string) => queryFetcher(sql, { baseUrl, headers, signal }),
    adminApi: <T>(
      path: string,
      options?: { method?: string; json?: unknown },
    ) =>
      adminApiFetcher<T>(path, {
        baseUrl,
        headers,
        method: options?.method,
        json: options?.json,
        signal,
      }),
    baseUrl,
    restateVersion,
    features,
  };
}
