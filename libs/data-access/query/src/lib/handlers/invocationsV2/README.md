# Invocation query V2

Query-shape reference for the invocation APIs. `N` is the 250-row page limit;
`S` is the requested sample size. Bracketed clauses are request-dependent.

List and aggregate APIs use VQueue mode when the server advertises `vqueues`
and is Restate 1.7.2 or newer. Point APIs use the VQueue overlay whenever the
`vqueues` feature is present.

If the server advertises `vqueues_migration_skip_completed`, a separate list
branch keeps terminal candidates on invocation status. Finished APIs use
invocation status/state so retained pre-migration completions are not omitted.

Status ownership is per invocation. When an entry-status row is available,
VQueue status is authoritative. If that point lookup returns no row, retain
invocation status rather than hiding an existing invocation; this also covers
rows omitted by skip-completed migration.

## `POST /query/v2/invocations`

| Request                                              | Candidate query                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID equality/list                                     | Point-read `sys_invocation` and `sys_vqueue_entry_status`                                                                                                                 |
| Request requiring invocation-status filters/sort     | `sys_invocation_status [status + filters] [ORDER BY created_at/modified_at] LIMIT N`                                                                                      |
| Entire request available from VQueues                | `[stage/status-pruned] sys_vqueues [filters] [ORDER BY created_at/transitioned_at] LIMIT N`; omitted statuses means all VQueue entries                                    |
| Granular live statuses plus queue metadata filter    | `sys_vqueues WHERE id IN (SELECT id FROM sys_vqueue_meta WHERE service/scope/limit-key + counters LIMIT 100K) ... LIMIT N`                                                |
| Granular live statuses plus other invocation filters | Read at most 500 ordered IDs from `sys_invocation_status`, point-refine them through `sys_vqueue_entry_status`, and report a full candidate set as partial; no pagination |
| Live plus terminal during skip-completed migration   | Run terminal `sys_invocation_status` and live VQueue source plans in parallel when they share the sort; otherwise use status plus VQueue point refinement                 |
| Legacy server                                        | `sys_invocation_status` plus the small `sys_invocation_state` table only when live state requires it                                                                      |

Candidate plans are named by their physical source: `sys_invocation_status`,
best-effort `sys_invocation_status`, `sys_vqueues`, or
`sys_vqueue_meta + sys_vqueues`. Each source independently reports `none`,
`partial`, or `full` after checking its columns against the server version and
advertised features. The executor takes the preferred full plan; otherwise it
runs only enough partial plans to cover every requested status, then merges and
deduplicates their results during common hydration.

Full-plan preference is direct `sys_vqueues`, exact `sys_invocation_status`,
bounded `sys_vqueue_meta + sys_vqueues`, then best-effort
`sys_invocation_status`.

The metadata branch runs `COUNT(*)` over the same queue predicates with
`LIMIT 1,000,001` in parallel. Reaching the sentinel returns
`isPartial: true` and `partial.reason: 'vqueue-limit'`. There is no
`sys_vqueues`/`sys_invocation_status` population join.

Sampled mode puts `LIMIT S` on the candidate population before request
predicates. The service branch samples `sys_vqueues` and keeps the bounded
metadata semi-join.

| Filters                                                                                                                                          | Sorts                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| ID/status, target service/type/key/handler, pinned deployment, caller fields, idempotency, created/modified/completed time, scope, and limit key | none, created, modified, transitioned |

`invocationListFields.ts` is the source of truth for API filter/sort exposure,
physical column names, the Restate version that introduced each column, and
its required advertised feature flag.

Hydration point-reads `sys_invocation` and `sys_vqueue_entry_status` in
parallel and rechecks filters/status. Candidate queries return only IDs. The
hydration query that owns the requested sort applies `ORDER BY`, and its row
order is preserved while the other result is merged by ID. `created_at` is the
shared cross-source sort. `modified_at` drives one bounded invocation-status
query with VQueue point refinement. `transitioned_at` requires the complete
selected population to come from VQueues; it is rejected for invocation-owned
filters and terminal selections omitted by migration.

## `POST /query/v2/invocations/summary`

Fields listed in `highlightFields` are omitted from SQL and returned as
`isIncluded` on the response-defined buckets. Every other filter is applied to
the aggregate population.

| Scenario                           | Query shape                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| VQueue stages                      | Exact service/stage counters from `sys_vqueue_meta`                                                             |
| VQueue stages with service filter  | The same metadata counters with `vm.service_name IN (...)`                                                      |
| VQueue breakdowns                  | Independent stage-pruned inbox and finished status aggregates from `sys_vqueues`                                |
| VQueue, sampled scope/limit filter | Exact filtered metadata counters; sampled breakdowns use a bounded metadata-ID semi-join                        |
| Applied service or other filter    | Filtered `sys_invocation_status LEFT JOIN sys_invocation_state`, grouped by service and response-defined bucket |
| No VQueue stages                   | Grouped `sys_invocation_status` aggregate and small in-flight state/status join in parallel                     |
| No VQueue breakdowns               | Filtered `sys_invocation_status LEFT JOIN sys_invocation_state`                                                 |
| Skip-completed migration           | VQueue metadata/inbox; terminal success/failure from `sys_invocation_status`                                    |

The response keeps coarse `stageBuckets` separate from `statusBuckets`, so
exact metadata totals are not reconstructed from rounded status estimates. The
status/state branch uses `in_flight` for Running and groups the remaining raw
`invoked` population as Ready/Yielded/Backing off. Sampled mode limits
invocation status before the join. Each service summary bucket carries the coarse
breakdown already produced by the same query; VQueue-native service summary buckets use
Inbox/Running/Suspended/Paused/Completed metadata counters.

The page first requests `view: 'stages'`. If a returned stage has
`breakdownCanRefine`, the hook requests `view: 'breakdowns'` from this same
endpoint and merges the result. A status/state response is already coarse and
does not trigger another request. The chart always renders the response-defined
stage and status buckets with separate stage and breakdown loading states.

## `POST /query/v2/invocations/inbox`

`groupBy: 'due'` and `groupBy: 'status'` are separate query shapes.

| Grouping | Scenario                       | Query shape                                                                                                                                                 |
| -------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Due      | VQueue overall                 | `SELECT COUNT(*), SUM(CASE first_runnable_at <= asOf ...) FROM sys_vqueues WHERE stage = 'inbox' AND entry_kind = 'invocation'`                             |
| Due      | VQueue selected services       | Same aggregate with `v.id IN (SELECT vm.id FROM sys_vqueue_meta vm WHERE service_name IN (...) AND num_inbox > 0 LIMIT 100000)`; always reported as partial |
| Due      | No VQueue overall              | Status aggregates for `inboxed/scheduled/invoked` `‖` running count from `sys_invocation_state WHERE in_flight`                                             |
| Due      | No VQueue service filter/group | Service-aware status aggregate `‖` `sys_invocation_state sis JOIN sys_invocation_status ss` for the smaller running population                              |
| Status   | VQueue overall                 | Exact: aggregate the `stage = 'inbox'` scan. Sampled: aggregate `SELECT v.status ... LIMIT sampleSize`; saturation reports `isPartial: true`                |
| Status   | VQueue selected services       | Same aggregate with the bounded metadata semi-join above; always reported as partial                                                                        |
| Status   | No VQueue overall              | Status aggregates for `inboxed/scheduled/invoked` `‖` running/backing-off aggregates from `sys_invocation_state`                                            |
| Status   | No VQueue service filter/group | Service-aware status aggregate `‖` state-to-status join for running/backing-off by service                                                                  |

Legacy due is `inboxed + invoked - running`; scheduled is not due. Legacy ready
is `invoked - running - backing-off`. VQueue service filtering remains bounded;
service grouping is not supported. Service-filtered results conservatively set
`isPartial` and `partial.reason: 'vqueue-limit'` without a second metadata scan.

## `POST /query/v2/invocations/finished-breakdown`

Sampled is the default mode. Time bounds are applied before `LIMIT S`.

| Scenario          | Query shape                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| VQueue exact      | `SELECT status, COUNT(*) FROM sys_vqueues WHERE stage = 'finished' AND entry_kind = 'invocation' [AND transitioned_at range] GROUP BY status`  |
| VQueue sampled    | Aggregate `(SELECT status FROM sys_vqueues WHERE stage = 'finished' AND entry_kind = 'invocation' [AND transitioned_at range] LIMIT S)`        |
| No VQueue exact   | Aggregate `sys_invocation_status WHERE status = 'completed' [AND completed_at range]`; map success to `succeeded`, everything else to `failed` |
| No VQueue sampled | Same aggregation over `(SELECT completion_result FROM sys_invocation_status WHERE status = 'completed' [AND completed_at range] LIMIT S)`      |

## `POST /query/v2/invocations/finished-history`

| Scenario  | Query shape                                                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VQueue    | `SELECT date_bin(interval, transitioned_at), COUNT(*) FILTER (WHERE status = <outcome>) FROM sys_vqueues WHERE stage = 'finished' AND entry_kind = 'invocation' AND transitioned_at >= start AND transitioned_at < end GROUP BY bucket` |
| No VQueue | `SELECT date_bin(interval, completed_at), COUNT(*) FILTER (WHERE completion_result = success/failure) FROM sys_invocation_status WHERE status = 'completed' AND completed_at >= start AND completed_at < end GROUP BY bucket`           |

The handler fills missing buckets. VQueue returns four outcomes; invocation
status returns success versus a combined failure bucket.

## Point APIs

All queries for one ID or a bounded ID list run in parallel. The VQueue query
is omitted when the feature is unavailable.

| API                                | Query shape                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /query/invocations/:id`       | `sys_invocation WHERE id = ...` `‖` `sys_vqueue_entry_status WHERE entry_id IN (...)` |
| `POST /query/invocations/statuses` | Narrow `sys_invocation WHERE id IN (...)` `‖` the same entry-status lookup            |
| `GET /query/v2/invocations/:id`    | `sys_invocation` `‖` `sys_journal` `‖` `sys_journal_events` `‖` entry status          |

## Performance rules

- Use `sys_invocation` only after IDs are known.
- Use `sys_vqueue_entry_status` for point overlays, not list population scans.
- Keep positive VQueue stage predicates on population queries.
- Read `sys_vqueue_meta` counters directly for VQueue summaries.
- Add metadata/status/state joins only when the requested fields require them.
- In sampled list branches, put `LIMIT S` on the population before user
  filtering, sorting, and joins.
