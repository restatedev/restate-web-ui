import { panelHref } from './panel';

describe('panelHref', () => {
  it('preserves existing search parameters', () => {
    const existingParams = new URLSearchParams('scope=tenant-a&tab=exclusive');

    expect(
      panelHref(
        { service: 'Cart' },
        {
          existingParams,
        },
      ),
    ).toBe('?scope=tenant-a&tab=exclusive&service=Cart&panel=service&handler=');
  });

  it('preserves a playground hash', () => {
    expect(
      panelHref(
        { playground: 'Cart', handler: 'add' },
        { existingParams: new URLSearchParams('scope=tenant-a') },
      ),
    ).toBe('?scope=tenant-a&servicePlayground=Cart#/operations/add');
  });
});
