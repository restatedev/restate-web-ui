import { IconName } from '@restate/ui-icons';
import { registerTransientQueryParams } from '@restate/util-panel';
import { classify, computeTrail } from './trail';
import type { Crumb, PageDefinition } from './types';

const pages: PageDefinition[] = [
  {
    pattern: '/overview',
    kind: 'list',
    resource: 'overview',
    label: 'Overview',
    icon: IconName.House,
  },
  {
    pattern: '/invocations',
    kind: 'list',
    resource: 'invocations',
    label: 'Invocations',
    icon: IconName.Invocation,
  },
  {
    pattern: '/invocations/:id',
    kind: 'detail',
    resource: 'invocations',
    label: (params) => params['id'] ?? '',
    icon: IconName.Invocation,
  },
  {
    pattern: '/services',
    kind: 'list',
    resource: 'services',
    label: 'Services',
    icon: IconName.Box,
  },
  {
    pattern: '/services/:service',
    kind: 'detail',
    resource: 'services',
    label: (params) => params['service'] ?? '',
    icon: IconName.Box,
  },
  {
    pattern: '/state/:virtualObject',
    kind: 'detail',
    resource: 'state',
    label: (params) => params['virtualObject'] ?? '',
    icon: IconName.Box,
  },
];

function visit(
  pathname: string,
  search = '',
  listSearches: Record<string, string> = {},
) {
  return computeTrail({
    pages,
    pathname,
    search,
    getListSearch: (listPathname) => listSearches[listPathname],
  });
}

function shape(trail: Crumb[]) {
  return trail.map((crumb) => `${crumb.kind}:${crumb.pathname}`);
}

describe('classify', () => {
  it('should match list and detail patterns with params', () => {
    expect(classify(pages, '/invocations')?.page.kind).toBe('list');
    const detail = classify(pages, '/invocations/inv-1');
    expect(detail?.page.kind).toBe('detail');
    expect(detail?.params['id']).toBe('inv-1');
  });

  it('should return undefined for unknown pages', () => {
    expect(classify(pages, '/features')).toBeUndefined();
  });
});

describe('computeTrail', () => {
  it('should show only the list itself on a list page', () => {
    expect(shape(visit('/invocations'))).toEqual(['list:/invocations']);
  });

  it('should put the list of its resource before a detail page', () => {
    const trail = visit('/invocations/inv-1');
    expect(shape(trail)).toEqual([
      'list:/invocations',
      'detail:/invocations/inv-1',
    ]);
    expect(trail[0]).toMatchObject({
      label: 'Invocations',
      href: '/invocations',
    });
  });

  it('should use the own list of each resource', () => {
    expect(shape(visit('/services/greeter'))).toEqual([
      'list:/services',
      'detail:/services/greeter',
    ]);
  });

  it('should show a detail page alone when its resource has no list', () => {
    expect(shape(visit('/state/Counter'))).toEqual(['detail:/state/Counter']);
  });

  it('should return an empty trail on unclassified pages', () => {
    expect(visit('/features')).toEqual([]);
  });

  it('should resolve labels and hrefs from the location', () => {
    expect(visit('/invocations/inv-1', '?a=1').at(-1)).toMatchObject({
      label: 'inv-1',
      href: '/invocations/inv-1?a=1',
      params: { id: 'inv-1' },
    });
  });

  it('should link the list with the query it was last left with', () => {
    const trail = visit('/invocations/inv-1', '', {
      '/invocations': '?filter_status=running',
      '/services': '?view=all',
    });
    expect(trail[0]?.href).toBe('/invocations?filter_status=running');
  });

  it('should materialize dynamic list patterns', () => {
    const cloudPages: PageDefinition[] = [
      {
        pattern: '/accounts/:accountId/environments/:environmentId/invocations',
        kind: 'list',
        resource: 'invocations',
        label: 'Invocations',
        icon: IconName.Invocation,
      },
      {
        pattern:
          '/accounts/:accountId/environments/:environmentId/invocations/:id',
        kind: 'detail',
        resource: 'invocations',
        label: (params) => params['id'] ?? '',
        icon: IconName.Invocation,
      },
    ];
    const trail = computeTrail({
      pages: cloudPages,
      pathname: '/accounts/a1/environments/env-9/invocations/inv-1',
      getListSearch: (pathname) =>
        pathname === '/accounts/a1/environments/env-9/invocations'
          ? '?filter_status=failed'
          : undefined,
    });
    expect(trail[0]).toMatchObject({
      kind: 'list',
      pathname: '/accounts/a1/environments/env-9/invocations',
      href: '/accounts/a1/environments/env-9/invocations?filter_status=failed',
      params: { accountId: 'a1', environmentId: 'env-9' },
    });
    expect(trail[1]?.label).toBe('inv-1');
  });

  it('should exclude registered transient query params from crumb hrefs', () => {
    registerTransientQueryParams('test-dialog');
    const trail = visit('/invocations/inv-1', '?a=1&test-dialog=inv-1', {
      '/invocations': '?b=2&test-dialog=inv-2',
    });
    expect(trail[0]?.href).toBe('/invocations?b=2');
    expect(trail[1]?.href).toBe('/invocations/inv-1?a=1');
  });
});
