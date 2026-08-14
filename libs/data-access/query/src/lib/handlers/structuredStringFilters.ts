import { quoteSqlString } from './shared';

const OPERATIONS = new Set(['EQUALS', 'CONTAINS']);
const MAX_VALUE_LENGTH = 256;

export interface StructuredStringFilter<Field extends string> {
  field: Field;
  operation: 'EQUALS' | 'CONTAINS';
  value: string;
}

interface StructuredStringFilterExpression {
  expression: string;
  equalsExpression?: string;
  equalsValue?: (value: string) => string;
}

export function quoteSqlContainsPattern(value: string) {
  const escaped = value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
  return quoteSqlString(`%${escaped}%`);
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
      value,
    });
  }
  return { filters: parsed };
}

export function structuredStringFilterClause<Field extends string>(
  filters: StructuredStringFilter<Field>[],
  expressions: Record<Field, string | StructuredStringFilterExpression>,
) {
  if (filters.length === 0) return '';
  const predicates = filters.map((filter) => {
    const configuration = expressions[filter.field];
    const expression =
      typeof configuration === 'string'
        ? configuration
        : configuration.expression;
    if (filter.operation === 'EQUALS') {
      const equalsExpression =
        typeof configuration === 'string'
          ? configuration
          : (configuration.equalsExpression ?? configuration.expression);
      const equalsValue =
        typeof configuration === 'string'
          ? filter.value
          : (configuration.equalsValue?.(filter.value) ?? filter.value);
      return `${equalsExpression} = ${quoteSqlString(equalsValue)}`;
    }
    return `${expression} ILIKE ${quoteSqlContainsPattern(filter.value)}`;
  });
  return `\n      AND ${predicates.join('\n      AND ')}`;
}
