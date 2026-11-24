import { describe, expect, it } from 'vitest';
import {
  getInvocationPresetSearch,
  getInvocationStatusPreset,
  listInvocationPresets,
} from './InvocationsSidebarItem';

function sort(search: string) {
  const params = new URLSearchParams(search);
  return [params.get('sort_field'), params.get('sort_order')];
}

describe('invocation shortcut sorting', () => {
  it('keeps created_at sorts when the transition sort is unavailable', () => {
    for (const id of ['processing', 'inflight']) {
      expect(sort(getInvocationPresetSearch(id, false))).toEqual([
        'created_at',
        'DESC',
      ]);
    }
    expect(sort(getInvocationPresetSearch('stuck', false))).toEqual([
      'created_at',
      'ASC',
    ]);
  });

  it('sorts by last transition descending when the transition sort is available', () => {
    for (const id of [
      'processing',
      'inflight',
      'stuck',
      'all',
      'completed',
      'suspended',
      'scheduled',
      'notcompleted',
    ]) {
      expect(sort(getInvocationPresetSearch(id, true))).toEqual([
        'transitioned_at',
        'DESC',
      ]);
    }
  });
});

function statusParam(operation: 'IN' | 'NOT_IN', value: string[]) {
  return JSON.stringify({ operation, value });
}

describe('invocation status presets', () => {
  it('lists the rail presets first, then All, then the rest', () => {
    expect(listInvocationPresets(false).map(({ id }) => id)).toEqual([
      'processing',
      'inflight',
      'stuck',
      'all',
      'completed',
      'suspended',
      'scheduled',
      'notcompleted',
    ]);
  });

  it('gives a hint only to the views that need one', () => {
    const hinted = listInvocationPresets(false)
      .filter(({ hint }) => hint)
      .map(({ id }) => id);
    expect(hinted).toEqual([
      'inflight',
      'stuck',
      'suspended',
      'scheduled',
      'notcompleted',
    ]);
  });

  it('matches a preset by its status filter alone', () => {
    const params = new URLSearchParams({
      filter_status: statusParam('IN', ['suspended']),
      filter_target_service_name: JSON.stringify({
        operation: 'IN',
        value: ['Greeter'],
      }),
    });
    expect(getInvocationStatusPreset(params)).toBe('suspended');
  });

  it('treats a URL without a status filter as All', () => {
    const params = new URLSearchParams({
      filter_target_service_name: JSON.stringify({
        operation: 'IN',
        value: ['Greeter'],
      }),
    });
    expect(getInvocationStatusPreset(params)).toBe('all');
  });

  it('matches the overview Not completed links to the Not completed view', () => {
    const params = new URLSearchParams({
      filter_status: statusParam('NOT_IN', [
        'succeeded',
        'failed',
        'cancelled',
        'killed',
      ]),
    });
    expect(getInvocationStatusPreset(params)).toBe('notcompleted');
  });

  it('matches a preset whatever the order of its statuses', () => {
    const completed = new URLSearchParams({
      filter_status: statusParam('IN', [
        'killed',
        'succeeded',
        'failed',
        'cancelled',
      ]),
    });
    const heldUp = new URLSearchParams({
      filter_status: statusParam('IN', [
        'new',
        'ready',
        'yielded',
        'backing-off',
        'paused',
      ]),
    });
    expect(getInvocationStatusPreset(completed)).toBe('completed');
    expect(getInvocationStatusPreset(heldUp)).toBe('stuck');
  });

  it('treats any other status filter as custom', () => {
    const params = new URLSearchParams({
      filter_status: statusParam('IN', ['paused', 'backing-off']),
    });
    expect(getInvocationStatusPreset(params)).toBe('custom');
  });
});
