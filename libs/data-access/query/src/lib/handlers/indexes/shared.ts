import type { QueryId } from '../../queryDefinitions.js';
import { quoteSqlString, type QueryContext } from '../shared.js';

export type IndexQueryContext = Pick<QueryContext, 'query'>;

export type KeyValue = string | readonly string[] | null | undefined;

export interface IndexTable<Row, Key extends keyof Row & string> {
  name: string;
  keys: readonly Key[];
  filters?: Readonly<Partial<Record<string, Key>>>;
  sorts?: Readonly<Partial<Record<string, keyof Row & string>>>;
  order?: string;
  columns: readonly (keyof Row & string)[];
}

export function defineIndexTable<Row>() {
  return <const Key extends keyof Row & string>(
    table: IndexTable<Row, Key>,
  ): IndexTable<Row, Key> => table;
}

export function keyClauses(
  columns: readonly string[],
  keys: readonly KeyValue[],
) {
  return columns.slice(0, keys.length).flatMap((column, index) => {
    const value = keys[index];
    if (value === undefined) return [];
    if (value === null) return [`${column} IS NULL`];
    if (typeof value === 'string') {
      return [`${column} = ${quoteSqlString(value)}`];
    }
    const [first, ...rest] = value;
    if (first === undefined) return ['FALSE'];
    if (rest.length === 0) return [`${column} = ${quoteSqlString(first)}`];
    return [`${column} IN (${value.map(quoteSqlString).join(', ')})`];
  });
}

export type IndexKeys<Key extends string> = Partial<Record<Key, KeyValue>>;

export type IndexWhere<Key extends string> = Partial<
  Record<Key, readonly string[]>
>;

function whereClauses<Row, Key extends keyof Row & string>(
  table: IndexTable<Row, Key>,
  keys: IndexKeys<Key> = {},
  where: IndexWhere<Key> = {},
) {
  return table.keys.flatMap((key) => [
    ...keyClauses([key], [keys[key]]),
    ...(where[key] ?? []),
  ]);
}

function normalizeLimit(limit: number) {
  return Math.max(0, Math.floor(limit));
}

function buildSql({
  table,
  columns,
  where,
  orderBy,
  limit,
}: {
  table: string;
  columns: readonly string[];
  where: string[];
  orderBy?: string;
  limit?: number;
}) {
  return [
    `SELECT ${columns.join(', ')}`,
    `FROM ${table}`,
    where.length > 0 ? `WHERE ${where.join('\n  AND ')}` : undefined,
    orderBy ? `ORDER BY ${orderBy}` : undefined,
    limit === undefined ? undefined : `LIMIT ${normalizeLimit(limit)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function selectFromIndex<
  Row,
  Key extends keyof Row & string,
  Column extends keyof Row & string = keyof Row & string,
>(
  context: IndexQueryContext,
  table: IndexTable<Row, Key>,
  {
    keys,
    where,
    columns,
    sorted = false,
    orderBy,
    limit,
    id,
  }: {
    keys?: IndexKeys<Key>;
    where?: IndexWhere<Key>;
    columns?: readonly Column[];
    sorted?: boolean;
    orderBy?: string;
    limit?: number;
    id: QueryId;
  },
): Promise<Pick<Row, Column>[]> {
  if (sorted && !table.order) {
    throw new Error(`${table.name} has no natural order`);
  }
  const { rows } = await context.query(
    buildSql({
      table: table.name,
      columns: columns ?? table.columns,
      where: whereClauses(table, keys, where),
      orderBy: sorted ? table.order : orderBy,
      limit,
    }),
    id,
  );
  return rows as Pick<Row, Column>[];
}

export async function countFromIndex<Row, Key extends keyof Row & string>(
  context: IndexQueryContext,
  table: IndexTable<Row, Key>,
  { keys, id }: { keys?: IndexKeys<Key>; id: QueryId },
): Promise<number> {
  const { rows } = await context.query(
    buildSql({
      table: table.name,
      columns: ['COUNT(*) AS count'],
      where: whereClauses(table, keys),
    }),
    id,
  );
  return Number((rows[0] as { count?: unknown } | undefined)?.count ?? 0);
}
