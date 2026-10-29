import { getSchemaRegistryScopeUrl } from './SchemaRegistryProvider';

describe('getSchemaRegistryScopeUrl', () => {
  it('reads a tenant under its scope and a Restate without tenants unscoped', () => {
    expect(getSchemaRegistryScopeUrl('http://registry.test/', 'acme')).toBe(
      'http://registry.test/v1/scopes/acme',
    );
    expect(getSchemaRegistryScopeUrl('http://registry.test/', 'a/b')).toBe(
      'http://registry.test/v1/scopes/a%2Fb',
    );
    expect(getSchemaRegistryScopeUrl('http://registry.test//')).toBe(
      'http://registry.test/v1/unscoped',
    );
  });
});
