# Invocation query V2

Query-shape reference for the invocation APIs. `N` is the 250-row page limit;
`S` is the requested sample size. Bracketed clauses are request-dependent.

List, aggregate and point APIs always use VQueues.

Status ownership is per invocation. When an entry-status row is available,
VQueue status is authoritative. If that point lookup returns no row, retain
invocation status rather than hiding an existing invocation.

## `POST /query/v2/invocations`

| Request                                              | Candidate query                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID equality/list                                     | Point-read `sys_invocation` and `sys_vqueue_entry_status`                                                                                                                 |
| Request requiring invocation-status filters/sort     | `sys_invocation_status [status + filters] [ORDER BY created_at/modified_at] LIMIT N`                                                                                      |
| Entire request available from VQueues                | `[stage/status-pruned] sys_vqueues [filters] [ORDER BY created_at/transitioned_at] LIMIT N`; omitted statuses means all VQueue entries                                    |
| Granular live statuses plus queue metadata filter    | `sys_vqueues WHERE id IN (SELECT id FROM sys_vqueue_meta WHERE service/scope/limit-key + counters LIMIT 100K) ... LIMIT N`                                                |
| Granular live statuses plus other invocation filters | Read at most 500 ordered IDs from `sys_invocation_status`, point-refine them through `sys_vqueue_entry_status`, and report a full candidate set as partial; no pagination |

Candidate plans are named by their physical source: `sys_invocation_status`,
best-effort `sys_invocation_status`, `sys_vqueues`, or
`sys_vqueue_meta + sys_vqueues`. Each source independently reports `none`,
`partial`, or `full` after checking that its table exposes the requested
columns. The executor takes the preferred full plan; otherwise it
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

`invocationListFields.ts` is the source of truth for API filter/sort exposure
and the physical column names per table.

Hydration point-reads `sys_invocation` and `sys_vqueue_entry_status` in
parallel and rechecks filters/status. Candidate queries return only IDs. The
hydration query that owns the requested sort applies `ORDER BY`, and its row
order is preserved while the other result is merged by ID. `created_at` is the
shared cross-source sort. `modified_at` drives one bounded invocation-status
query with VQueue point refinement. `transitioned_at` requires the complete
selected population to come from VQueues; it is rejected for invocation-owned
filters.

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
| Count-only, VQueue-compatible      | Scalar filtered `COUNT(1)` from `sys_vqueues`, optionally with a bounded metadata-ID semi-join                  |
| Count-only fallback                | Scalar filtered `COUNT(1)` from `sys_invocation_status`, joining state only for statuses that require it        |
| Applied service or other filter    | Filtered `sys_invocation_status LEFT JOIN sys_invocation_state`, grouped by service and response-defined bucket |

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
Batch dialogs request `view: 'count'`, which applies every filter and returns
only `total`; it does not produce or group breakdown buckets.

## `POST /query/v2/invocations/inbox`

`groupBy: 'due'` and `groupBy: 'status'` are separate query shapes.

| Grouping | Scenario                 | Query shape                                                                                                                                                 |
| -------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Due      | VQueue overall           | `SELECT COUNT(*), SUM(CASE first_runnable_at <= asOf ...) FROM sys_vqueues WHERE stage = 'inbox' AND entry_kind = 'invocation'`                             |
| Due      | VQueue selected services | Same aggregate with `v.id IN (SELECT vm.id FROM sys_vqueue_meta vm WHERE service_name IN (...) AND num_inbox > 0 LIMIT 100000)`; always reported as partial |
| Status   | VQueue overall           | Exact: aggregate the `stage = 'inbox'` scan. Sampled: aggregate `SELECT v.status ... LIMIT sampleSize`; saturation reports `isPartial: true`                |
| Status   | VQueue selected services | Same aggregate with the bounded metadata semi-join above; always reported as partial                                                                        |

VQueue service filtering remains bounded. Service-filtered results
conservatively set `isPartial` and `partial.reason: 'vqueue-limit'` without a
second metadata scan.

## `POST /query/v2/invocations/finished-breakdown`

Sampled is the default mode. Time bounds are applied before `LIMIT S`.

| Scenario       | Query shape                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| VQueue exact   | `SELECT status, COUNT(*) FROM sys_vqueues WHERE stage = 'finished' AND entry_kind = 'invocation' [AND transitioned_at range] GROUP BY status` |
| VQueue sampled | Aggregate `(SELECT status FROM sys_vqueues WHERE stage = 'finished' AND entry_kind = 'invocation' [AND transitioned_at range] LIMIT S)`       |

## Point APIs

All queries for one ID or a bounded ID list run in parallel.

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
