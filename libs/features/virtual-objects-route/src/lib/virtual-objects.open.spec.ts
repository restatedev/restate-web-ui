import { describe, expect, it } from 'vitest';
import { virtualObjectIdentityFromOpenDraft } from './virtual-objects.open';

describe('virtualObjectIdentityFromOpenDraft', () => {
  it('includes a scoped identity', () => {
    expect(
      virtualObjectIdentityFromOpenDraft('Counter', {
        key: ' customer-1 ',
        scope: ' tenant-a ',
      }),
    ).toEqual({
      service: 'Counter',
      key: 'customer-1',
      scope: 'tenant-a',
    });
  });
});
