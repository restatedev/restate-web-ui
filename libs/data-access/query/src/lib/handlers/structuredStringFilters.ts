import { quoteSqlString } from './shared';

const OPERATIONS = new Set(['EQUALS', 'CONTAINS']);
const MAX_VALUE_LENGTH = 256;

export interface StructuredStringFilter<Field extends string> {
  field: Field;
  operation: 'EQUALS' | 'CONTAINS';
  value: string;
}

export function parseStructuredStringFilters<Field extends string>(
  filters: unknown,
  allowedFields: readonly Field[],
): { filters: StructuredStringFilter<Field>[]; error?: string } {
  if (filters === undefined) return { filters: [] };
  if (!Array.isArray(filters)) {
    return { filters: [], error: 'Filters must be an array' };
  }

  const allowed = new Set<string>(allowedFields);
  const parsed: StructuredStringFilter<Field>[] = [];
  for (const candidate of filters) {
    if (!candidate || typeof candidate !== 'object') {
      return { filters: [], error: 'Filter must be an object' };
    }
    const filter = candidate as Record<string, unknown>;
    const field = String(filter['field'] ?? 'unknown');
    if (!allowed.has(field)) {
      return { filters: [], error: `Unsupported filter field: ${field}` };
    }
    if (filter['type'] !== 'STRING') {
      return {
        filters: [],
        error: `Unsupported filter type for ${field}: ${String(filter['type'])}`,
      };
    }
    const operation = String(filter['operation']);
    if (!OPERATIONS.has(operation)) {
      return {
        filters: [],
        error: `Unsupported filter operation for ${field}: ${operation}`,
      };
    }
    const value = filter['value'];
    if (
      typeof value !== 'string' ||
      value.length === 0 ||
      value.length > MAX_VALUE_LENGTH
    ) {
      return {
        filters: [],
        error: `Invalid filter value for ${field}`,
      };
    }
    parsed.push({
      field: field as Field,
      operation: operation as StructuredStringFilter<Field>['operation'],
      value: value.toLowerCase(),
    });
  }
  return { filters: parsed };
}

export function structuredStringFilterClause<Field extends string>(
  filters: StructuredStringFilter<Field>[],
  expressions: Record<Field, string>,
) {
  if (filters.length === 0) return '';
  const predicates = filters.map((filter) => {
    const column = `LOWER(COALESCE(${expressions[filter.field]}, ''))`;
    const value = quoteSqlString(filter.value);
    return filter.operation === 'EQUALS'
      ? `${column} = ${value}`
      : `strpos(${column}, ${value}) > 0`;
  });
  return `\n      AND ${predicates.join('\n      AND ')}`;
}
