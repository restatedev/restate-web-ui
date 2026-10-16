import { describe, expect, it } from 'vitest';
import { convertFilters } from './convertFilters';

describe('convertFilters', () => {
  it('escapes quotes in string, list and pattern values', () => {
    expect(
      convertFilters([
        {
          field: 'service_key',
          type: 'STRING',
          operation: 'EQUALS',
          value: "qa'key%_1013",
        },
        {
          field: 'scope',
          type: 'STRING_LIST',
          operation: 'IN',
          value: ["a'b", 'c'],
        },
        {
          field: 'key',
          type: 'STRING',
          operation: 'CONTAINS',
          value: "it's",
        },
      ]),
    ).toBe(
      `WHERE "service_key" = 'qa''key%_1013' AND scope IN ('a''b', 'c') AND "key" LIKE '%it''s%'`,
    );
  });

  it('turns empty lists into constant predicates', () => {
    expect(
      convertFilters([
        { field: 'scope', type: 'STRING_LIST', operation: 'IN', value: [] },
        { field: 'key', type: 'STRING_LIST', operation: 'NOT_IN', value: [] },
      ]),
    ).toBe('WHERE FALSE AND TRUE');
  });
});
