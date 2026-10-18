import type { components } from '@restate/data-access-admin-api-spec';
import { createVirtualObjectLockHolder } from './getVirtualObjectLock.js';
import { quoteSqlString, type QueryContext } from './shared.js';
import {
  parseStructuredStringFilters,
  structuredStringFilterClause,
  type StructuredStringFilter,
} from './structuredStringFilters.js';
import {
  identityCandidateMatches,
  normalizeIdentityCandidates,
} from './identityCandidates.js';
import { usesStatsTables } from '../uiFeatures.js';
import { VIRTUAL_OBJECT_STATS } from './indexes/index.js';

const INSTANCE_LIMIT = 50;
const BACKLOG_DESC_SORT = { field: 'backlog', order: 'DESC' } as const;
const QUERY_LIMIT = INSTANCE_LIMIT + 1;
const MAX_SEARCH_LENGTH = 256;

export type ListVirtualObjectInstancesArgs =
  components['schemas']['ListVirtualObjectInstancesRequest'];
type VirtualObjectLockHolder = components['schemas']['VirtualObjectLockHolder'];
type VirtualObjectFilterField = 'key' | 'scope';

interface MutableInstance {
  key: string;
  scope?: string;
  partitionKey?: string;
  backlog?: number;
  lockHolder?: VirtualObjectLockHolder;
}

interface InstanceRow {
  object_key: unknown;
  scope?: unknown;
  partition_key?: unknown;
  backlog?: unknown;
}

function identityId(key: string, scope?: string) {
  return JSON.stringify([key, scope ?? null]);
}

function partitionKey(value: unknown) {
  if (value == null) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error(`Invalid partition key: ${String(value)}`);
  }
  return value;
}

function searchPattern(search: string | undefined) {
  if (!search) return undefined;
  const escaped = search
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
  return quoteSqlString(`%${escaped}%`);
}

function exactKeyFilterValue(
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
) {
  return filters.find(
    ({ field, operation }) => field === 'key' && operation === 'EQUALS',
  )?.value;
}

function addKnownObjectKey(rows: Record<string, unknown>[], objectKey: string) {
  return rows.map((row) => ({ ...row, object_key: objectKey }));
}

function addObjectKeyFromLockName(
  rows: Record<string, unknown>[],
  service: string,
) {
  const prefixLength = `${service}/`.length;
  return rows.map((row) => ({
    ...row,
    object_key: String(row['lock_name']).slice(prefixLength),
  }));
}

function identityFilterClause(
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
  keyExpression: string,
  options: {
    keyEqualsExpression?: string;
    keyEqualsValue?: (value: string) => string;
    searchOnNewLine?: boolean;
  } = {},
) {
  const pattern = searchPattern(search);
  const searchClause = pattern
    ? `${options.searchOnNewLine !== false ? '\n      ' : ' '}AND (${keyExpression} LIKE ${pattern} OR scope LIKE ${pattern})`
    : '';
  const filterClause = structuredStringFilterClause(filters, {
    key: options.keyEqualsExpression
      ? {
          expression: keyExpression,
          equalsExpression: options.keyEqualsExpression,
          equalsValue: options.keyEqualsValue,
        }
      : keyExpression,
    scope: 'scope',
  });
  return `${searchClause}${filterClause}`;
}

function buildVirtualObjectIdentitiesFromVqueueMetaQuery(
  service: string,
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
  includePartitionKey: boolean,
  counterPredicates: string[],
) {
  const objectKey = `SUBSTR(lock_name, CHAR_LENGTH(${quoteSqlString(`${service}/`)}) + 1)`;
  const exactKey = exactKeyFilterValue(filters);
  const hasKeyFilter = filters.some(({ field }) => field === 'key');
  const filterClause = identityFilterClause(search, filters, objectKey, {
    keyEqualsExpression: 'lock_name',
    keyEqualsValue: (value) => `${service}/${value}`,
  });
  const counters = counterPredicates.join('\n        OR ');
  const partitionKeyColumn = includePartitionKey
    ? '      CAST(partition_key AS VARCHAR) AS partition_key,\n'
    : '';
  const lockNameColumn = exactKey === undefined ? '      lock_name,\n' : '';
  const lockNameClause = hasKeyFilter
    ? ''
    : '\n      AND lock_name IS NOT NULL';
  return `SELECT DISTINCT
${partitionKeyColumn}${lockNameColumn}      scope
    FROM sys_vqueue_meta
    WHERE service_name = ${quoteSqlString(service)}${lockNameClause}
      AND (
        ${counters}
      )${filterClause}
    LIMIT ${QUERY_LIMIT}`;
}

function virtualObjectIdentitiesFromVqueueMetaWithUnfinishedEntriesQuery(
  service: string,
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
  includePartitionKey: boolean,
) {
  // Without backlog sorting, this bounded query must also discover identities
  // that only have entries in the inbox.
  return buildVirtualObjectIdentitiesFromVqueueMetaQuery(
    service,
    search,
    filters,
    includePartitionKey,
    ['num_inbox > 0', 'num_running > 0', 'num_suspended > 0', 'num_paused > 0'],
  );
}

function virtualObjectIdentitiesFromVqueueMetaWithNonInboxEntriesQuery(
  service: string,
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
) {
  // The backlog aggregate already discovers inbox identities when sorting, so
  // this bounded query only needs running, suspended, and paused entries.
  return buildVirtualObjectIdentitiesFromVqueueMetaQuery(
    service,
    search,
    filters,
    false,
    ['num_running > 0', 'num_suspended > 0', 'num_paused > 0'],
  );
}

function virtualObjectIdentitiesFromInvocationStatusQuery(
  service: string,
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
  includePartitionKey: boolean,
) {
  const hasKeyFilter = filters.some(({ field }) => field === 'key');
  const nonNullKeyClause = hasKeyFilter
    ? ''
    : '\n      AND target_service_key IS NOT NULL';
  const filterClause = identityFilterClause(
    search,
    filters,
    'target_service_key',
  );
  const partitionKeyColumn = includePartitionKey
    ? '      CAST(partition_key AS VARCHAR) AS partition_key,\n'
    : '';
  return `SELECT DISTINCT
${partitionKeyColumn}      target_service_key AS object_key,
      scope
    FROM sys_invocation_status
    WHERE target_service_name = ${quoteSqlString(service)}
      AND target_service_ty = 'virtual_object'${nonNullKeyClause}
      AND status <> 'completed'${filterClause}
    LIMIT ${QUERY_LIMIT}`;
}

function virtualObjectIdentitiesFromVqueueMetaByBacklogQuery(
  service: string,
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
) {
  const servicePrefix = quoteSqlString(`${service}/`);
  const objectKey = `SUBSTR(lock_name, CHAR_LENGTH(${servicePrefix}) + 1)`;
  const exactKey = exactKeyFilterValue(filters);
  const hasKeyFilter = filters.some(({ field }) => field === 'key');
  const filterClause = identityFilterClause(search, filters, objectKey, {
    keyEqualsExpression: 'lock_name',
    keyEqualsValue: (value) => `${service}/${value}`,
  });
  // Zero-inbox rows cannot change the sum or the positive-backlog ordering.
  // Excluding them avoids grouping the much larger non-inbox metadata population.
  const lockNameColumn = exactKey === undefined ? '      lock_name,\n' : '';
  const lockNameClause = hasKeyFilter
    ? ''
    : '\n      AND lock_name IS NOT NULL';
  const groupBy = exactKey === undefined ? 'lock_name, scope' : 'scope';
  const orderBy =
    exactKey === undefined
      ? 'backlog DESC, lock_name ASC, scope ASC NULLS FIRST'
      : 'backlog DESC, scope ASC NULLS FIRST';
  return `SELECT
${lockNameColumn}      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE service_name = ${quoteSqlString(service)}${lockNameClause}
      AND num_inbox > 0${filterClause}
    GROUP BY ${groupBy}
    ORDER BY ${orderBy}
    LIMIT ${QUERY_LIMIT}`;
}

const STATS_INBOX_BACKLOG =
  "SUM(CASE WHEN stage = 'inbox' THEN num_entries ELSE 0 END)";

function virtualObjectsWithBacklogFromStatsQuery(
  service: string,
  filterClause: string,
) {
  return `SELECT
      key AS object_key,
      scope,
      SUM(num_entries) AS backlog
    FROM ${VIRTUAL_OBJECT_STATS.name}
    WHERE service_name = ${quoteSqlString(service)}
      AND stage = 'inbox'${filterClause}
    GROUP BY key, scope
    ORDER BY backlog DESC
    LIMIT ${QUERY_LIMIT}`;
}

function virtualObjectsFromStatsQuery(
  service: string,
  filterClause: string,
  limit: number,
) {
  return `SELECT DISTINCT
      key AS object_key,
      scope
    FROM ${VIRTUAL_OBJECT_STATS.name}
    WHERE service_name = ${quoteSqlString(service)}${filterClause}
    LIMIT ${limit}`;
}

function rowIdentity(row: InstanceRow) {
  return identityId(
    String(row.object_key),
    row.scope != null ? String(row.scope) : undefined,
  );
}

function getOrCreateInstance(
  instances: Map<string, MutableInstance>,
  row: InstanceRow,
): MutableInstance {
  const key = String(row['object_key']);
  const scope = row['scope'] != null ? String(row['scope']) : undefined;
  const id = identityId(key, scope);
  const foundPartitionKey = partitionKey(row['partition_key']);
  const existingInstance = instances.get(id);
  if (existingInstance) {
    if (foundPartitionKey && !existingInstance.partitionKey) {
      existingInstance.partitionKey = foundPartitionKey;
    }
    return existingInstance;
  }

  const instance: MutableInstance = {
    key,
    ...(scope !== undefined ? { scope } : {}),
    ...(foundPartitionKey ? { partitionKey: foundPartitionKey } : {}),
  };
  instances.set(id, instance);
  return instance;
}

function addInstances(
  instances: Map<string, MutableInstance>,
  rows: InstanceRow[],
) {
  for (const row of rows) {
    const instance = getOrCreateInstance(instances, row);
    if (row['backlog'] != null) {
      instance.backlog = Number(row['backlog']);
    }
  }
}

function selectedPartitionKeys(instances: MutableInstance[]) {
  return [
    ...new Set(
      instances.flatMap(({ partitionKey }) =>
        partitionKey ? [partitionKey] : [],
      ),
    ),
  ];
}

function selectedIdentityClause(
  instances: MutableInstance[],
  keyColumn: string,
  keyPrefix = '',
) {
  return instances
    .map(
      ({ key, scope }) =>
        `(${keyColumn} = ${quoteSqlString(`${keyPrefix}${key}`)}${
          scope === undefined
            ? ' AND scope IS NULL'
            : ` AND scope = ${quoteSqlString(scope)}`
        })`,
    )
    .join('\n        OR ');
}

async function getBacklogsForInstances(
  context: QueryContext,
  service: string,
  instances: MutableInstance[],
) {
  if (instances.length === 0) return [];
  if (usesStatsTables(context)) {
    const { rows } = await context.query(
      `SELECT
      key AS object_key,
      scope,
      ${STATS_INBOX_BACKLOG} AS backlog
    FROM ${VIRTUAL_OBJECT_STATS.name}
    WHERE service_name = ${quoteSqlString(service)}
      AND (
        ${selectedIdentityClause(instances, 'key')}
      )
    GROUP BY key, scope`,
      'virtual-objects/backlogs-from-stats',
    );
    return rows;
  }
  const partitionKeys = selectedPartitionKeys(instances).join(', ');
  const partitionClause = instances.every(({ partitionKey }) => partitionKey)
    ? `partition_key IN (${partitionKeys})\n      AND `
    : '';
  const { rows } = await context.query(
    `SELECT
      lock_name,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE ${partitionClause}service_name = ${quoteSqlString(service)}
      AND (
        ${selectedIdentityClause(instances, 'lock_name', `${service}/`)}
      )
    GROUP BY lock_name, scope`,
    'virtual-objects/backlogs-from-vqueue-meta',
  );
  return addObjectKeyFromLockName(rows, service);
}

async function queryLocksForInstances(
  context: QueryContext,
  service: string,
  instances: MutableInstance[],
) {
  if (instances.length === 0) return [];
  const { rows } = await context.query(
    `SELECT
      lock_name,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        ${selectedIdentityClause(instances, 'lock_name', `${service}/`)}
      )`,
    'virtual-objects/locks-for-instances',
  );
  return addObjectKeyFromLockName(rows, service);
}

function addInstanceLockHolders(
  instances: Map<string, MutableInstance>,
  rows: Record<string, unknown>[],
) {
  for (const row of rows) {
    const acquiredBy = row['acquired_by'];
    if (acquiredBy == null) continue;
    const key = String(row['object_key']);
    const scope = row['scope'] != null ? String(row['scope']) : undefined;
    const instance = instances.get(identityId(key, scope));
    if (instance) {
      instance.lockHolder = createVirtualObjectLockHolder(
        String(acquiredBy),
        row['acquired_at'] != null ? String(row['acquired_at']) : undefined,
      );
    }
  }
}

function compareByBacklog(a: MutableInstance, b: MutableInstance) {
  const backlogDifference = (b.backlog ?? 0) - (a.backlog ?? 0);
  if (backlogDifference !== 0) return backlogDifference;
  const keyDifference = a.key.localeCompare(b.key);
  if (keyDifference !== 0) return keyDifference;
  return (a.scope ?? '').localeCompare(b.scope ?? '');
}

type FindInstancesOptions = {
  search: string | undefined;
  filters: StructuredStringFilter<VirtualObjectFilterField>[];
  sortByBacklog: boolean;
};

type FoundInstances = {
  rows: InstanceRow[];
  truncated: boolean;
};

async function findInstancesFromStats(
  context: QueryContext,
  service: string,
  { search, filters, sortByBacklog }: FindInstancesOptions,
): Promise<FoundInstances> {
  const filterClause = identityFilterClause(search, filters, 'key');
  if (!sortByBacklog) {
    const { rows } = await context.query(
      virtualObjectsFromStatsQuery(service, filterClause, QUERY_LIMIT),
      'virtual-objects/instances-from-stats',
    );
    return {
      rows: rows as InstanceRow[],
      truncated: rows.length > INSTANCE_LIMIT,
    };
  }
  const [withBacklog, all] = await Promise.all([
    context.query(
      virtualObjectsWithBacklogFromStatsQuery(service, filterClause),
      'virtual-objects/instances-with-backlog-from-stats',
    ),
    context.query(
      virtualObjectsFromStatsQuery(service, filterClause, QUERY_LIMIT * 2),
      'virtual-objects/instances-from-stats',
    ),
  ]);
  const withBacklogRows = withBacklog.rows as InstanceRow[];
  const listed = new Set(withBacklogRows.map(rowIdentity));
  const rows = [
    ...withBacklogRows,
    ...(all.rows as InstanceRow[])
      .filter((row) => !listed.has(rowIdentity(row)))
      .map((row) => ({ ...row, backlog: 0 })),
  ].slice(0, QUERY_LIMIT);
  return { rows, truncated: rows.length > INSTANCE_LIMIT };
}

async function findInstancesFromQueues(
  context: QueryContext,
  service: string,
  { search, filters, sortByBacklog }: FindInstancesOptions,
): Promise<FoundInstances> {
  const exactKey = exactKeyFilterValue(filters);
  const withObjectKeys = (rows: Record<string, unknown>[]) =>
    exactKey === undefined
      ? addObjectKeyFromLockName(rows, service)
      : addKnownObjectKey(rows, exactKey);
  const identitiesFromInvocationStatusPromise = context
    .query(
      virtualObjectIdentitiesFromInvocationStatusQuery(
        service,
        search,
        filters,
        !sortByBacklog,
      ),
      'virtual-objects/identities-from-invocations',
    )
    .then(({ rows }) => rows);
  const activeIdentityRowsPromise = Promise.race([
    identitiesFromInvocationStatusPromise,
    context
      .query(
        sortByBacklog
          ? virtualObjectIdentitiesFromVqueueMetaWithNonInboxEntriesQuery(
              service,
              search,
              filters,
            )
          : virtualObjectIdentitiesFromVqueueMetaWithUnfinishedEntriesQuery(
              service,
              search,
              filters,
              !sortByBacklog,
            ),
        'virtual-objects/identities-from-vqueue-meta',
      )
      .then(({ rows }) => withObjectKeys(rows)),
  ]);
  const identitiesByBacklogPromise = !sortByBacklog
    ? Promise.resolve([])
    : context
        .query(
          virtualObjectIdentitiesFromVqueueMetaByBacklogQuery(
            service,
            search,
            filters,
          ),
          'virtual-objects/identities-by-backlog',
        )
        .then(({ rows }) => withObjectKeys(rows));
  const [activeIdentityRows, identitiesByBacklogRows] = await Promise.all([
    activeIdentityRowsPromise,
    identitiesByBacklogPromise,
  ]);
  return {
    rows: [...activeIdentityRows, ...identitiesByBacklogRows],
    truncated:
      activeIdentityRows.length > INSTANCE_LIMIT ||
      identitiesByBacklogRows.length > INSTANCE_LIMIT,
  };
}

export async function listVirtualObjectInstances(
  this: QueryContext,
  service: string,
  args: ListVirtualObjectInstancesArgs = {},
) {
  const search = args.search?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined;
  const usesStats = usesStatsTables(this);
  const sortByBacklog =
    args.sort === undefined
      ? usesStats
      : args.sort?.field === 'backlog' && args.sort.order === 'DESC';
  const parsedFilters = parseStructuredStringFilters(args.filters, [
    'key',
    'scope',
  ]);
  if (parsedFilters.error) {
    return new Response(parsedFilters.error, { status: 400 });
  }
  const filters = parsedFilters.filters;
  const candidates = normalizeIdentityCandidates(
    args.candidates,
    ({ key }) => key,
  ).filter((candidate) =>
    identityCandidateMatches(candidate, 'key', search, filters),
  );
  const findOptions = { search, filters, sortByBacklog };
  const found = usesStats
    ? await findInstancesFromStats(this, service, findOptions)
    : await findInstancesFromQueues(this, service, findOptions);
  const instancesById = new Map<string, MutableInstance>();

  addInstances(
    instancesById,
    candidates.map(({ value, scope }) => ({
      object_key: value,
      ...(scope !== undefined ? { scope } : {}),
    })),
  );
  addInstances(instancesById, found.rows);

  const candidateIds = new Set(
    candidates.map(({ value, scope }) => identityId(value, scope)),
  );
  const selectedCandidates = candidates.flatMap(({ value, scope }) => {
    const instance = instancesById.get(identityId(value, scope));
    return instance ? [instance] : [];
  });
  const selectedInstances = [
    ...selectedCandidates,
    ...Array.from(instancesById.entries())
      .filter(([id]) => !candidateIds.has(id))
      .map(([, instance]) => instance)
      .sort(sortByBacklog ? compareByBacklog : () => 0),
  ].slice(0, INSTANCE_LIMIT);
  const selectedInstancesById = new Map(
    selectedInstances.map((instance) => [
      identityId(instance.key, instance.scope),
      instance,
    ]),
  );
  const backlogTargets = sortByBacklog
    ? selectedCandidates.filter(({ backlog }) => backlog === undefined)
    : selectedInstances;
  const [backlogRows, lockRows] = await Promise.all([
    getBacklogsForInstances(this, service, backlogTargets),
    queryLocksForInstances(this, service, selectedInstances),
  ]);
  addInstances(selectedInstancesById, backlogRows);
  addInstanceLockHolders(selectedInstancesById, lockRows);

  const rows = selectedInstances.map(({ key, scope, backlog, lockHolder }) => ({
    key,
    ...(scope !== undefined ? { scope } : {}),
    backlog: backlog ?? 0,
    ...(lockHolder ? { lockHolder } : {}),
  }));

  return Response.json({
    rows,
    truncated: found.truncated || instancesById.size > INSTANCE_LIMIT,
    sort: sortByBacklog ? BACKLOG_DESC_SORT : null,
  });
}
