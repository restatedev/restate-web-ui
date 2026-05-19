import ky from 'ky';
import semverGte from 'semver/functions/gte';
import semverCoerce from 'semver/functions/coerce';

export const DURATION_CALC =
  "CASE WHEN status = 'scheduled' THEN NULL ELSE COALESCE(completed_at, now()) - COALESCE(scheduled_start_at, created_at) END";

export const DURATION_EXPRESSION = `${DURATION_CALC} AS duration`;

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

export const SYS_INVOCATION_COLUMNS = [
  ...SYS_INVOCATION_LIST_COLUMNS,
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

export function sysInvocationListColumns(
  features: Set<string>,
): readonly string[] {
  return features.has('vqueues')
    ? [...SYS_INVOCATION_LIST_COLUMNS, 'scope']
    : SYS_INVOCATION_LIST_COLUMNS;
}

export function sysInvocationColumns(features: Set<string>): readonly string[] {
  return features.has('vqueues')
    ? [...SYS_INVOCATION_COLUMNS, 'scope']
    : SYS_INVOCATION_COLUMNS;
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

export function shouldFilterScopeIsNull(context: {
  restateVersion: string;
  features: Set<string>;
}): boolean {
  if (context.features.has('vqueues')) return false;
  const coerced = semverCoerce(context.restateVersion);
  return coerced ? semverGte(coerced, '1.7.0') : false;
}

export function scopeClause(
  context: { restateVersion: string; features: Set<string> },
  explicitScope?: string,
): string {
  if (explicitScope !== undefined) {
    return ` AND scope = '${explicitScope}'`;
  }
  return shouldFilterScopeIsNull(context) ? ' AND scope IS NULL' : '';
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

  return ky
    .post(`${baseUrl}/query`, {
      json: { query },
      headers: queryHeaders,
      timeout: 60_000,
      signal,
    })
    .json<{ rows: any[] }>();
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

  return ky(`${baseUrl}${path}`, {
    method,
    headers: apiHeaders,
    json,
    timeout: 60_000,
    signal,
  }).json<T>();
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
