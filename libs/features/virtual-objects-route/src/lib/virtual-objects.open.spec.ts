import { describe, expect, it } from 'vitest';
import { virtualObjectIdentityFromOpenDraft } from './virtual-objects.open';

describe('virtualObjectIdentityFromOpenDraft', () => {
  it('includes a scoped identity when scoped Virtual Objects are available', () => {
    expect(
      virtualObjectIdentityFromOpenDraft(
        'Counter',
        { key: ' customer-1 ', scope: ' tenant-a ' },
        true,
      ),
    ).toEqual({
      service: 'Counter',
      key: 'customer-1',
      scope: 'tenant-a',
    });
  });

  it('drops an entered scope when scoped identities are unavailable', () => {
    expect(
      virtualObjectIdentityFromOpenDraft(
        'Counter',
        { key: 'customer-1', scope: 'tenant-a' },
        false,
      ),
    ).toEqual({ service: 'Counter', key: 'customer-1' });
  });
});
