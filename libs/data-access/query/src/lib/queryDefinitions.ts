export interface QueryDefinition {
  description: string;
  // Generalized SQL shape — not the exact statement, but structurally
  // faithful: WHERE, GROUP BY, ORDER BY, LIMIT, joins, subqueries, and window
  // functions appear iff the real query has them, since they drive
  // performance. `?` is one dynamic value, `(…)` a dynamic id list,
  // `<filters>`/`<sort>` caller-driven fragments, and `[ ]` an optional part.
  shape: string;
  tables: readonly string[];
  // The statement's handler code still exists but no UI surface reaches it
  // anymore. Skip these when reading the catalog; delete the entry together
  // with the handler.
  deprecated?: boolean;
}

// Catalog of every SQL statement the UI sends to the Restate /query endpoint.
// Each `context.query(sql, id)` call site references one entry; the compiler
// rejects unknown ids, so this file always lists the complete set. Ids are
// stable identifiers used by the query-stats page to aggregate executions;
// call sites with the same intent and shape share one id.
export const QUERY_DEFINITIONS = {
  'deployments/drained': {
    description:
      'Identify deployments no longer referenced by any service or unfinished invocation, so the UI can mark them as drained.',
    shape:
      "WITH active AS (SELECT deployment_id FROM sys_service WHERE deployment_id IS NOT NULL UNION SELECT deployment FROM sys_vqueues WHERE entry_kind = 'invocation' AND stage != 'finished') SELECT id FROM sys_deployment EXCEPT SELECT id FROM active",
    tables: ['sys_deployment', 'sys_service', 'sys_vqueues'],
  },
  'deployments/drained-legacy': {
    description:
      'Identify deployments no longer referenced by any service or unfinished invocation (servers without VQueues).',
    shape:
      "WITH active AS (SELECT DISTINCT deployment_id FROM sys_service UNION SELECT DISTINCT pinned_deployment_id FROM sys_invocation_status WHERE status != 'completed') SELECT id FROM sys_deployment EXCEPT SELECT id FROM active",
    tables: ['sys_deployment', 'sys_service', 'sys_invocation_status'],
  },
  'inbox/head': {
    description:
      'Find the invocation currently holding a virtual object’s exclusive lock (the queue head).',
    shape:
      "SELECT id FROM sys_invocation WHERE target_service_key = ? AND target_service_name = ? AND status NOT IN ('completed', 'pending', 'scheduled') AND target_handler_name IN (…) [AND scope …]",
    tables: ['sys_invocation'],
  },
  'inbox/inbox-sequence-lookup': {
    description:
      'Look up an invocation’s inbox sequence number before computing its queue position.',
    shape: 'SELECT sequence_number FROM sys_inbox WHERE id = ?',
    tables: ['sys_inbox'],
  },
  'inbox/position-from-inbox': {
    description:
      'Count how many inbox entries precede an invocation to show its queue position (servers without VQueues).',
    shape:
      'SELECT COUNT(*) FROM sys_inbox WHERE service_key = ? AND service_name = ? AND sequence_number < ?',
    tables: ['sys_inbox'],
  },
  'inbox/position-from-vqueues': {
    description:
      'Count how many VQueue entries precede an invocation to show its queue position.',
    shape:
      'SELECT COUNT(*) FROM sys_vqueues WHERE id = ? AND sequence_number < ?',
    tables: ['sys_vqueues'],
  },
  'inbox/size-from-inbox': {
    description:
      'Count the queued entries of a virtual object’s inbox (servers without VQueues).',
    shape:
      'SELECT COUNT(*) FROM sys_inbox WHERE service_key = ? AND service_name = ?',
    tables: ['sys_inbox'],
  },
  'inbox/size-from-vqueue-meta': {
    description:
      'Read a virtual object’s unfinished-entry total from its VQueue metadata.',
    shape:
      'SELECT (num_inbox + num_running + num_suspended + num_paused) FROM sys_vqueue_meta WHERE service_name = ? AND lock_name = ? AND is_active = true [AND scope …]',
    tables: ['sys_vqueue_meta'],
  },
  'inbox/vqueue-entry-lookup': {
    description:
      'Find the VQueue id and sequence number of an invocation to locate its queue position.',
    shape: 'SELECT id, sequence_number FROM sys_vqueues WHERE entry_id = ?',
    tables: ['sys_vqueues'],
  },
  'invocations/by-ids': {
    description:
      'Hydrate invocation rows for a set of ids selected by a previous query (queue entries, recent virtual object invocations, workflow runs).',
    shape:
      "SELECT <list columns> FROM sys_invocation WHERE id IN (…) [AND status <> 'completed']",
    tables: ['sys_invocation'],
  },
  'invocations/completed-breakdown': {
    deprecated: true,
    description:
      'No longer issued — replaced by the finished-history time series. Bucketed completed invocations into a success/failure series.',
    shape:
      "SELECT to_unixtime(date_bin(INTERVAL ?, completed_at, epoch)), COUNT(*) FILTER (WHERE completion_result = 'success'), COUNT(*) FILTER (WHERE completion_result = 'failure') FROM sys_invocation_status WHERE status = 'completed' AND completed_at >= ? AND completed_at < ? [AND <filters>] GROUP BY bucket",
    tables: ['sys_invocation_status'],
  },
  'invocations/count-estimate': {
    description:
      'Estimate how many invocations match the current filters (bounded scan) for the invocations count.',
    shape:
      'SELECT COUNT(1) FROM (SELECT <list columns> FROM sys_invocation LIMIT 200000) WHERE <filters>',
    tables: ['sys_invocation'],
  },
  'invocations/count-exact-check': {
    description:
      'Fetch the first matching invocation ids to report an exact count when the result set is small.',
    shape: 'SELECT id FROM sys_invocation WHERE <filters> LIMIT 100',
    tables: ['sys_invocation'],
  },
  'invocations/get': {
    description:
      'Load a single invocation’s full row for detail surfaces (invocation page, journal, VQueue snapshot focus).',
    shape: 'SELECT <all columns> FROM sys_invocation WHERE id = ?',
    tables: ['sys_invocation'],
  },
  'invocations/ids-page': {
    description:
      'Page through the ids of invocations matching the filters to drive batch actions (cancel, kill, purge, …).',
    shape:
      'SELECT id, created_at FROM sys_invocation WHERE <filters> [AND created_at > cursor] ORDER BY created_at ASC LIMIT 1000',
    tables: ['sys_invocation'],
  },
  'invocations/journal-entries': {
    description:
      'Load all journal entries of an invocation for the journal timeline.',
    shape:
      'SELECT <entry columns [+ raw]> FROM sys_journal WHERE id = ? ORDER BY index',
    tables: ['sys_journal'],
  },
  'invocations/journal-entry': {
    deprecated: true,
    description:
      'No longer issued — replaced by the journal-entry metadata and payloads queries. Fetched a single full journal entry.',
    shape:
      'SELECT <entry columns + raw> FROM sys_journal WHERE id = ? AND index = ?',
    tables: ['sys_journal'],
  },
  'invocations/journal-entry-metadata': {
    description:
      'Fetch a journal entry’s lightweight metadata (optionally raw payload) for the entry side panel.',
    shape:
      'SELECT <lite columns [+ raw]> FROM sys_journal WHERE id = ? AND index = ?',
    tables: ['sys_journal'],
  },
  'invocations/journal-entry-payloads': {
    description:
      'Fetch a journal entry’s payloads (input/output/results) when the user opens them.',
    shape:
      'SELECT entry_type, entry_json, raw FROM sys_journal WHERE id = ? AND index = ?',
    tables: ['sys_journal'],
  },
  'invocations/journal-events': {
    description:
      'Load an invocation’s journal events (errors, pauses, lifecycle) for the journal timeline.',
    shape:
      'SELECT <event columns> FROM sys_journal_events WHERE id = ? ORDER BY appended_at',
    tables: ['sys_journal_events'],
  },
  'invocations/list-details': {
    deprecated: true,
    description:
      'No longer issued — part of the previous invocations list implementation. Hydrated the full rows for the selected page ids.',
    shape:
      'SELECT <list columns>, <duration expr> FROM sys_invocation WHERE id IN (…) AND <filters> [ORDER BY <sort>]',
    tables: ['sys_invocation'],
  },
  'invocations/list-ids': {
    deprecated: true,
    description:
      'No longer issued — part of the previous invocations list implementation. Selected the page’s invocation ids matching filters and sort.',
    shape:
      'SELECT id FROM sys_invocation [LEFT JOIN sys_invocation_state ON id] WHERE <filters> [ORDER BY <sort>] LIMIT 250 [sampled: FROM (… LIMIT 50000)]',
    tables: ['sys_invocation', 'sys_invocation_status', 'sys_invocation_state'],
  },
  'invocations/paused-error': {
    description:
      'Fetch the pause event with its last failure for a paused invocation’s error panel.',
    shape:
      "SELECT <event columns> FROM sys_journal_events WHERE id = ? AND event_type = 'Paused' ORDER BY appended_at DESC LIMIT 1",
    tables: ['sys_journal_events'],
  },
  'invocations/statuses': {
    description:
      'Refresh the live status of the invocations currently visible (tables, journal links).',
    shape: 'SELECT <status columns> FROM sys_invocation WHERE id IN (…)',
    tables: ['sys_invocation'],
  },
  'invocations/summary': {
    deprecated: true,
    description:
      'No longer issued — part of the previous invocations summary implementation. Grouped invocation counts by status, service, and handler.',
    shape:
      "SELECT <status CASE>, completion_result, service, handler, COUNT(1) FROM sys_invocation_status LEFT JOIN (SELECT … FROM sys_vqueues WHERE stage = 'inbox') ON entry_id = id [WHERE <filters>] GROUP BY status, completion_result, service, handler [sampled: FROM (… LIMIT 50000)]",
    tables: ['sys_invocation', 'sys_invocation_status', 'sys_vqueues'],
  },
  'invocations/summary-split-counts': {
    deprecated: true,
    description:
      'Disabled summary experiment; its call site is commented out. Grouped raw invocation status counts.',
    shape:
      'SELECT status, completion_result, service, handler, COUNT(1) FROM sys_invocation_status [WHERE <filters>] GROUP BY status, completion_result, service, handler [sampled: FROM (… LIMIT 50000)]',
    tables: ['sys_invocation_status'],
  },
  'invocations/summary-split-services': {
    deprecated: true,
    description:
      'Disabled summary experiment; its call site is commented out. Listed service names to zero-fill summary buckets.',
    shape: 'SELECT name FROM sys_service',
    tables: ['sys_service'],
  },
  'invocations/summary-split-state': {
    deprecated: true,
    description:
      'Disabled summary experiment; its call site is commented out. Derived running/backing-off counts from the live-state table.',
    shape:
      'SELECT service, handler, <derived-status CASE>, COUNT(1) FROM sys_invocation_state GROUP BY service, handler, derived_status',
    tables: ['sys_invocation_state'],
  },
  'invocations/transient-error': {
    description:
      'Fetch the latest transient error event for an invocation’s error popover.',
    shape:
      "SELECT <event columns> FROM sys_journal_events WHERE id = ? AND event_type = 'TransientError' ORDER BY appended_at DESC LIMIT 1",
    tables: ['sys_journal_events'],
  },
  'invocations-v2/best-effort-candidates': {
    description:
      'Select coarse invocation candidates for the invocations list when VQueue-owned statuses cannot be resolved from one source.',
    shape:
      'SELECT id FROM sys_invocation_status WHERE status IN (…) [AND <filters>] [ORDER BY <sort> NULLS LAST] LIMIT ≤1000 [sampled: FROM (… LIMIT 1000000)]',
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/candidate-queue-count': {
    description:
      'Count matching VQueues to detect when the bounded queue selection made the invocations list partial.',
    shape:
      'SELECT COUNT(1) FROM (SELECT id FROM sys_vqueue_meta WHERE <queue filters> LIMIT 100001)',
    tables: ['sys_vqueue_meta'],
  },
  'invocations-v2/candidate-statuses-by-ids': {
    description:
      'Resolve VQueue-owned statuses for a bounded batch candidate set without hydrating invocation details.',
    shape:
      "SELECT entry_id, stage, status FROM sys_vqueue_entry_status WHERE entry_id IN (…) AND entry_kind = 'invocation'",
    tables: ['sys_vqueue_entry_status'],
  },
  'invocations-v2/candidates-from-state': {
    description:
      'Select running/backing-off invocation candidates from the small live-state table (invocations list fast path, servers without VQueues).',
    shape:
      'SELECT id FROM sys_invocation_state [WHERE in_flight IS (NOT) TRUE] LIMIT ≤1000',
    tables: ['sys_invocation_state'],
  },
  'invocations-v2/candidates-from-status': {
    description:
      'Select invocation candidates for the invocations list when the status table satisfies all filters (servers without VQueues).',
    shape:
      'SELECT id FROM sys_invocation_status [WHERE <filters>] [ORDER BY <sort>] LIMIT ≤1000 [sampled: FROM (… LIMIT 1000000)]',
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/candidates-from-status-and-state': {
    description:
      'Select invocation candidates for the invocations list, joining stored status with live state for running/ready predicates (servers without VQueues).',
    shape:
      'SELECT id FROM sys_invocation_status LEFT JOIN (SELECT id, in_flight, retry_count FROM sys_invocation_state) ON id [WHERE <filters>] [ORDER BY <sort>] LIMIT ≤1000 [sampled: FROM (… LIMIT 1000000)]',
    tables: ['sys_invocation_status', 'sys_invocation_state'],
  },
  'invocations-v2/candidates-from-status-planned': {
    description:
      'Select terminal-status invocation candidates from the status table within a VQueue-planned invocations list.',
    shape:
      'SELECT id FROM sys_invocation_status WHERE <status predicate> [AND <filters>] [ORDER BY <sort> NULLS LAST] LIMIT ≤1000 [sampled: FROM (… LIMIT 1000000)]',
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/candidates-from-vqueue-meta': {
    description:
      'Select invocation candidates for the invocations list from VQueues bounded by queue-level metadata filters.',
    shape:
      "SELECT entry_id FROM sys_vqueues WHERE id IN (SELECT id FROM sys_vqueue_meta WHERE <queue filters> LIMIT 100000) AND entry_kind = 'invocation' [AND <stage/status>] [ORDER BY <sort> NULLS LAST] LIMIT ≤1000",
    tables: ['sys_vqueues', 'sys_vqueue_meta'],
  },
  'invocations-v2/candidates-from-vqueues': {
    description:
      'Select invocation candidates for the invocations list directly from VQueue entries (preferred source).',
    shape:
      "SELECT entry_id FROM sys_vqueues WHERE entry_kind = 'invocation' [AND <stage/status>] [AND <filters>] [ORDER BY <sort> NULLS LAST] LIMIT ≤1000 [sampled: FROM (… LIMIT 1000000)]",
    tables: ['sys_vqueues'],
  },
  'invocations-v2/count-from-status-and-state': {
    description:
      'Count invocations matching the current filters, combining stored status with live execution state when needed.',
    shape:
      'SELECT COUNT(1) FROM sys_invocation_status [LEFT JOIN sys_invocation_state ON id] [WHERE <filters>] [sampled: FROM (… LIMIT 1000000)]',
    tables: ['sys_invocation_status', 'sys_invocation_state'],
  },
  'invocations-v2/count-from-status-planned': {
    description:
      'Count invocations matching the current filters from stored invocation status.',
    shape:
      'SELECT COUNT(1) FROM sys_invocation_status [WHERE <status/filter predicates>] [sampled: FROM (… LIMIT 1000000)]',
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/count-from-vqueue-meta': {
    description:
      'Count invocations matching the current filters, using queue metadata to narrow the VQueues scanned.',
    shape:
      "SELECT COUNT(1) FROM sys_vqueues WHERE id IN (SELECT id FROM sys_vqueue_meta WHERE <queue filters>) AND entry_kind = 'invocation' [AND <stage/status>] [sampled: FROM (… LIMIT 1000000)]",
    tables: ['sys_vqueues', 'sys_vqueue_meta'],
  },
  'invocations-v2/count-from-vqueues': {
    description:
      'Count invocations matching the current filters directly from VQueue entries.',
    shape:
      "SELECT COUNT(1) FROM sys_vqueues WHERE entry_kind = 'invocation' [AND <stage/status>] [AND <filters>] [sampled: FROM (… LIMIT 1000000)]",
    tables: ['sys_vqueues'],
  },
  'invocations-v2/finished-breakdown-from-status': {
    description:
      'Break down completed invocations into succeeded/failed for the Completed facet (servers without VQueues).',
    shape:
      "SELECT <outcome CASE>, COUNT(1) FROM sys_invocation_status WHERE status = 'completed' [AND completed_at >= ? AND < ?] GROUP BY outcome [sampled: FROM (… LIMIT 1000000)]",
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/finished-breakdown-from-vqueues': {
    description:
      'Break down finished invocation outcomes from VQueue entries for the Completed facet.',
    shape:
      "SELECT status, COUNT(1) FROM sys_vqueues WHERE stage = 'finished' AND entry_kind = 'invocation' [AND transitioned_at >= ? AND < ?] GROUP BY status [sampled: FROM (… LIMIT 1000000)]",
    tables: ['sys_vqueues'],
  },
  'invocations-v2/finished-history-from-status': {
    description:
      'Bucket completions into an epoch-aligned success/failure time series for the completion chart (servers without VQueues).',
    shape:
      "SELECT to_unixtime(date_bin(INTERVAL ?, completed_at, epoch)), COUNT(1) FILTER (WHERE completion_result = 'success'), COUNT(1) FILTER (WHERE completion_result = 'failure') FROM sys_invocation_status WHERE status = 'completed' AND completed_at >= ? AND < ? GROUP BY bucket",
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/finished-history-from-vqueues': {
    description:
      'Bucket finished VQueue outcomes into an epoch-aligned time series for the completion chart.',
    shape:
      "SELECT to_unixtime(date_bin(INTERVAL ?, transitioned_at, epoch)), COUNT(1) FILTER (WHERE status = 'succeeded'), COUNT(1) FILTER (WHERE status = 'failed'), COUNT(1) FILTER (WHERE status = 'cancelled'), COUNT(1) FILTER (WHERE status = 'killed') FROM sys_vqueues WHERE stage = 'finished' AND entry_kind = 'invocation' AND transitioned_at >= ? AND < ? GROUP BY bucket",
    tables: ['sys_vqueues'],
  },
  'invocations-v2/flow-control-meta': {
    description:
      'Hydrate queue counts and stage averages for the VQueues of the listed invocations.',
    shape:
      'SELECT <counters, stage averages> FROM sys_vqueue_meta WHERE id IN (…)',
    tables: ['sys_vqueue_meta'],
  },
  'invocations-v2/flow-control-scheduler': {
    description:
      'Hydrate scheduler status (blocked reasons, head entry) for the VQueues of the listed invocations.',
    shape: 'SELECT <scheduler columns> FROM sys_scheduler WHERE id IN (…)',
    tables: ['sys_scheduler'],
  },
  'invocations-v2/inbox-due-for-services': {
    description:
      'Compute due/not-due inbox counts for selected services from bounded VQueues (inbox breakdown).',
    shape:
      "SELECT COUNT(1) AS total, SUM(CASE WHEN first_runnable_at <= ?) AS due, SUM(CASE WHEN first_runnable_at > ?) AS not_due FROM sys_vqueues WHERE id IN (SELECT id FROM sys_vqueue_meta WHERE service_name IN (…) AND num_inbox > 0 LIMIT 100000) AND stage = 'inbox' AND entry_kind = 'invocation'",
    tables: ['sys_vqueues', 'sys_vqueue_meta'],
  },
  'invocations-v2/inbox-due-from-vqueues': {
    description:
      'Compute overall due/not-due inbox counts from VQueue entries (inbox breakdown).',
    shape:
      "SELECT COUNT(1) AS total, SUM(CASE WHEN first_runnable_at <= ?) AS due, SUM(CASE WHEN first_runnable_at > ?) AS not_due FROM sys_vqueues WHERE stage = 'inbox' AND entry_kind = 'invocation'",
    tables: ['sys_vqueues'],
  },
  'invocations-v2/inbox-due-running-by-service': {
    description:
      'Count running invocations per service to subtract from raw invoked rows (due breakdown, servers without VQueues).',
    shape:
      "SELECT [service,] COUNT(1) FROM sys_invocation_state JOIN sys_invocation_status ON id WHERE in_flight AND status = 'invoked' [AND service IN (…)] [GROUP BY service]",
    tables: ['sys_invocation_state', 'sys_invocation_status'],
  },
  'invocations-v2/inbox-due-running-count': {
    description:
      'Count running invocations to subtract from raw invoked rows (due breakdown, servers without VQueues).',
    shape: 'SELECT COUNT(1) FROM sys_invocation_state WHERE in_flight',
    tables: ['sys_invocation_state'],
  },
  'invocations-v2/inbox-due-status-by-service': {
    description:
      'Count stored inbox statuses per service for the due breakdown (servers without VQueues).',
    shape:
      "SELECT [service,] SUM(CASE WHEN status = 'inboxed') AS inboxed, SUM(CASE WHEN status = 'scheduled') AS scheduled, SUM(CASE WHEN status = 'invoked') AS invoked FROM sys_invocation_status WHERE status IN ('inboxed', 'scheduled', 'invoked') [AND service IN (…)] [GROUP BY service]",
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/inbox-due-status-counts': {
    description:
      'Count stored inbox statuses for the overall due breakdown (servers without VQueues).',
    shape:
      "SELECT SUM(CASE WHEN status = 'inboxed') AS inboxed, SUM(CASE WHEN status = 'scheduled') AS scheduled, SUM(CASE WHEN status = 'invoked') AS invoked FROM sys_invocation_status WHERE status IN ('inboxed', 'scheduled', 'invoked')",
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/inbox-state-by-service': {
    description:
      'Count running/backing-off invocations per service from live state (inbox breakdown, servers without VQueues).',
    shape:
      "SELECT [service,] SUM(CASE WHEN in_flight) AS running, SUM(CASE WHEN NOT in_flight AND retry_count > 0) AS backing_off FROM sys_invocation_state JOIN sys_invocation_status ON id WHERE status = 'invoked' [AND service IN (…)] [GROUP BY service]",
    tables: ['sys_invocation_state', 'sys_invocation_status'],
  },
  'invocations-v2/inbox-state-counts': {
    description:
      'Count running/backing-off invocations from live state (inbox breakdown, servers without VQueues).',
    shape:
      'SELECT SUM(CASE WHEN in_flight) AS running, SUM(CASE WHEN NOT in_flight AND retry_count > 0) AS backing_off FROM sys_invocation_state',
    tables: ['sys_invocation_state'],
  },
  'invocations-v2/inbox-status-by-service': {
    description:
      'Count stored inbox statuses per service (inbox breakdown, servers without VQueues).',
    shape:
      "SELECT [service,] SUM(CASE WHEN status = 'inboxed') AS inboxed, SUM(CASE WHEN status = 'scheduled') AS scheduled, SUM(CASE WHEN status = 'invoked') AS invoked FROM sys_invocation_status WHERE status IN ('inboxed', 'scheduled', 'invoked') [AND service IN (…)] [GROUP BY service]",
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/inbox-status-counts': {
    description:
      'Count stored inbox statuses for the overall breakdown (servers without VQueues).',
    shape:
      "SELECT SUM(CASE WHEN status = 'inboxed') AS inboxed, SUM(CASE WHEN status = 'scheduled') AS scheduled, SUM(CASE WHEN status = 'invoked') AS invoked FROM sys_invocation_status WHERE status IN ('inboxed', 'scheduled', 'invoked')",
    tables: ['sys_invocation_status'],
  },
  'invocations-v2/inbox-status-for-services': {
    description:
      'Break down inbox entry statuses for selected services from bounded VQueues.',
    shape:
      "SELECT status, COUNT(1) FROM sys_vqueues WHERE id IN (SELECT id FROM sys_vqueue_meta WHERE service_name IN (…) AND num_inbox > 0 LIMIT 100000) AND stage = 'inbox' AND entry_kind = 'invocation' GROUP BY status",
    tables: ['sys_vqueues', 'sys_vqueue_meta'],
  },
  'invocations-v2/inbox-status-from-vqueues': {
    description: 'Break down overall inbox entry statuses from VQueue entries.',
    shape:
      "SELECT status, COUNT(1) FROM sys_vqueues WHERE stage = 'inbox' AND entry_kind = 'invocation' GROUP BY status [sampled: FROM (… LIMIT 1000000)]",
    tables: ['sys_vqueues'],
  },
  'invocations-v2/rows-by-ids': {
    description:
      'Hydrate complete invocation rows for the invocations list’s selected candidate ids.',
    shape:
      'SELECT <list columns> FROM sys_invocation WHERE id IN (≤500 ids) [AND <filters>] [ORDER BY <sort> NULLS LAST]',
    tables: ['sys_invocation'],
  },
  'invocations-v2/summary-from-status-and-state': {
    description:
      'Group filtered invocation counts by service and status for the invocations summary.',
    shape:
      'SELECT service, <status CASE>, COUNT(1) FROM sys_invocation_status LEFT JOIN sys_invocation_state ON id [WHERE <filters>] GROUP BY service, bucket [sampled: FROM (… LIMIT 1000000)]',
    tables: ['sys_invocation_status', 'sys_invocation_state'],
  },
  'invocations-v2/summary-vqueue-finished': {
    description:
      'Break down finished-entry outcomes for the invocations summary’s Completed stage.',
    shape:
      "SELECT status, COUNT(1) FROM sys_vqueues WHERE stage = 'finished' AND entry_kind = 'invocation' [AND id IN (SELECT id FROM sys_vqueue_meta WHERE <filters> AND num_finished > 0 LIMIT 100000)] GROUP BY status [sampled: FROM (… LIMIT 1000000)]",
    tables: ['sys_vqueues', 'sys_vqueue_meta'],
  },
  'invocations-v2/summary-vqueue-inbox': {
    description:
      'Break down inbox-stage entry statuses for the invocations summary’s Inbox stage.',
    shape:
      "SELECT status, COUNT(1) FROM sys_vqueues WHERE stage = 'inbox' AND entry_kind = 'invocation' [AND id IN (SELECT id FROM sys_vqueue_meta WHERE <filters> AND num_inbox > 0 LIMIT 100000)] GROUP BY status [sampled: FROM (… LIMIT 1000000)]",
    tables: ['sys_vqueues', 'sys_vqueue_meta'],
  },
  'invocations-v2/summary-vqueue-meta': {
    description:
      'Aggregate stage counts per service from VQueue metadata for the invocations summary.',
    shape:
      'SELECT service_name, SUM(num_inbox), SUM(num_running), SUM(num_suspended), SUM(num_paused) [, SUM(num_finished)] FROM sys_vqueue_meta WHERE <activity/filters> GROUP BY service_name',
    tables: ['sys_vqueue_meta'],
  },
  'invocations-v2/vqueue-status-by-ids': {
    description:
      'Hydrate the VQueue status overlay for the invocation rows being listed.',
    shape:
      "SELECT <status columns> FROM sys_vqueue_entry_status WHERE entry_id IN (…) AND entry_kind = 'invocation' [AND <filters>] [ORDER BY <sort> NULLS LAST]",
    tables: ['sys_vqueue_entry_status'],
  },
  'limits/counters-page': {
    description:
      'List limit counters (filtered, sorted, paginated) for the Flow Control Counters table.',
    shape:
      'SELECT <counter columns> FROM sys_user_limits [WHERE rule_pattern = ? | rule_pattern IS NOT NULL | <filters> | <search ILIKE>] ORDER BY <multi-key sort> LIMIT ≤1001',
    tables: ['sys_user_limits'],
  },
  'limits/rule': {
    description:
      'Fetch a single limit rule by exact pattern for the rule detail and edit views.',
    shape: 'SELECT <rule columns> FROM sys_rules WHERE pattern = ?',
    tables: ['sys_rules'],
  },
  'limits/rules-counter-stats': {
    description:
      'Aggregate limit-counter totals and backlogged counts per listed rule (Rules table).',
    shape:
      'SELECT rule_pattern, COUNT(*), SUM(CASE WHEN num_waiters > 0) FROM sys_user_limits WHERE rule_pattern IN (…) GROUP BY rule_pattern',
    tables: ['sys_user_limits'],
  },
  'limits/rules-page': {
    description:
      'List limit rules (sorted, paginated) for the Flow Control Rules table.',
    shape:
      'SELECT <rule columns> FROM sys_rules [WHERE pattern = ?] ORDER BY pattern ASC|DESC LIMIT ≤1001',
    tables: ['sys_rules'],
  },
  'metrics/summary': {
    description:
      'Aggregate server-wide throughput and capacity gauges for the Overview metrics strip.',
    shape:
      'SELECT <all gauges> FROM (SELECT SUM(invocations), SUM(events), SUM(actions), SUM(invoker_to_service_throughput), SUM(invoker_available_slots), SUM(invoker_used_slots) FROM metrics_processor) CROSS JOIN (SELECT SUM(throughput), SUM(current_connections), SUM(waiting_invocations) FROM metrics_node) CROSS JOIN (SELECT SUM(append_rate) FROM metrics_log)',
    tables: ['metrics_processor', 'metrics_node', 'metrics_log'],
  },
  'state/entries-page': {
    description:
      'Load one page of a state object’s entries (keyset-paginated) for the state entries table.',
    shape:
      'SELECT key, value_length, CASE value_length <= 64KiB THEN value END FROM state WHERE service_name = ? AND service_key = ? [AND scope …] [AND key > cursor] ORDER BY key LIMIT ≤1001',
    tables: ['state'],
  },
  'state/get': {
    description:
      'Fetch the complete K/V state of one service key for the state editor and lazy value popovers.',
    shape:
      'SELECT key, value FROM state WHERE service_name = ? AND service_key = ? [AND scope …] [AND key IN (…)]',
    tables: ['state'],
  },
  'state/keys': {
    description:
      'Discover the distinct state keys a service uses to build the state table columns.',
    shape:
      'SELECT DISTINCT key FROM state WHERE service_name = ? [AND service_key IN (…)] [AND scope …] GROUP BY key',
    tables: ['state'],
  },
  'state/object-size': {
    description:
      'Count the state keys and total stored bytes of one state object for the virtual object and workflow stats cards.',
    shape:
      'SELECT COUNT(*), SUM(value_length) FROM state WHERE service_name = ? AND service_key = ? [AND scope …]',
    tables: ['state'],
  },
  'state/objects': {
    description:
      'Find the state objects (keys/scopes) of a service matching the current filters for the State page.',
    shape:
      'SELECT DISTINCT service_key [, scope] FROM state WHERE <filters> LIMIT 301',
    tables: ['state'],
  },
  'state/preview': {
    description:
      'Fetch a bounded preview of small state values for the visible page of state objects.',
    shape:
      'SELECT service_key [, scope], key, value_length, value FROM state WHERE service_name = ? AND service_key IN (…) [AND scope …] AND value_length <= 2048 LIMIT 1500',
    tables: ['state'],
  },
  'state/services': {
    description:
      'List the services that currently store K/V state for the State page’s service list.',
    shape: 'SELECT DISTINCT service_name FROM state ORDER BY service_name',
    tables: ['state'],
  },
  'state/storage-size': {
    description:
      'Aggregate stored K/V state size per service for the storage breakdown.',
    shape:
      'SELECT service_name, SUM(value_length) FROM state GROUP BY service_name ORDER BY service_name',
    tables: ['state'],
  },
  'virtual-objects/backlogs-from-inbox': {
    description:
      'Count inbox backlog per selected virtual object instance (servers without VQueues).',
    shape:
      'SELECT service_key, COUNT(*) FROM sys_inbox WHERE service_name = ? AND (<identity OR-list>) GROUP BY service_key',
    tables: ['sys_inbox'],
  },
  'virtual-objects/backlogs-from-vqueue-meta': {
    description:
      'Sum inbox backlog per selected virtual object instance from VQueue metadata.',
    shape:
      'SELECT lock_name, scope, SUM(num_inbox) FROM sys_vqueue_meta WHERE [partition_key IN (…) AND] service_name = ? AND (<identity OR-list>) GROUP BY lock_name, scope',
    tables: ['sys_vqueue_meta'],
  },
  'virtual-objects/identities-by-backlog': {
    description:
      'Rank virtual object instances by inbox backlog when the Instances table sorts by backlog.',
    shape:
      'SELECT lock_name, scope, SUM(num_inbox) AS backlog FROM sys_vqueue_meta WHERE service_name = ? AND num_inbox > 0 [AND <search/filters>] GROUP BY lock_name, scope ORDER BY backlog DESC, lock_name, scope LIMIT 51',
    tables: ['sys_vqueue_meta'],
  },
  'virtual-objects/identities-by-backlog-legacy': {
    description:
      'Rank virtual object instances by inbox backlog when the Instances table sorts by backlog (servers without VQueues).',
    shape:
      'SELECT service_key, COUNT(*) AS backlog FROM sys_inbox WHERE service_name = ? [AND <search/filters>] GROUP BY service_key ORDER BY backlog DESC, service_key ASC LIMIT 51',
    tables: ['sys_inbox'],
  },
  'virtual-objects/identities-from-invocations': {
    description:
      'Discover virtual object instances with non-completed invocations targeting them (Instances table).',
    shape:
      "SELECT DISTINCT [partition_key,] target_service_key [, scope] FROM sys_invocation_status WHERE target_service_name = ? AND target_service_ty = 'virtual_object' AND status <> 'completed' [AND <search/filters>] LIMIT 51",
    tables: ['sys_invocation_status'],
  },
  'virtual-objects/identities-from-state': {
    description:
      'Discover virtual object instances that hold state (Instances table).',
    shape:
      'SELECT DISTINCT [partition_key,] service_key [, scope] FROM state WHERE service_name = ? [AND <search/filters>] LIMIT 51',
    tables: ['state'],
  },
  'virtual-objects/identities-from-vqueue-meta': {
    description:
      'Discover virtual object instances with unfinished queue entries from VQueue metadata (Instances table).',
    shape:
      'SELECT DISTINCT [partition_key,] lock_name, scope FROM sys_vqueue_meta WHERE service_name = ? AND (num_inbox > 0 OR num_running > 0 OR …) [AND <search/filters>] LIMIT 51',
    tables: ['sys_vqueue_meta'],
  },
  'virtual-objects/inbox-count': {
    description:
      'Sum a virtual object’s inbox size from its VQueue metadata for the Inbox panel.',
    shape:
      'SELECT SUM(num_inbox) FROM sys_vqueue_meta WHERE service_name = ? AND lock_name = ? AND scope …',
    tables: ['sys_vqueue_meta'],
  },
  'virtual-objects/inbox-count-legacy': {
    description:
      'Count a virtual object’s inbox entries for the Inbox panel (servers without VQueues).',
    shape:
      'SELECT COUNT(*) FROM sys_inbox WHERE service_name = ? AND service_key = ?',
    tables: ['sys_inbox'],
  },
  'virtual-objects/inbox-entries-legacy': {
    description:
      'Read the first page of a virtual object’s inbox (servers without VQueues).',
    shape:
      'SELECT id FROM sys_inbox WHERE service_name = ? AND service_key = ? LIMIT 26',
    tables: ['sys_inbox'],
  },
  'virtual-objects/lock': {
    description:
      'Read the current holder of a virtual object’s exclusive lock.',
    shape:
      'SELECT acquired_by, acquired_at FROM sys_locks WHERE lock_name = ? AND scope … AND acquired_by IS NOT NULL LIMIT 1',
    tables: ['sys_locks'],
  },
  'virtual-objects/lock-from-keyed-status': {
    description:
      'Find the invocation holding a virtual object’s lock (servers without VQueues).',
    shape:
      'SELECT invocation_id FROM sys_keyed_service_status WHERE service_name = ? AND service_key = ? AND invocation_id IS NOT NULL LIMIT 1',
    tables: ['sys_keyed_service_status'],
  },
  'virtual-objects/locks-for-instances': {
    description:
      'Fetch lock holders for the listed virtual object instances (Instances table).',
    shape:
      'SELECT lock_name, scope, acquired_by, acquired_at FROM sys_locks WHERE acquired_by IS NOT NULL AND (<identity OR-list>)',
    tables: ['sys_locks'],
  },
  'virtual-objects/locks-from-keyed-status': {
    description:
      'Fetch lock-holding invocations for the listed instances (servers without VQueues).',
    shape:
      'SELECT service_key, invocation_id FROM sys_keyed_service_status WHERE service_name = ? AND invocation_id IS NOT NULL AND (<identity OR-list>)',
    tables: ['sys_keyed_service_status'],
  },
  'virtual-objects/recent-invocation-ids': {
    description:
      'Select the most recent invocation ids targeting a virtual object key for its Invocations panel.',
    shape:
      "SELECT id FROM sys_invocation_status WHERE target_service_ty = 'virtual_object' AND target_service_name = ? AND target_service_key = ? [AND scope …] ORDER BY created_at DESC NULLS LAST LIMIT 51",
    tables: ['sys_invocation_status'],
  },
  'virtual-objects/scoped-inbox-entries': {
    description:
      'Read the earliest inbox entries across a scoped virtual object’s VQueues.',
    shape:
      "SELECT <entry columns> FROM sys_vqueues WHERE id IN (SELECT id FROM sys_vqueue_meta WHERE service_name = ? AND lock_name = ? AND scope = ? AND num_inbox > 0 LIMIT 250) AND stage = 'inbox' ORDER BY run_at ASC NULLS LAST LIMIT 26",
    tables: ['sys_vqueues', 'sys_vqueue_meta'],
  },
  'virtual-objects/stats-oldest-inboxed': {
    description:
      'Find the oldest inbox entry timestamp across the object’s VQueues for the Stats card.',
    shape:
      "SELECT MIN(transitioned_at) FROM sys_vqueues WHERE id IN (SELECT id FROM sys_vqueue_meta WHERE service_name = ? AND lock_name = ? AND scope … AND num_inbox > 0) AND stage = 'inbox'",
    tables: ['sys_vqueues', 'sys_vqueue_meta'],
  },
  'virtual-objects/stats-vqueue-meta': {
    description:
      'Summarize a virtual object’s VQueue inbox duration range, contributing queue count, current inbox count, and latest enqueue time.',
    shape:
      'SELECT COUNT(last_attempt_at), MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_inbox_duration END), MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_inbox_duration END), SUM(num_inbox), MAX(last_enqueued_at) FROM sys_vqueue_meta WHERE service_name = ? AND lock_name = ? AND scope …',
    tables: ['sys_vqueue_meta'],
  },
  'virtual-objects/vqueue-id-lookup': {
    description:
      'Resolve the VQueue id backing a virtual object before reading its inbox.',
    shape:
      'SELECT id FROM sys_vqueue_meta WHERE service_name = ? AND lock_name = ? AND scope … LIMIT 1',
    tables: ['sys_vqueue_meta'],
  },
  'vqueues/entry-details': {
    description:
      'Hydrate VQueue entry status details for the queue entries being displayed (inbox and lock views).',
    shape:
      "SELECT <status columns> FROM sys_vqueue_entry_status WHERE entry_id IN (…) [AND stage <> 'finished']",
    tables: ['sys_vqueue_entry_status'],
  },
  'vqueues/entry-statuses': {
    description:
      'Hydrate the VQueue scheduling status of the invocations shown in tables and details.',
    shape:
      "SELECT <status columns> FROM sys_vqueue_entry_status WHERE entry_id IN (…) AND entry_kind = 'invocation'",
    tables: ['sys_vqueue_entry_status'],
  },
  'vqueues/focus-entry': {
    description:
      'Read the focused entry’s VQueue status and block durations for the VQueue snapshot.',
    shape:
      "SELECT <status + block-duration columns> FROM sys_vqueue_entry_status WHERE entry_id = ? AND entry_kind = 'invocation'",
    tables: ['sys_vqueue_entry_status'],
  },
  'vqueues/focus-entry-position': {
    description:
      'Compute the focused entry’s position within the VQueue inbox order.',
    shape:
      "SELECT position FROM (SELECT entry_id, ROW_NUMBER() OVER (ORDER BY has_lock DESC, run_at, sequence_number, entry_id) FROM sys_vqueues WHERE id = ? AND stage = 'inbox') WHERE entry_id = ?",
    tables: ['sys_vqueues'],
  },
  'vqueues/inbox-entries': {
    description:
      'Read the first page of a VQueue’s inbox-stage entries in queue order.',
    shape:
      "SELECT <entry columns> FROM sys_vqueues WHERE id = ? AND stage = 'inbox' LIMIT 26",
    tables: ['sys_vqueues'],
  },
  'vqueues/landing-top-up': {
    description:
      'Top up the VQueues landing view with idle-but-recent or paused queues.',
    shape:
      'SELECT <meta columns> FROM sys_vqueue_meta WHERE <unfinished sum> = 0 AND (queue_is_paused OR GREATEST(<activity timestamps>) > now() - 24h) LIMIT ≤251',
    tables: ['sys_vqueue_meta'],
  },
  'vqueues/list-page': {
    description:
      'List VQueues matching the current filters and sort for the VQueues table.',
    shape:
      'SELECT <meta columns> FROM sys_vqueue_meta [WHERE <filters>] [ORDER BY <multi-key sort> NULLS LAST] LIMIT ≤251',
    tables: ['sys_vqueue_meta'],
  },
  'vqueues/metadata-by-ids': {
    description:
      'Hydrate VQueue metadata for the discovered busiest queue ids (VQueues landing view).',
    shape:
      'SELECT <meta columns> FROM sys_vqueue_meta WHERE id IN (…) ORDER BY <unfinished sum> DESC, …',
    tables: ['sys_vqueue_meta'],
  },
  'vqueues/scheduler-states': {
    description:
      'Fetch scheduler status (blocked reasons, head entry) for the listed VQueues.',
    shape: 'SELECT <scheduler columns> FROM sys_scheduler WHERE id IN (…)',
    tables: ['sys_scheduler'],
  },
  'vqueues/snapshot-meta': {
    description:
      'Read a VQueue’s metadata (counts, stage averages, activity) for the VQueue details snapshot.',
    shape: 'SELECT <meta columns> FROM sys_vqueue_meta WHERE id = ?',
    tables: ['sys_vqueue_meta'],
  },
  'vqueues/snapshot-scheduler': {
    description:
      'Read a VQueue’s scheduler state joined with its head entry status for the details snapshot.',
    shape:
      'SELECT s.<scheduler>, h.<head status> FROM sys_scheduler s LEFT JOIN sys_vqueue_entry_status h ON h.vqueue_id = s.id AND h.entry_id = s.head_entry_id WHERE s.id = ?',
    tables: ['sys_scheduler', 'sys_vqueue_entry_status'],
  },
  'vqueues/stage-entries': {
    description:
      'Fetch one stage’s entries (Inbox, Running, …) for the VQueue details tabs.',
    shape:
      'SELECT <entry columns> FROM sys_vqueues WHERE id = ? AND stage = ? LIMIT 26',
    tables: ['sys_vqueues'],
  },
  'vqueues/workload-discovery': {
    description:
      'Discover the VQueues with the most unfinished entries for the default VQueues landing view.',
    shape:
      "SELECT id, COUNT(*) AS workload FROM sys_vqueues WHERE stage IN ('inbox', 'running', 'suspended', 'paused') GROUP BY id ORDER BY workload DESC LIMIT ≤251",
    tables: ['sys_vqueues'],
  },
  'workflows/last-interaction': {
    description:
      'Find the latest non-run interaction with a workflow run for its stats card.',
    shape:
      "SELECT MAX(created_at) FROM sys_invocation_status WHERE target_service_name = ? AND target_service_ty = 'workflow' AND target_service_key = ? AND target_handler_name <> ? [AND scope …]",
    tables: ['sys_invocation_status'],
  },
  'workflows/pending-promises': {
    description:
      'Count a workflow run’s pending durable promises for its stats card.',
    shape:
      'SELECT COUNT(*) FROM sys_promise WHERE service_name = ? AND service_key = ? [AND scope …] AND completed = false',
    tables: ['sys_promise'],
  },
  'workflows/interactions': {
    description:
      'Select recent retained interactions with a workflow run for its details page.',
    shape:
      "SELECT id FROM sys_invocation_status WHERE target_service_name = ? AND target_service_ty = 'workflow' AND target_service_key = ? AND target_handler_name <> ? [AND scope …] ORDER BY created_at DESC NULLS LAST LIMIT 51",
    tables: ['sys_invocation_status'],
  },
  'workflows/run-invocation-lookup': {
    description: 'Resolve the invocation id of a workflow run’s run handler.',
    shape:
      "SELECT id FROM sys_invocation_status WHERE target_service_name = ? AND target_service_ty = 'workflow' AND target_service_key = ? AND target_handler_name = ? [AND scope …] LIMIT 1",
    tables: ['sys_invocation_status'],
  },
  'workflows/run-stage': {
    description:
      'Read the run invocation’s VQueue stage and timing for the workflow stats card.',
    shape:
      "SELECT stage, transitioned_at, first_attempt_at, first_runnable_at FROM sys_vqueue_entry_status WHERE entry_id = ? AND entry_kind = 'invocation' LIMIT 1",
    tables: ['sys_vqueue_entry_status'],
  },
  'workflows/runs-page': {
    description:
      'Select the most recent workflow-run invocation ids matching search and filters for the Workflow runs table.',
    shape:
      "SELECT id FROM sys_invocation_status WHERE target_service_name = ? AND target_service_ty = 'workflow' AND target_handler_name = ? [AND <search LIKE>] [AND <filters>] ORDER BY created_at DESC NULLS LAST LIMIT 51",
    tables: ['sys_invocation_status'],
  },
} as const satisfies Record<string, QueryDefinition>;

export type QueryId = keyof typeof QUERY_DEFINITIONS;
