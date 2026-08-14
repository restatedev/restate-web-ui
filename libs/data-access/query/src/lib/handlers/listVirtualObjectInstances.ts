import type { components } from '@restate/data-access/admin-api-spec';
import { createVirtualObjectLockHolder } from './getVirtualObjectLock';
import { quoteSqlString, type QueryContext } from './shared';
import {
  parseStructuredStringFilters,
  structuredStringFilterClause,
  type StructuredStringFilter,
} from './structuredStringFilters';

const INSTANCE_LIMIT = 50;
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

function identityFilterClause(
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
  keyExpression: string,
  includeScope: boolean,
  searchOnNewLine = true,
) {
  const pattern = searchPattern(search);
  const searchClause = pattern
    ? `${searchOnNewLine ? '\n      ' : ' '}AND (${keyExpression} LIKE ${pattern}${includeScope ? ` OR scope LIKE ${pattern}` : ''})`
    : '';
  return `${searchClause}${structuredStringFilterClause(filters, {
    key: keyExpression,
    scope: 'scope',
  })}`;
}

function virtualObjectIdentitiesFromStateQuery(
  service: string,
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
  options: {
    includeScope: boolean;
    includePartitionKey: boolean;
  },
) {
  const { includeScope, includePartitionKey } = options;
  const filterClause = identityFilterClause(
    search,
    filters,
    'service_key',
    includeScope,
    false,
  );
  const partitionKeyColumn = includePartitionKey
    ? '      CAST(partition_key AS VARCHAR) AS partition_key,\n'
    : '';
  return `SELECT DISTINCT
${partitionKeyColumn}      service_key AS object_key${includeScope ? ',\n      scope' : ''}
    FROM state
    WHERE service_name = ${quoteSqlString(service)}${filterClause}
    LIMIT ${QUERY_LIMIT}`;
}

function buildVirtualObjectIdentitiesFromVqueueMetaQuery(
  service: string,
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
  includePartitionKey: boolean,
  counterPredicates: string[],
) {
  const objectKey = `SUBSTR(lock_name, CHAR_LENGTH(${quoteSqlString(`${service}/`)}) + 1)`;
  const filterClause = identityFilterClause(search, filters, objectKey, true);
  const counters = counterPredicates.join('\n        OR ');
  const partitionKeyColumn = includePartitionKey
    ? '      CAST(partition_key AS VARCHAR) AS partition_key,\n'
    : '';
  return `SELECT DISTINCT
${partitionKeyColumn}      ${objectKey} AS object_key,
      scope
    FROM sys_vqueue_meta
    WHERE service_name = ${quoteSqlString(service)}
      AND lock_name IS NOT NULL
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
  options: {
    includeScope: boolean;
    includePartitionKey: boolean;
  },
) {
  const { includeScope, includePartitionKey } = options;
  const filterClause = identityFilterClause(
    search,
    filters,
    'target_service_key',
    includeScope,
  );
  const partitionKeyColumn = includePartitionKey
    ? '      CAST(partition_key AS VARCHAR) AS partition_key,\n'
    : '';
  return `SELECT DISTINCT
${partitionKeyColumn}      target_service_key AS object_key${includeScope ? ',\n      scope' : ''}
    FROM sys_invocation_status
    WHERE target_service_name = ${quoteSqlString(service)}
      AND target_service_ty = 'virtual_object'
      AND target_service_key IS NOT NULL
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
  const filterClause = identityFilterClause(search, filters, objectKey, true);
  // Zero-inbox rows cannot change the sum or the positive-backlog ordering.
  // Excluding them avoids grouping the much larger non-inbox metadata population.
  return `SELECT
      ${objectKey} AS object_key,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE service_name = ${quoteSqlString(service)}
      AND lock_name IS NOT NULL
      AND num_inbox > 0${filterClause}
    GROUP BY lock_name, scope
    ORDER BY backlog DESC, object_key ASC, scope ASC NULLS FIRST
    LIMIT ${QUERY_LIMIT}`;
}

function virtualObjectIdentitiesFromInboxByBacklogQuery(
  service: string,
  search: string | undefined,
  filters: StructuredStringFilter<VirtualObjectFilterField>[],
) {
  const filterClause = identityFilterClause(
    search,
    filters,
    'service_key',
    false,
  );
  return `SELECT
      service_key AS object_key,
      COUNT(*) AS backlog
    FROM sys_inbox
    WHERE service_name = ${quoteSqlString(service)}${filterClause}
    GROUP BY service_key
    ORDER BY backlog DESC, object_key ASC
    LIMIT ${QUERY_LIMIT}`;
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
  hasScope: boolean,
  keyPrefix = '',
) {
  return instances
    .map(
      ({ key, scope }) =>
        `(${keyColumn} = ${quoteSqlString(`${keyPrefix}${key}`)}${
          hasScope
            ? scope === undefined
              ? ' AND scope IS NULL'
              : ` AND scope = ${quoteSqlString(scope)}`
            : ''
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
  if (context.features.has('vqueues')) {
    const partitionKeys = selectedPartitionKeys(instances).join(', ');
    const partitionClause = instances.every(({ partitionKey }) => partitionKey)
      ? `partition_key IN (${partitionKeys})\n      AND `
      : '';
    const servicePrefix = quoteSqlString(`${service}/`);
    const objectKey = `SUBSTR(lock_name, CHAR_LENGTH(${servicePrefix}) + 1)`;
    const { rows } = await context.query(`SELECT
      ${objectKey} AS object_key,
      scope,
      SUM(num_inbox) AS backlog
    FROM sys_vqueue_meta
    WHERE ${partitionClause}service_name = ${quoteSqlString(service)}
      AND (
        ${selectedIdentityClause(instances, objectKey, true)}
      )
    GROUP BY lock_name, scope`);
    return rows;
  }

  const { rows } = await context.query(`SELECT
      service_key AS object_key,
      COUNT(*) AS backlog
    FROM sys_inbox
    WHERE service_name = ${quoteSqlString(service)}
      AND (
        ${selectedIdentityClause(instances, 'service_key', false)}
      )
    GROUP BY service_key`);
  return rows;
}

async function queryLocksForInstances(
  context: QueryContext,
  service: string,
  instances: MutableInstance[],
) {
  if (instances.length === 0) return [];
  if (context.features.has('vqueues')) {
    const servicePrefix = quoteSqlString(`${service}/`);
    const objectKey = `SUBSTR(lock_name, CHAR_LENGTH(${servicePrefix}) + 1)`;
    const { rows } = await context.query(`SELECT
      ${objectKey} AS object_key,
      scope,
      acquired_by,
      acquired_at
    FROM sys_locks
    WHERE acquired_by IS NOT NULL
      AND (
        ${selectedIdentityClause(instances, 'lock_name', true, `${service}/`)}
      )`);
    return rows;
  }

  const { rows } = await context.query(`SELECT
      service_key AS object_key,
      invocation_id AS acquired_by
    FROM sys_keyed_service_status
    WHERE service_name = ${quoteSqlString(service)}
      AND invocation_id IS NOT NULL
      AND (
        ${selectedIdentityClause(instances, 'service_key', false)}
      )`);
  return rows;
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

export async function listVirtualObjectInstances(
  this: QueryContext,
  service: string,
  args: ListVirtualObjectInstancesArgs = {},
) {
  const search = args.search?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined;
  const sortByBacklog =
    args.sort?.field === 'backlog' && args.sort.order === 'DESC';
  const hasVqueues = this.features.has('vqueues');
  const parsedFilters = parseStructuredStringFilters(
    args.filters,
    hasVqueues ? ['key', 'scope'] : ['key'],
  );
  if (parsedFilters.error) {
    return new Response(parsedFilters.error, { status: 400 });
  }
  const filters = parsedFilters.filters;
  const includePartitionKeyForBacklogQuery = hasVqueues && !sortByBacklog;
  const identitiesFromStatePromise = this.query(
    virtualObjectIdentitiesFromStateQuery(service, search, filters, {
      includeScope: hasVqueues,
      includePartitionKey: includePartitionKeyForBacklogQuery,
    }),
  ).then(({ rows }) => rows);
  const identitiesFromVqueueMetaPromise = hasVqueues
    ? this.query(
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
              includePartitionKeyForBacklogQuery,
            ),
      ).then(({ rows }) => rows)
    : Promise.resolve([]);
  const identitiesFromInvocationStatusPromise = this.query(
    virtualObjectIdentitiesFromInvocationStatusQuery(service, search, filters, {
      includeScope: hasVqueues,
      includePartitionKey: includePartitionKeyForBacklogQuery,
    }),
  ).then(({ rows }) => rows);
  const identitiesByBacklogPromise = sortByBacklog
    ? this.query(
        hasVqueues
          ? virtualObjectIdentitiesFromVqueueMetaByBacklogQuery(
              service,
              search,
              filters,
            )
          : virtualObjectIdentitiesFromInboxByBacklogQuery(
              service,
              search,
              filters,
            ),
      ).then(({ rows }) => rows)
    : Promise.resolve([]);
  const [
    identitiesFromStateRows,
    identitiesFromVqueueMetaRows,
    identitiesFromInvocationStatusRows,
    identitiesByBacklogRows,
  ] = await Promise.all([
    identitiesFromStatePromise,
    identitiesFromVqueueMetaPromise,
    identitiesFromInvocationStatusPromise,
    identitiesByBacklogPromise,
  ]);
  const stateTruncated = identitiesFromStateRows.length > INSTANCE_LIMIT;
  const vqueueMetaIdentitiesTruncated =
    identitiesFromVqueueMetaRows.length > INSTANCE_LIMIT;
  const invocationStatusTruncated =
    identitiesFromInvocationStatusRows.length > INSTANCE_LIMIT;
  const backlogTruncated = identitiesByBacklogRows.length > INSTANCE_LIMIT;
  const pendingWorkTruncated =
    vqueueMetaIdentitiesTruncated ||
    invocationStatusTruncated ||
    backlogTruncated;
  const instancesById = new Map<string, MutableInstance>();

  addInstances(instancesById, identitiesFromVqueueMetaRows);
  addInstances(instancesById, identitiesFromInvocationStatusRows);
  addInstances(instancesById, identitiesFromStateRows);
  addInstances(instancesById, identitiesByBacklogRows);

  const selectedInstances = Array.from(instancesById.values())
    .sort(sortByBacklog ? compareByBacklog : () => 0)
    .slice(0, INSTANCE_LIMIT);
  const selectedInstancesById = new Map(
    selectedInstances.map((instance) => [
      identityId(instance.key, instance.scope),
      instance,
    ]),
  );
  const [backlogRows, lockRows] = await Promise.all([
    sortByBacklog
      ? Promise.resolve([])
      : getBacklogsForInstances(this, service, selectedInstances),
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
    truncated:
      backlogTruncated ||
      stateTruncated ||
      pendingWorkTruncated ||
      instancesById.size > INSTANCE_LIMIT,
  });
}
