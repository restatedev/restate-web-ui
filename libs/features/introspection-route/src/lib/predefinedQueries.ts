export type PredefinedQueryFeature = 'vqueues';
export type PredefinedQueryPerformance = 'safe' | 'caution' | 'heavy';

export interface PredefinedQuery {
  id: string;
  title: string;
  description: string;
  performance: PredefinedQueryPerformance;
  query: string;
  requiredFeatures?: readonly PredefinedQueryFeature[];
}

export const predefinedQueries = [
  {
    id: 'total-invocations',
    title: 'Total invocations',
    description:
      'Total number of invocations currently in storage, including completed ones still within their retention window. A quick gauge of overall system size.',
    performance: 'safe',
    query: `SELECT COUNT(1) FROM sys_invocation_status;`,
  },
  {
    id: 'backlog-by-service-key',
    title: 'Backlog by service / key',
    description:
      "Services and virtual-object keys with the most invocations waiting to start. Top rows are your hottest queues / most-contended keys. For plain services the key is empty, so the row is that service's total pending backlog.",
    performance: 'safe',
    query: `SELECT target_service_name, target_service_key,
       COUNT(*)        AS waiting,
       MIN(created_at) AS oldest_waiting_at
FROM sys_invocation
WHERE status = 'pending'
GROUP BY target_service_name, target_service_key
ORDER BY waiting DESC
LIMIT 20;`,
  },
  {
    id: 'oldest-pending',
    title: 'Oldest pending',
    description:
      'The invocations that have been waiting longest to start. Useful for spotting work stuck at the front of a queue.',
    performance: 'safe',
    query: `SELECT id, target_service_name, target_service_key, target_handler_name, created_at, modified_at
FROM sys_invocation
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 20;`,
  },
  {
    id: 'deployment-hotspots',
    title: 'Deployment hotspots',
    description:
      'How many active, non-completed invocations are pinned to each deployment. A deployment with a disproportionate share is a likely bottleneck or a slow/overloaded SDK endpoint.',
    performance: 'safe',
    query: `SELECT pinned_deployment_id, COUNT(*) AS active_invocations
FROM sys_invocation
WHERE status <> 'completed' AND pinned_deployment_id IS NOT NULL
GROUP BY pinned_deployment_id
ORDER BY active_invocations DESC
LIMIT 20;`,
  },
  {
    id: 'transient-errors-last-hour',
    title: 'Transient errors (last hour)',
    description:
      "Retryable errors recorded in the last hour, grouped by service and error message. Shows what's failing right now and how often.",
    performance: 'caution',
    query: `SELECT COUNT(*) AS n,
       inv.target_service_name          AS service_name,
       e.event_json ->> 'error_message' AS msg
FROM sys_journal_events e
LEFT JOIN sys_invocation inv ON inv.id = e.id
WHERE e.event_type = 'TransientError'
  AND e.appended_at > now() - INTERVAL '1 hour'
GROUP BY service_name, msg
ORDER BY n DESC
LIMIT 50;`,
  },
  {
    id: 'search-by-error-message',
    title: 'Search by error message',
    description:
      "Find invocations whose transient-error message matches a search term. Replace my_error_message with the text you're looking for. LIKE is case-sensitive; use ILIKE for case-insensitive.",
    performance: 'caution',
    query: `SELECT id, appended_at, event_json ->> 'error_message' AS error_message
FROM sys_journal_events
WHERE event_type = 'TransientError'
  AND (event_json ->> 'error_message') LIKE '%my_error_message%'
ORDER BY appended_at DESC
LIMIT 100;`,
  },
  {
    id: 'big-journal-payloads',
    title: 'Big journal payloads',
    description:
      'Services/handlers that produced large journal payloads, entries over 1 MB, with the count and the largest size. Large payloads drive memory pressure and slow processing.',
    performance: 'heavy',
    query: `SELECT inv.target_service_name AS service_name,
       inv.target_handler_name AS handler_name,
       COUNT(*)          AS large_entry_count,
       MAX(j.raw_length) AS max_payload_bytes
FROM sys_journal j
JOIN sys_invocation inv ON j.id = inv.id
WHERE j.raw_length > 1000000
GROUP BY inv.target_service_name, inv.target_handler_name
ORDER BY max_payload_bytes DESC;`,
  },
] as const satisfies readonly PredefinedQuery[];
