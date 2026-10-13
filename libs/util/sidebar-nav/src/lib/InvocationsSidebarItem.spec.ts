import { afterEach, describe, expect, it } from 'vitest';
import { getInvocationPresetSearch } from './InvocationsSidebarItem';

function sort(search: string) {
  const params = new URLSearchParams(search);
  return [params.get('sort_field'), params.get('sort_order')];
}

describe('invocation shortcut sorting', () => {
  afterEach(() => localStorage.clear());

  it('keeps created_at sorts when indexes are off', () => {
    expect(sort(getInvocationPresetSearch('inflight'))).toEqual([
      'created_at',
      'DESC',
    ]);
    expect(sort(getInvocationPresetSearch('stuck'))).toEqual([
      'created_at',
      'ASC',
    ]);
  });

  it('sorts by last transition descending when indexes are on', () => {
    localStorage.setItem('FEATURE_INDEXES_V1', 'true');
    for (const id of ['inflight', 'stuck', 'all', 'completed', 'scheduled']) {
      expect(sort(getInvocationPresetSearch(id))).toEqual([
        'transitioned_at',
        'DESC',
      ]);
    }
    expect(sort(getInvocationPresetSearch('processing'))).toEqual([
      'none',
      null,
    ]);
  });
});
