import ky from 'ky';

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

export type QueryContext = {
  query: (sql: string) => Promise<{ rows: any[] }>;
  adminApi: <T>(
    path: string,
    options?: { method?: string; json?: unknown },
  ) => Promise<T>;
  baseUrl: string;
  restateVersion: string;
};

function queryFetcher(
  query: string,
  { baseUrl, headers = new Headers() }: { baseUrl: string; headers: Headers },
) {
  const queryHeaders = new Headers(headers);
  queryHeaders.set('accept', 'application/json');
  queryHeaders.set('content-type', 'application/json');

  return ky
    .post(`${baseUrl}/query`, {
      json: { query },
      headers: queryHeaders,
      timeout: 60_000,
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
  }: {
    baseUrl: string;
    headers: Headers;
    method?: string;
    json?: unknown;
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
  }).json<T>();
}

export function createQueryContext(
  baseUrl: string,
  headers: Headers,
  restateVersion: string,
): QueryContext {
  return {
    query: (sql: string) => queryFetcher(sql, { baseUrl, headers }),
    adminApi: <T>(
      path: string,
      options?: { method?: string; json?: unknown },
    ) =>
      adminApiFetcher<T>(path, {
        baseUrl,
        headers,
        method: options?.method,
        json: options?.json,
      }),
    baseUrl,
    restateVersion,
  };
}
