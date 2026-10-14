# `indexes_v1` stats and index tables

How the Restate server stores and exposes the `sys_*_stats` and `_idx_*` tables,
how they behave under DataFusion, and how this UI queries them. Keep this file
in sync with [`tables.ts`](./tables.ts) when the server changes.

Verified against restate `service-protocol-v8-stats` (`40ececdca`) and a live
`1.8.1-dev` server. History: on `1.8.0-rc.*` (`pr5400`, `ea576bde7`) stats were
written under `indexes_v1` without backfill, `sys_deployment_stats` had no
`status`, and `sys_virtual_object_stats` had `num_inbox … num_finished` columns.

## Feature gating

| Layer  | Name                               | Effect                                                                                                                                                                                                                                                      |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server | `indexes_v1` (`/version`)          | Server maintains the `_idx_*` tables.                                                                                                                                                                                                                       |
| Server | `track_status_gauges` (`/version`) | Server maintains the `sys_*_stats` tables (on by default from 1.9.0; experimental config on 1.8.1). **The stats tables are only visible in SQL while it is on.** The UI reads them whenever this is reported (`usesStatsTables(ctx)`); there is no UI flag. |
| UI     | `FEATURE_INDEXES_V1`               | Query layer may read `_idx_*` (`usesIndexesV1(ctx)`); enables the "Last transition at" sort. Requires server `indexes_v1`.                                                                                                                                  |

The pairing lives in `UI_FEATURE_SERVER_FEATURES` (`uiFeatures.ts`). The
admin-api middleware sends `x-restate-ui-features: indexes_v1` to the
in-browser `/query/*` handlers, each only when its server feature is reported.
Hooks see the same set through `useQueryHandlerFeatures`; see
[Server meta and feature flags](../../../../../admin-api/README.md#server-meta-and-feature-flags)
for when each side reads `/version` and the first-load caveat.

## How the server stores them

- Written in the same transaction as every VQueue entry/metadata change
  (`partition-store/src/vqueue_table/{index,stats}.rs`): index tables while the
  `indexes_v1` storage feature is on, stats while `track_status_gauges` is on.
- **Stats are backfilled.** Enabling `track_status_gauges` rebuilds the gauges
  at startup from entry status and invocation status
  (`stats/aggregated/backfill.rs`), so stats are complete.
- **Indexes are not backfilled.** Enabling `indexes_v1` on an existing store
  still logs `IndexesV1 feature backfill is not yet implemented`; entries
  created before that are missing from the `_idx_*` tables until rewritten or
  deleted.
- Keys are **per physical partition**. A SQL scan concatenates partitions, so
  "sorted" only holds within one partition.
- Entries = invocations **and** external state mutations. Entry indexes have no
  `kind` column; the UI returns all entries (no `entry_id LIKE 'inv_%'`).
- `partition_key` is derived from the id (`canonical_id` / `vqueue_id`). Don't
  select it: it's a UInt64 that loses precision as a JS number, and the server
  already routes point reads from id filters.

## Entry indexes (`_idx_entry_*`)

One row per VQueue entry. Columns: key columns + `entry_id` (invocation id, e.g.
`inv_…`) + `canonical_id` (`entry_id` + `_<seq>`; not used by the UI) +
`partition_key`.

| Table                                  | Physical key order                                                              | Natural order (per partition) | Rows                                        |
| -------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------- |
| `_idx_entry_by_stage`                  | `stage`, `transitioned_at DESC`, `canonical_id`                                 | `transitioned_at DESC`        | all entries                                 |
| `_idx_entry_by_service`                | **`stage`**, `service_name`, `transitioned_at DESC`, `canonical_id`             | `transitioned_at DESC`        | all entries                                 |
| `_idx_entry_by_virtual_object`         | `service_name`, `scope`, `key`, `stage`, `transitioned_at DESC`, `canonical_id` | `transitioned_at DESC`        | virtual-object targets only (not workflows) |
| `_idx_entry_next_at_by_stage`          | `stage`, `next_at`, `seq`, `canonical_id`                                       | `next_at ASC, seq ASC`        | all entries                                 |
| `_idx_entry_next_at_by_service`        | `stage`, `service_name`, `next_at`, `seq`, `canonical_id`                       | `next_at ASC, seq ASC`        | all entries                                 |
| `_idx_entry_next_at_by_virtual_object` | `service_name`, `scope`, `key`, `stage`, `next_at`, `seq`, `canonical_id`       | `next_at ASC, seq ASC`        | virtual-object targets only                 |

- `stage` ∈ `inbox | running | suspended | paused | finished` (VQueue stage,
  not the invocation status).
- `transitioned_at`: last stage change, millisecond precision (stored as a
  finer HLC timestamp).
- `next_at`: the entry's `run_at`, **second** precision; meaning depends on stage:
  inbox = when it may run (schedule/delay/backoff), suspended/paused =
  reschedule time, running = stale run-at, finished = deletion time
  (completion + retention; `MAX` for some state mutations).
- `seq`: per-VQueue sequence; breaks `next_at` ties.
- Finished entries stay until deleted (retention), so `finished` dominates row
  counts.

## Busy VQueue index (`_idx_busy_vqueue`)

One row per VQueue (kept with zero counts until the queue's metadata is
deleted). Key: `total_non_completed DESC`, `last_modified DESC`, `scope`,
`vqueue_id`. Value (covering): per-stage counts `num_inbox`, `num_running`,
`num_suspended`, `num_paused`, `num_finished`. `total_non_completed` = inbox +
running + suspended + paused. No paused-queue flag; no service/lock columns
(hydrate from `sys_vqueue_meta` by id).

## Stats tables (`sys_*_stats`)

Gauges keyed by dimensions; the value is a sparse map of counts per bucket.
Rows whose counts are all zero are **skipped by the scan** (removed at
compaction), so no `> 0` filter is needed.

| Table                      | Key (dimensions)                                                   | Buckets → columns                                    | Aggregation                                        |
| -------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------- |
| `sys_service_stats`        | `service_name`, `handler` (NULL for state mutations), `kind`       | `(stage, status)` → `stage`, `status`, `num_entries` | summed across partitions (view)                    |
| `sys_deployment_stats`     | `deployment_id`, `service_name`                                    | `(stage, status)` → `stage`, `status`, `num_entries` | summed across partitions (view)                    |
| `sys_virtual_object_stats` | `service_name`, `scope`, `key`, `handler`, `kind`, `partition_key` | `(stage, status)` → `stage`, `status`, `num_entries` | partition-local; one object lives in one partition |

- `kind` ∈ `invocation | state-mutation`.
- `stage` / `status` are value buckets, not keys: filtering on them is a row
  filter after the scan.
- `status` is the raw VQueue status (`new`, `scheduled`,
  `started`, `backing-off`, `yielded`, `succeeded`, `failed`, `cancelled`,
  `killed`, …); map to UI statuses with `getInvocationStatusFromVqueue`.
- Deployment stats only count entries that already have a deployment
  (assigned once an entry starts running).
- One VO stats row per `(object, handler, kind, stage, status)` — not per
  object; group by `key, scope` to get objects.

## Query behaviour (measured)

- **Pin leading keys** with `=` / `IN` / `IS NULL` (strings also support
  prefix `LIKE 'abc%'` natively). The scanner seeks to the matching prefix.
- **Unpinned leading keys are skip-scanned** (e.g. `_idx_entry_by_service`
  with only `service_name`: ~5 seeks per partition, one per stage).
- **Range on the time key** (`transitioned_at > '…'`, `next_at > now()`) is a
  seek/stop bound: ~2 ms.
- **`ORDER BY … LIMIT` does not stop early.** Tables declare no ordering and
  partitions are concatenated (`partitions=1` in plans), so DataFusion sorts
  (TopK) and the scan reads the whole pinned prefix; the TopK dynamic filter
  only reduces rows _emitted_. Measured: `stage='inbox'` ORDER BY LIMIT 100 ≈
  `COUNT(*)` of the stage. Server fix requested: one stream per partition +
  declared ordering.
- **No `ORDER BY` + `LIMIT`** stops early (~1 ms) but returns per-partition
  order only — fine for "no sort".
- Non-key predicates (e.g. `LIKE '%x%'`, value columns) are row filters, not
  seeks.
- Stats queries are tiny (one row per dimension combination); in the UI they
  look slow only when queued behind legacy scans.

## How this UI queries them

Table layouts live in [`tables.ts`](./tables.ts) (`defineIndexTable`: `keys`
in physical order, `order` = natural order, `columns`, and for list-backing
entry indexes `filters`: list filter field → index key). Use
`selectFromIndex` / `countFromIndex` from [`shared.ts`](./shared.ts): `WHERE`
is emitted in key order, `sorted: true` uses the natural order only, `orderBy`
passes a request-driven order through.

| Endpoint / handler                                     | Flag    | Table                                                                     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | ------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/v2/invocations/summary` (all views incl. `count`)    | stats   | `sys_service_stats` / `sys_deployment_stats` / `sys_virtual_object_stats` | `summary/statsSources.ts`: first source whose fields cover the filters (deployment needs a pinned deployment; VO stats needs `target_service_ty = virtual_object`, since workflows are not in it). Service/handler/deployment/scope/key filters go to SQL via `filterToSql` (same `LIKE` semantics as the legacy path); stage/status applied in JS. Always exact. The UI asks `canSummarizeInvocationsFromStats` first and then sends one exact `view: all` instead of stages + breakdowns + inbox |
| `/v2/invocations/inbox` (`groupBy: status`)            | stats   | `sys_service_stats`                                                       | `service_name` pinned in SQL; `stage = inbox` rows kept in JS                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `/v2/invocations` list + batch count                   | indexes | `_idx_entry_by_stage` / `_by_service` / `_by_virtual_object`              | `list/indexedInvocationCandidates.ts`; no sort ⇒ no `ORDER BY`; a sort maps the request field through the table's `sorts` and writes `ORDER BY <column> <request order>`, like `created_at`; a field not in `sorts` falls back to other sources                                                                                                                                                                                                                                                    |
| `/deployments/drained`                                 | stats   | `sys_deployment_stats`                                                    | `stage IN (inbox, running, suspended, paused)`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `/limits/vqueues` (landing / unfinished sort)          | indexes | `_idx_busy_vqueue`                                                        | then `sys_vqueue_meta` by id + `sys_scheduler`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `/virtual-objects/:service/instances`                  | stats   | `sys_virtual_object_stats`                                                | two queries in parallel: objects with a backlog (`stage = 'inbox'`, `GROUP BY key, scope`, `ORDER BY backlog DESC LIMIT 51`) and `SELECT DISTINCT key, scope … LIMIT 102` (no aggregation, stops early); merged with backlog objects first, the rest at 0. `stage` is not a scan filter, so both read the service's rows, but only objects with an inbox are aggregated and sorted                                                                                                                 |
| `/virtual-objects/:service/instances/:key/invocations` | indexes | `_idx_entry_by_virtual_object`                                            | sorted, `LIMIT 51`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `/virtual-objects/:service/instances/:key/inbox`       | indexes | `_idx_entry_next_at_by_virtual_object`                                    | `stage = 'inbox'`, sorted                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Unused today: `_idx_entry_next_at_by_stage`, `_idx_entry_next_at_by_service`
(parked "Up next" views). UI rule: `entryTablesSupportFilters` (from
`tables.ts` `filters` + VQueue-table fields) disables the sort option; a list
`400` on `transitioned_at` shows a "Sort by created at" notice.

## Checklist when the server version changes

1. Column shapes:
   `SELECT table_name, column_name, data_type FROM information_schema.columns
WHERE table_name LIKE '_idx%' OR table_name LIKE '%_stats' ORDER BY table_name`
   — compare with `tables.ts` (`columns`, row types).
2. Key order: `partition-store/src/index/{entry,virtual_object,vqueue}.rs`
   (`define_secondary_index!`) and `partition-store/src/stats/aggregated/*_load.rs`
   (`define_aggregated_stat!`) — update `keys` / `order` in `tables.ts`.
3. Native filters: `storage-api/src/index.rs`, `storage-api/src/stats/*.rs`
   (`define_filter!`) — which columns push down.
4. Ordering: `storage-query-datafusion/src/index/*/table.rs` — if the empty
   ordering (`Vec::new()`) is replaced by a declared ordering, `ORDER BY …
LIMIT` becomes cheap; re-measure with `EXPLAIN ANALYZE`.
5. Membership/semantics: `partition-store/src/vqueue_table/{index,stats}.rs`
   (which entries are indexed, `kind`, deployment assignment, which storage
   feature gates each), `features/indexes_v1.rs` and
   `features/aggregated_status_stats.rs` (backfill, enable conditions).
6. Visibility: `storage-query-datafusion/src/**/schema.rs` `visible_if(...)` —
   tables hidden unless a feature is on; map the server feature in
   `UI_FEATURE_SERVER_FEATURES` and the flag metadata.
7. New or renamed tables: `grep -rn "_idx_\|_stats" storage-query-datafusion/src`.
8. Query engine: `admin/src/rest_api/query.rs` — `/query` defaults to the v1
   engine unless configured; `x-restate-query-engine: v2` selects the
   experimental distributed engine (not used by the UI yet).
9. Run the query lib tests (full-SQL assertions) and the live smoke checks
   against the new server.
