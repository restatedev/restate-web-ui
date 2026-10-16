import { getHrefWithQueryParams } from './Link';

describe('getHrefWithQueryParams', () => {
  it('preserves only allowlisted parameters on a full href', () => {
    expect(
      getHrefWithQueryParams({
        href: '/workflows/Checkout/workflow-1?scope=tenant-a#state',
        preserveQueryParams: ['service', 'deployment', 'panel'],
        searchParams: new URLSearchParams(
          'service=Checkout&deployment=dp_1&panel=service&q=workflow',
        ),
      }),
    ).toBe(
      '/workflows/Checkout/workflow-1?service=Checkout&deployment=dp_1&panel=service&scope=tenant-a#state',
    );
  });

  it('keeps destination parameters authoritative', () => {
    expect(
      getHrefWithQueryParams({
        href: '/virtual-objects/Cart/customer-1?service=Cart',
        preserveQueryParams: ['service', 'deployment'],
        searchParams: new URLSearchParams('service=Checkout&deployment=dp_1'),
      }),
    ).toBe('/virtual-objects/Cart/customer-1?deployment=dp_1&service=Cart');
  });

  it('merges a query-only href into the current parameters', () => {
    expect(
      getHrefWithQueryParams({
        href: '?service=Checkout',
        preserveQueryParams: true,
        searchParams: new URLSearchParams('deployment=dp_1'),
      }),
    ).toBe('?deployment=dp_1&service=Checkout');
  });

  it('replaces instead of stacking a parameter that is already set', () => {
    expect(
      getHrefWithQueryParams({
        href: '?servicePlayground=Cart#/operations/add',
        preserveQueryParams: true,
        searchParams: new URLSearchParams(
          'servicePlayground=Checkout&panel=servicePlayground',
        ),
      }),
    ).toBe('?panel=servicePlayground&servicePlayground=Cart#/operations/add');
  });

  it('removes parameters set to an empty value', () => {
    expect(
      getHrefWithQueryParams({
        href: '?handler=',
        preserveQueryParams: true,
        searchParams: new URLSearchParams('handler=add&tab=state'),
      }),
    ).toBe('?tab=state');
  });
});
