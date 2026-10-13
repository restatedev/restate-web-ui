import { afterEach, describe, expect, it } from 'vitest';
import {
  deriveSortFromUrl,
  isSortValid,
  setDefaultSort,
} from './useInvocationsQueryFilters';
import { getUserLastSort, setUserLastSort } from './userPreferences';

function enableIndexes() {
  localStorage.setItem('FEATURE_INDEXES_V1', 'true');
}

describe('invocation sort defaults', () => {
  afterEach(() => localStorage.clear());

  it('defaults to created_at when indexes are off', () => {
    const params = setDefaultSort(new URLSearchParams());
    expect(params.get('sort_field')).toBe('created_at');
    expect(deriveSortFromUrl(new URLSearchParams())).toEqual({
      field: 'created_at',
      order: 'DESC',
    });
  });

  it('defaults to transitioned_at when indexes are on', () => {
    enableIndexes();
    const params = setDefaultSort(new URLSearchParams());
    expect(params.get('sort_field')).toBe('transitioned_at');
    expect(params.get('sort_order')).toBe('DESC');
  });

  it('offers transitioned_at only while indexes are on, created_at always', () => {
    const transitioned = new URLSearchParams(
      'sort_field=transitioned_at&sort_order=DESC',
    );
    const created = new URLSearchParams('sort_field=created_at&sort_order=ASC');
    expect(isSortValid(transitioned)).toBe(false);
    expect(isSortValid(created)).toBe(true);
    enableIndexes();
    expect(isSortValid(transitioned)).toBe(true);
    expect(isSortValid(created)).toBe(true);
  });

  it('ignores a saved transitioned_at sort once indexes are off', () => {
    enableIndexes();
    setUserLastSort({ field: 'transitioned_at', order: 'DESC' });
    expect(getUserLastSort()).toEqual({
      field: 'transitioned_at',
      order: 'DESC',
    });
    localStorage.removeItem('FEATURE_INDEXES_V1');
    expect(getUserLastSort()).toBeNull();
  });
});
