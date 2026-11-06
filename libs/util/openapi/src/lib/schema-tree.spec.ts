import { parseServiceContract } from './contract.js';
import { buildSchemaTree, type SchemaNode } from './schema-tree.js';
import { loadFixture } from './test-fixtures.js';

function child(node: SchemaNode | undefined, name: string) {
  return node?.children.find((candidate) => candidate.name === name);
}

function ordersTree(handlerName: string) {
  const document = loadFixture('1.8.1-ts-Orders.json');
  const handler = parseServiceContract(document).handlers.find(
    ({ name }) => name === handlerName,
  );
  return buildSchemaTree(handler?.modes.call?.body?.schema, {
    root: document,
    mode: 'write',
  });
}

describe('buildSchemaTree', () => {
  it('describes a rich Zod object', () => {
    const tree = ordersTree('create');

    expect(tree.type).toBe('createRequest');
    expect(child(tree, 'orderId')).toMatchObject({
      type: 'string<uuid>',
      required: true,
      description: 'Client-generated order id',
    });
    expect(child(tree, 'orderId')?.pattern).toBeUndefined();
    expect(child(tree, 'status')).toMatchObject({
      allowedValues: ['draft', 'submitted', 'paid'],
      defaultValue: { value: 'draft' },
    });
    expect(child(tree, 'priority')?.constraints).toEqual(['>= 0', '<= 10']);
    expect(child(tree, 'giftMessage')).toMatchObject({
      type: 'string',
      nullable: true,
    });
    expect(child(tree, 'kind')?.constValue).toEqual({ value: 'order' });
    expect(child(tree, 'shippingAddress')?.type).toBe('Address');
    expect(child(tree, 'items')?.type).toBe('array[object]');
    expect(child(tree, 'items')?.constraints).toContain('>= 1 items');
    expect(child(child(tree, 'items'), 'sku')?.description).toBe(
      'Stock keeping unit',
    );
    expect(child(tree, 'counters')?.type).toBe('dictionary[string, integer]');
  });

  it('hides safe-integer bounds from Zod ints', () => {
    const tree = ordersTree('classify');
    const image = tree.variants?.options[1]?.node;

    expect(child(image, 'width')?.constraints).toEqual([]);
  });

  it('labels discriminated unions by their constant', () => {
    const tree = ordersTree('classify');

    expect(tree.variants?.keyword).toBe('oneOf');
    expect(tree.variants?.options.map(({ label }) => label)).toEqual([
      'text',
      'image',
      'empty',
    ]);
    expect(tree.type).toBe('text or image or empty');
  });

  it('marks recursion instead of expanding forever', () => {
    const tree = ordersTree('tree');
    const children = child(tree, 'children');

    expect(children?.type).toBe('array[treeRequest]');
    expect(children?.recursiveRef).toBe('#/components/schemas/treeRequest');
    expect(children?.children).toEqual([]);
  });

  it('expands a reused but non-recursive ref every time', () => {
    const tree = ordersTree('create');

    expect(child(tree, 'shippingAddress')?.children.length).toBeGreaterThan(0);
    expect(child(tree, 'billingAddress')?.children.length).toBe(
      child(tree, 'shippingAddress')?.children.length,
    );
  });

  it('honours $ref siblings, nullable anyOf and validations without a type', () => {
    const root = {
      $defs: { Id: { type: 'string', format: 'uuid' } },
      type: 'object',
      properties: {
        id: { $ref: '#/$defs/Id', readOnly: true, description: 'Server id' },
        parent: { anyOf: [{ $ref: '#/$defs/Id' }, { type: 'null' }] },
        code: { pattern: '^[A-Z]+$' },
      },
    };

    const write = buildSchemaTree(root, { mode: 'write' });
    expect(child(write, 'id')).toBeUndefined();

    const read = buildSchemaTree(root, { mode: 'read' });
    expect(child(read, 'id')).toMatchObject({
      type: 'string<uuid>',
      readOnly: true,
      description: 'Server id',
    });
    expect(child(read, 'parent')).toMatchObject({
      type: 'string<uuid>',
      nullable: true,
    });
    expect(child(read, 'code')?.pattern).toBe('^[A-Z]+$');
  });

  it('keeps declared properties next to additionalProperties', () => {
    const tree = buildSchemaTree({
      type: 'object',
      properties: { name: { type: 'string' } },
      additionalProperties: {},
    });

    expect(tree.children.map(({ name }) => name)).toEqual([
      'name',
      '[key: string]',
    ]);
  });

  it('lists keywords it cannot draw as raw rules', () => {
    const tree = buildSchemaTree({ type: 'string', not: { const: '' } });

    expect(tree.rules).toEqual([{ keyword: 'not', value: { const: '' } }]);
  });

  it('reports unresolvable refs', () => {
    const tree = buildSchemaTree({ $ref: 'other.json#/Foo' });

    expect(tree.error).toBe(
      'External reference other.json#/Foo is not supported',
    );
  });
});

describe('buildSchemaTree with Pydantic schemas', () => {
  function pythonTree(handlerName: string) {
    const document = loadFixture('1.8.1-py-Orders.json');
    const handler = parseServiceContract(document).handlers.find(
      ({ name }) => name === handlerName,
    );
    return buildSchemaTree(handler?.modes.call?.body?.schema, {
      root: document,
      mode: 'write',
    });
  }

  it('follows a root $ref next to $defs and stops at recursion', () => {
    const tree = pythonTree('tree');
    const children = child(tree, 'children');

    expect(tree.type).toBe('TreeNode');
    expect(child(tree, 'value')?.required).toBe(true);
    expect(children?.recursiveRef).toBe(
      '#/components/schemas/treeRequest/$defs/TreeNode',
    );
    expect(children?.defaultValue).toEqual({ value: [] });
  });

  it('labels variants by title', () => {
    expect(
      pythonTree('classify').variants?.options.map(({ label }) => label),
    ).toEqual(['TextItem', 'ImageItem']);
  });
});
