import { describe, expect, it } from 'vitest';
import { entryTablesSupportFilters } from '../list/transitionSort';

describe('entryTablesSupportFilters', () => {
  it('accepts filters available on VQueue tables or the entry indexes', () => {
    expect(
      entryTablesSupportFilters([
        'status',
        'stage',
        'target_service_name',
        'target_service_key',
        'scope',
        'deployment',
        'created_at',
      ]),
    ).toBe(true);
    expect(entryTablesSupportFilters([])).toBe(true);
  });

  it('rejects filters only available on invocation tables', () => {
    expect(entryTablesSupportFilters(['target_handler_name'])).toBe(false);
    expect(entryTablesSupportFilters(['status', 'idempotency_key'])).toBe(
      false,
    );
    expect(entryTablesSupportFilters(['invoked_by'])).toBe(false);
  });
});
