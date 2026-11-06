import { parseServiceContract } from './contract.js';
import { bundleSchema, resolvePointer } from './refs.js';
import { loadFixture } from './test-fixtures.js';

describe('bundleSchema', () => {
  it('keeps only the components the schema references', () => {
    const document = loadFixture('1.8.1-ts-Orders.json');
    const schema = parseServiceContract(document).handlers.find(
      ({ name }) => name === 'create',
    )?.modes.call?.body?.schema;

    const bundled = bundleSchema(schema, document);

    expect(bundled?.['$ref']).toBe('#/components/schemas/createRequest');
    expect(bundled?.['components']).toEqual({
      schemas: {
        createRequest: resolvePointer(
          document,
          '#/components/schemas/createRequest',
        ),
      },
    });
  });

  it('follows references between components and decodes pointer segments', () => {
    const document = {
      components: {
        schemas: {
          'a/b': {
            type: 'object',
            properties: { c: { $ref: '#/components/schemas/C' } },
          },
          C: { type: 'string' },
          Unused: { type: 'number' },
        },
      },
    };

    const bundled = bundleSchema(
      { $ref: '#/components/schemas/a~1b' },
      document,
    );

    const components = bundled?.['components'] as {
      schemas: Record<string, unknown>;
    };
    expect(Object.keys(components.schemas).sort()).toEqual(['C', 'a/b']);
  });

  it('returns a copy without components when nothing is referenced', () => {
    expect(bundleSchema({ type: 'string' }, {})).toEqual({ type: 'string' });
    expect(bundleSchema(true, {})).toBeUndefined();
  });
});
