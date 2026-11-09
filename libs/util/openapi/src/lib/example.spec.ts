import { parseServiceContract } from './contract.js';
import {
  generateExample,
  sampleFromPattern,
  stringifyExample,
} from './example.js';
import { loadFixture } from './test-fixtures.js';

function requestExample(handlerName: string) {
  const document = loadFixture('1.8.1-ts-Orders.json');
  const contract = parseServiceContract(document);
  const handler = contract.handlers.find(({ name }) => name === handlerName);
  return generateExample(handler?.modes.call?.body?.schema, {
    root: document,
  });
}

describe('generateExample', () => {
  it('builds a full example for a rich Zod schema', () => {
    expect(requestExample('create')).toMatchSnapshot();
  });

  it('stops at recursive references', () => {
    expect(requestExample('tree')).toEqual({ value: 'string', children: [] });
  });

  it('ends nullable recursion with null', () => {
    const root = {
      $defs: {
        Node: {
          type: 'object',
          properties: {
            value: { type: 'string' },
            next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] },
          },
          required: ['value', 'next'],
        },
      },
    };

    expect(generateExample({ $ref: '#/$defs/Node' }, { root })).toEqual({
      value: 'string',
      next: null,
    });
  });

  it('stops recursion through allOf', () => {
    const root = {
      $defs: {
        Node: {
          type: 'object',
          properties: {
            value: { type: 'string' },
            left: { allOf: [{ $ref: '#/$defs/Node' }], description: 'Left' },
          },
        },
      },
    };

    expect(generateExample({ $ref: '#/$defs/Node' }, { root })).toEqual({
      value: 'string',
    });
  });

  it('takes the first branch of a union', () => {
    expect(requestExample('classify')).toEqual({
      type: 'text',
      content: 'string',
    });
  });

  it('prefers examples, const, default and enum over types', () => {
    expect(generateExample({ type: 'string', examples: ['a', 'b'] })).toBe('a');
    expect(generateExample({ type: 'string', const: 'fixed' })).toBe('fixed');
    expect(generateExample({ type: 'string', default: 'draft' })).toBe('draft');
    expect(generateExample({ enum: [null, 'x'] })).toBe('x');
  });

  it('respects numeric bounds but ignores safe-integer bounds', () => {
    expect(generateExample({ type: 'integer', minimum: 3 })).toBe(3);
    expect(generateExample({ type: 'number', maximum: -1 })).toBe(-1);
    expect(
      generateExample({
        type: 'integer',
        minimum: -9007199254740991,
        maximum: 9007199254740991,
      }),
    ).toBe(0);
    expect(generateExample({ type: 'integer', exclusiveMinimum: 0 })).toBe(1);
  });

  it('skips read-only fields in requests and write-only in responses', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string', readOnly: true },
        secret: { type: 'string', writeOnly: true },
      },
    };
    expect(generateExample(schema)).toEqual({ secret: 'string' });
    expect(generateExample(schema, { mode: 'response' })).toEqual({
      id: 'string',
    });
  });

  it('merges allOf and handles nullable type arrays', () => {
    expect(
      generateExample({
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: ['null', 'boolean'] } } },
        ],
      }),
    ).toEqual({ a: 'string', b: true });
  });

  it('samples simple regex patterns and falls back for complex ones', () => {
    expect(sampleFromPattern('^[0-9]{5}$')).toBe('00000');
    expect(sampleFromPattern('^[A-Z]{2}-\\d{3}$')).toBe('AA-000');
    expect(sampleFromPattern('^(foo|bar)+x?$')).toBe('foo');
    expect(sampleFromPattern('^(?=a)b$')).toBeUndefined();
    expect(sampleFromPattern('^[^a]+$')).toBeUndefined();
    expect(generateExample({ type: 'string', pattern: '^[0-9]{5}$' })).toBe(
      '00000',
    );
    expect(
      generateExample({ type: 'string', pattern: '(?<=x)y', minLength: 8 }),
    ).toBe('stringxx');
  });

  it('returns nothing for schemas that accept anything', () => {
    expect(generateExample(undefined)).toBeUndefined();
    expect(generateExample(true)).toBeUndefined();
    expect(generateExample({})).toBeUndefined();
    expect(stringifyExample(undefined)).toBe('');
  });
});
