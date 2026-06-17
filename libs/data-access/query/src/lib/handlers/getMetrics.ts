import type { components } from '@restate/data-access/admin-api-spec';
import { type QueryContext } from './shared';

const EXECUTION_METRICS_FEATURE = 'execution-metrics';

// Server-wide throughput + capacity metrics, each summed across every row of its
// source table. See the MetricsResponse schema in the OpenAPI spec for the
// authoritative per-field docs; the SQL column -> response field mapping and
// meaning of each one:
//
// PROCESSOR — metrics_processor (one row per partition-processor leader):
//   invocations                   -> invocations_per_sec: new invocations
//     started per second (+1 per new invocation's Command/Input entry).
//   events                        -> events_per_sec: journal events written per
//     second (every journal entry on the leader counts as one event).
//   actions                       -> actions_per_sec: user-facing billing/usage
//     actions per second — one per journal command, metered by payload (one
//     action per started 64 KiB: ceil(len / 64 KiB), min 1).
//   invoker_to_service_throughput -> invoker_mibps: invoker -> SDK deployment
//     throughput, MiB/s (new commands + replay).
//   invoker_used_slots            -> slots_used: invoker concurrency slots in
//     use (capacity - available) — invocations executing concurrently.
//   invoker_available_slots       -> slots_available: invoker slots free for new
//     invocations. An unlimited / not-yet-running invoker reports slots as (0, 0).
//
// INGRESS — metrics_node (one row per HTTP-ingress node):
//   throughput          -> ingress_mibps: ingress request + response body
//     throughput, MiB/s, turned into a rate by the sampler.
//   current_connections -> connections: currently open ingress connections
//     (live gauge).
//   waiting_invocations -> waiting: admitted in-flight ingress requests blocked
//     awaiting a result — request-response calls and attaches only (fire-and-
//     forget sends are excluded).
//
// DURABLE LOG — metrics_log (one row per log):
//   append_rate -> log_mibps: bytes appended to Bifrost per second, MiB/s; the
//     sum across logs is total durable-log write throughput.
const METRICS_QUERY = `SELECT
  p.invocations_per_sec, p.events_per_sec, p.actions_per_sec, p.invoker_mibps,
  p.slots_available, p.slots_used,
  n.ingress_mibps, n.connections, n.waiting,
  l.log_mibps
FROM
  (SELECT
     coalesce(sum(invocations), 0) AS invocations_per_sec,
     coalesce(sum(events), 0) AS events_per_sec,
     coalesce(sum(actions), 0) AS actions_per_sec,
     coalesce(sum(invoker_to_service_throughput), 0) AS invoker_mibps,
     coalesce(sum(invoker_available_slots), 0) AS slots_available,
     coalesce(sum(invoker_used_slots), 0) AS slots_used
   FROM metrics_processor) p
  CROSS JOIN (SELECT
     coalesce(sum(throughput), 0) AS ingress_mibps,
     coalesce(sum(current_connections), 0) AS connections,
     coalesce(sum(waiting_invocations), 0) AS waiting
   FROM metrics_node) n
  CROSS JOIN (SELECT
     coalesce(sum(append_rate), 0) AS log_mibps
   FROM metrics_log) l`;

export async function getMetrics(this: QueryContext) {
  if (!this.features.has(EXECUTION_METRICS_FEATURE)) {
    return Response.json({});
  }

  const { rows } = await this.query(METRICS_QUERY);
  // The cross-joined aggregates always yield exactly one coalesced row, but
  // fall back defensively so a missing row reports zeros rather than throwing.
  const row = (rows.at(0) ?? {}) as Partial<
    components['schemas']['MetricsResponse']
  >;
  const metrics: components['schemas']['MetricsResponse'] = {
    invocations_per_sec: row.invocations_per_sec ?? 0,
    events_per_sec: row.events_per_sec ?? 0,
    actions_per_sec: row.actions_per_sec ?? 0,
    invoker_mibps: row.invoker_mibps ?? 0,
    slots_available: row.slots_available ?? 0,
    slots_used: row.slots_used ?? 0,
    ingress_mibps: row.ingress_mibps ?? 0,
    connections: row.connections ?? 0,
    waiting: row.waiting ?? 0,
    log_mibps: row.log_mibps ?? 0,
  };
  return Response.json(metrics);
}
