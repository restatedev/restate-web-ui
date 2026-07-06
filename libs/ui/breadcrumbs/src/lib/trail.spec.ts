import { IconName } from '@restate/ui/icons';
import { classify, computeNextTrail, MAX_TRAIL_LENGTH } from './trail';
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
];

function visit(prevTrail: Crumb[] | undefined, pathname: string, search = '') {
  return computeNextTrail({ pages, prevTrail, pathname, search });
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

describe('computeNextTrail', () => {
  it('should reset to the list itself on a list page', () => {
    expect(shape(visit(undefined, '/invocations'))).toEqual([
      'list:/invocations',
    ]);
  });

  it('should chain list -> detail', () => {
    const list = visit(undefined, '/invocations');
    expect(shape(visit(list, '/invocations/inv-1'))).toEqual([
      'list:/invocations',
      'detail:/invocations/inv-1',
    ]);
  });

  it('should chain detail -> detail -> detail', () => {
    const list = visit(undefined, '/invocations');
    const d1 = visit(list, '/invocations/inv-1');
    const d2 = visit(d1, '/invocations/inv-2');
    const d3 = visit(d2, '/invocations/inv-3');
    expect(shape(d3)).toEqual([
      'list:/invocations',
      'detail:/invocations/inv-1',
      'detail:/invocations/inv-2',
      'detail:/invocations/inv-3',
    ]);
  });

  it('should reset when going from detail to a list, then start fresh', () => {
    const list = visit(undefined, '/invocations');
    const d1 = visit(list, '/invocations/inv-1');
    const d2 = visit(d1, '/invocations/inv-2');
    const backToList = visit(d2, '/invocations');
    expect(shape(backToList)).toEqual(['list:/invocations']);
    expect(shape(visit(backToList, '/invocations/inv-4'))).toEqual([
      'list:/invocations',
      'detail:/invocations/inv-4',
    ]);
  });

  it('should synthesize the resource list on direct entry to a detail page', () => {
    const trail = visit(undefined, '/invocations/inv-1');
    expect(shape(trail)).toEqual([
      'list:/invocations',
      'detail:/invocations/inv-1',
    ]);
    expect(trail[0]?.label).toBe('Invocations');
  });

  it('should keep the origin list when hopping across resources', () => {
    const list = visit(undefined, '/invocations');
    const d1 = visit(list, '/invocations/inv-1');
    const svc = visit(d1, '/services/greeter');
    expect(shape(svc)).toEqual([
      'list:/invocations',
      'detail:/invocations/inv-1',
      'detail:/services/greeter',
    ]);
  });

  it('should truncate to the first occurrence on cycles', () => {
    const list = visit(undefined, '/invocations');
    const d1 = visit(list, '/invocations/inv-1');
    const d2 = visit(d1, '/invocations/inv-2');
    const backToD1 = visit(d2, '/invocations/inv-1', '?tab=journal');
    expect(shape(backToD1)).toEqual([
      'list:/invocations',
      'detail:/invocations/inv-1',
    ]);
    expect(backToD1.at(-1)?.href).toBe('/invocations/inv-1?tab=journal');
  });

  it('should keep the trail on query-only navigation and refresh the current href', () => {
    const list = visit(undefined, '/invocations');
    const d1 = visit(list, '/invocations/inv-1');
    const withQuery = visit(d1, '/invocations/inv-1', '?panel=service');
    expect(shape(withQuery)).toEqual(shape(d1));
    expect(withQuery.at(-1)?.href).toBe('/invocations/inv-1?panel=service');
  });

  it('should return an empty trail on unclassified pages and re-synthesize after them', () => {
    const list = visit(undefined, '/invocations');
    const d1 = visit(list, '/invocations/inv-1');
    const unknown = visit(d1, '/features');
    expect(unknown).toEqual([]);
    expect(shape(visit(unknown, '/services/greeter'))).toEqual([
      'list:/services',
      'detail:/services/greeter',
    ]);
  });

  it('should resolve labels and hrefs from the visit location', () => {
    const list = visit(undefined, '/invocations');
    const d1 = visit(list, '/invocations/inv-1', '?a=1');
    expect(d1.at(-1)).toMatchObject({
      label: 'inv-1',
      href: '/invocations/inv-1?a=1',
      params: { id: 'inv-1' },
    });
  });

  it('should materialize dynamic list patterns when synthesizing on direct entry', () => {
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
    const trail = computeNextTrail({
      pages: cloudPages,
      pathname: '/accounts/a1/environments/env-9/invocations/inv-1',
    });
    expect(trail[0]).toMatchObject({
      kind: 'list',
      pathname: '/accounts/a1/environments/env-9/invocations',
      href: '/accounts/a1/environments/env-9/invocations',
      params: { accountId: 'a1', environmentId: 'env-9' },
    });
    expect(trail[1]?.label).toBe('inv-1');
  });

  it('should cap the trail length while keeping the newest crumbs', () => {
    let trail = visit(undefined, '/invocations');
    for (let i = 0; i < MAX_TRAIL_LENGTH + 5; i++) {
      trail = visit(trail, `/invocations/inv-${i}`);
    }
    expect(trail).toHaveLength(MAX_TRAIL_LENGTH);
    expect(trail.at(-1)?.pathname).toBe(
      `/invocations/inv-${MAX_TRAIL_LENGTH + 4}`,
    );
  });
});
