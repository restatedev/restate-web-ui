import { describe, expect, it } from 'vitest';
import { getInvocationPresetSearch } from './InvocationsSidebarItem';

function sort(search: string) {
  const params = new URLSearchParams(search);
  return [params.get('sort_field'), params.get('sort_order')];
}

describe('invocation shortcut sorting', () => {
  it('keeps created_at sorts when the transition sort is unavailable', () => {
    expect(sort(getInvocationPresetSearch('inflight', false))).toEqual([
      'created_at',
      'DESC',
    ]);
    expect(sort(getInvocationPresetSearch('stuck', false))).toEqual([
      'created_at',
      'ASC',
    ]);
  });

  it('sorts by last transition descending when the transition sort is available', () => {
    for (const id of ['inflight', 'stuck', 'all', 'completed', 'scheduled']) {
      expect(sort(getInvocationPresetSearch(id, true))).toEqual([
        'transitioned_at',
        'DESC',
      ]);
    }
    expect(sort(getInvocationPresetSearch('processing', true))).toEqual([
      'none',
      null,
    ]);
  });
});
