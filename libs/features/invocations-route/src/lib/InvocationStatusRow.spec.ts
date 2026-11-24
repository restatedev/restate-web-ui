import { describe, expect, it } from 'vitest';
import { listInvocationPresets } from '@restate/util-sidebar-nav';
import { invocationStatusHref } from './InvocationStatusRow';

function presetSearch(id: string) {
  const preset = listInvocationPresets(true).find((item) => item.id === id);
  if (!preset) throw new Error(`no preset ${id}`);
  return preset.search;
}

function hrefParams(
  current: Record<string, string | string[]>,
  id: string,
  from?: string,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    for (const item of [value].flat()) params.append(key, item);
  }
  const href = invocationStatusHref(
    '/ui',
    params,
    presetSearch(id),
    from && presetSearch(from),
  );
  return new URLSearchParams(href.split('?')[1]);
}

const DEFAULT_COLUMNS = [
  'id',
  'created_at',
  'modified_at',
  'duration',
  'target',
  'status',
];

describe('invocationStatusHref', () => {
  it('changes only the status and keeps the sort and other filters', () => {
    const params = hrefParams(
      {
        filter_target_handler_name: JSON.stringify({
          operation: 'IN',
          value: ['Greeter/greet'],
        }),
        sort_field: 'created_at',
        sort_order: 'ASC',
        column: DEFAULT_COLUMNS,
      },
      'stuck',
    );
    expect(JSON.parse(params.get('filter_status') ?? '')).toEqual({
      operation: 'IN',
      value: ['new', 'backing-off', 'paused', 'ready', 'yielded'],
    });
    expect(params.get('filter_target_handler_name')).not.toBeNull();
    expect(params.get('sort_field')).toBe('created_at');
    expect(params.get('sort_order')).toBe('ASC');
  });

  it('keeps No sorting', () => {
    const params = hrefParams({ sort_field: 'none' }, 'inflight');
    expect(params.get('sort_field')).toBe('none');
  });

  it('clears the status filter for All', () => {
    const params = hrefParams(
      {
        filter_status: JSON.stringify({ operation: 'IN', value: ['running'] }),
        column: DEFAULT_COLUMNS,
      },
      'all',
    );
    expect(params.has('filter_status')).toBe(false);
    expect(params.getAll('column')).toEqual(DEFAULT_COLUMNS);
  });

  it('adds the start time column for Scheduled without restoring removed columns', () => {
    const params = hrefParams(
      { column: ['id', 'target', 'status'] },
      'scheduled',
    );
    expect(params.getAll('column')).toEqual([
      'id',
      'target',
      'status',
      'scheduled_start_at',
    ]);
  });

  it('drops the start time column when leaving Scheduled and keeps the others', () => {
    const params = hrefParams(
      {
        filter_status: JSON.stringify({
          operation: 'IN',
          value: ['scheduled'],
        }),
        column: ['id', 'target', 'idempotency_key', 'scheduled_start_at'],
      },
      'processing',
      'scheduled',
    );
    expect(params.getAll('column')).toEqual([
      'id',
      'target',
      'idempotency_key',
    ]);
  });

  it('uses the preset columns when none are selected', () => {
    const params = hrefParams({}, 'scheduled');
    expect(params.getAll('column')).toEqual([
      ...DEFAULT_COLUMNS,
      'scheduled_start_at',
    ]);
  });
});
