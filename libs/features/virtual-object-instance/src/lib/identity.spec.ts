import {
  formatVirtualObjectInstanceIdentity,
  virtualObjectInstanceHref,
} from './identity';

describe('virtualObjectInstanceHref', () => {
  it('includes the application base URL and encodes the identity', () => {
    expect(
      virtualObjectInstanceHref('/ui', {
        service: 'Cart Object',
        key: 'customer/123',
        scope: 'tenant a',
      }),
    ).toBe('/ui/virtual-objects/Cart%20Object/customer%2F123?scope=tenant+a');
  });

  it('omits scope only when it is not part of the identity', () => {
    expect(
      virtualObjectInstanceHref('', {
        service: 'Cart',
        key: 'customer-123',
      }),
    ).toBe('/virtual-objects/Cart/customer-123');
    expect(
      virtualObjectInstanceHref('', {
        service: 'Cart',
        key: 'customer-123',
        scope: '',
      }),
    ).toBe('/virtual-objects/Cart/customer-123?scope=');
  });
});

describe('formatVirtualObjectInstanceIdentity', () => {
  it('keeps scope separate and before the service and key', () => {
    expect(
      formatVirtualObjectInstanceIdentity({
        service: 'Cart',
        key: 'customer-123',
        scope: 'tenant-a',
      }),
    ).toBe('Scope tenant-a · Cart / customer-123');
  });

  it('omits an empty scope from the visible identity', () => {
    expect(
      formatVirtualObjectInstanceIdentity({
        service: 'Cart',
        key: 'customer-123',
        scope: '',
      }),
    ).toBe('Cart / customer-123');
  });
});
