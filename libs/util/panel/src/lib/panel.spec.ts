import { panelHref } from './panel';

describe('panelHref', () => {
  it('adds the handler as a playground hash', () => {
    expect(panelHref({ playground: 'Cart', handler: 'add' })).toBe(
      '?servicePlayground=Cart#/operations/add',
    );
  });
});
