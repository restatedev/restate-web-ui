import { clearPlaygroundHandler, panelHref } from './panel';

describe('panelHref', () => {
  it('adds the handler as a query param and a legacy playground hash', () => {
    expect(panelHref({ playground: 'Cart', handler: 'add' })).toBe(
      '?servicePlayground=Cart&playgroundHandler=add#/operations/add',
    );
    expect(panelHref({ playground: 'Cart' })).toBe('?servicePlayground=Cart');
  });
});

describe('clearPlaygroundHandler', () => {
  it('removes only the playground handler', () => {
    expect(
      clearPlaygroundHandler(
        new URLSearchParams(
          'servicePlayground=Cart&playgroundHandler=add&panel=servicePlayground',
        ),
      ).toString(),
    ).toBe('servicePlayground=Cart&panel=servicePlayground');
  });
});
