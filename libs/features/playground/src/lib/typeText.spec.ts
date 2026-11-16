import { describe, expect, it } from 'vitest';
import { bodyTypeText, typeText } from './typeText';

const root = {
  components: {
    schemas: {
      addRequest: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer', default: 1 },
        },
        required: ['productId'],
      },
      item: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer' },
        },
        required: ['productId', 'quantity'],
      },
      node: {
        type: 'object',
        properties: { next: { $ref: '#/components/schemas/node' } },
      },
    },
  },
};

describe('typeText', () => {
  it('prints primitives and any', () => {
    expect(typeText({ type: 'string' }, root)).toBe('string');
    expect(typeText(undefined, root)).toBe('any');
    expect(typeText({}, root)).toBe('any');
    expect(typeText({ type: ['string', 'null'] }, root)).toBe('string | null');
  });

  it('resolves refs and marks optional properties', () => {
    expect(typeText({ $ref: '#/components/schemas/addRequest' }, root)).toBe(
      '{ productId: string, quantity?: integer }',
    );
  });

  it('prints arrays, enums and unions', () => {
    expect(
      typeText(
        { type: 'array', items: { $ref: '#/components/schemas/item' } },
        root,
      ),
    ).toBe('{ productId: string, quantity: integer }[]');
    expect(typeText({ enum: ['free', 'pro'] }, root)).toBe('"free" | "pro"');
    expect(
      typeText(
        {
          type: 'array',
          items: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        },
        root,
      ),
    ).toBe('(string | number)[]');
  });

  it('shortens wide and deep objects', () => {
    expect(
      typeText(
        {
          type: 'object',
          properties: {
            a: { type: 'string' },
            b: { type: 'string' },
            c: { type: 'string' },
            d: { type: 'string' },
            e: { type: 'string' },
          },
          required: ['a', 'b', 'c', 'd', 'e'],
        },
        root,
      ),
    ).toBe('{ a: string, b: string, c: string, d: string, … }');
    expect(typeText({ $ref: '#/components/schemas/node' }, root)).toBe(
      '{ next?: { next?: {…} } }',
    );
  });

  it('names non-JSON bodies by content type', () => {
    expect(
      bodyTypeText({ contentType: 'application/octet-stream' }, root),
    ).toBe('application/octet-stream');
    expect(
      bodyTypeText(
        { contentType: 'application/json', schema: undefined },
        root,
      ),
    ).toBe('any');
    expect(bodyTypeText(undefined, root)).toBeUndefined();
  });
});
