import { afterEach, describe, expect, it } from 'vitest';
import {
  deriveSortFromUrl,
  isSortValid,
  setDefaultSort,
} from './useInvocationsQueryFilters';
import { getUserLastSort, setUserLastSort } from './userPreferences';

describe('invocation sort defaults', () => {
  afterEach(() => localStorage.clear());

  it('defaults to created_at when the transition sort is unavailable', () => {
    const params = setDefaultSort(new URLSearchParams(), false);
    expect(params.get('sort_field')).toBe('created_at');
    expect(deriveSortFromUrl(new URLSearchParams(), false)).toEqual({
      field: 'created_at',
      order: 'DESC',
    });
  });

  it('defaults to transitioned_at when the transition sort is available', () => {
    const params = setDefaultSort(new URLSearchParams(), true);
    expect(params.get('sort_field')).toBe('transitioned_at');
    expect(params.get('sort_order')).toBe('DESC');
  });

  it('offers transitioned_at only while the transition sort is available, created_at always', () => {
    const transitioned = new URLSearchParams(
      'sort_field=transitioned_at&sort_order=DESC',
    );
    const created = new URLSearchParams('sort_field=created_at&sort_order=ASC');
    expect(isSortValid(transitioned, false)).toBe(false);
    expect(isSortValid(created, false)).toBe(true);
    expect(isSortValid(transitioned, true)).toBe(true);
    expect(isSortValid(created, true)).toBe(true);
  });

  it('falls back from a transitioned_at URL sort when the transition sort is unavailable', () => {
    const transitioned = new URLSearchParams(
      'sort_field=transitioned_at&sort_order=DESC',
    );
    expect(deriveSortFromUrl(transitioned, false)).toEqual({
      field: 'created_at',
      order: 'DESC',
    });
  });

  it('ignores a saved transitioned_at sort when the transition sort is unavailable', () => {
    setUserLastSort({ field: 'transitioned_at', order: 'DESC' });
    expect(getUserLastSort(true)).toEqual({
      field: 'transitioned_at',
      order: 'DESC',
    });
    expect(getUserLastSort(false)).toBeNull();
  });
});
