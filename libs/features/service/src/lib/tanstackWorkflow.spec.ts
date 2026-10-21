import {
  getListedHandlers,
  isTanstackWorkflow,
  jsonSkeleton,
  workflowPayloadSkeleton,
} from './tanstackWorkflow';

describe('isTanstackWorkflow', () => {
  it('matches exactly the tanstack-workflow integration', () => {
    expect(
      isTanstackWorkflow({
        metadata: { 'restate.dev/integration': 'tanstack-workflow' },
      }),
    ).toBe(true);
    expect(
      isTanstackWorkflow({
        metadata: { 'restate.dev/integration': 'Tanstack-Workflow' },
      }),
    ).toBe(false);
    expect(
      isTanstackWorkflow({ metadata: { 'restate.dev/integration': 'other' } }),
    ).toBe(false);
    expect(isTanstackWorkflow({ metadata: {} })).toBe(false);
    expect(isTanstackWorkflow({})).toBe(false);
    expect(isTanstackWorkflow(undefined)).toBe(false);
  });
});

describe('getListedHandlers', () => {
  const handlers = [{ name: 'run' }, { name: 'status' }];

  it('hides run for TanStack workflows only', () => {
    expect(
      getListedHandlers(
        { metadata: { 'restate.dev/integration': 'tanstack-workflow' } },
        handlers,
      ),
    ).toEqual([{ name: 'status' }]);
    expect(getListedHandlers({ metadata: {} }, handlers)).toBe(handlers);
  });
});

describe('jsonSkeleton', () => {
  it('builds a placeholder value from a JSON schema', () => {
    expect(
      jsonSkeleton({
        type: 'object',
        properties: {
          cartId: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          quantity: { type: 'integer' },
          express: { type: 'boolean' },
          currency: { enum: ['EUR', 'USD'] },
          note: { type: ['string', 'null'] },
          address: {
            type: 'object',
            properties: { city: { type: 'string', default: 'Rome' } },
          },
        },
      }),
    ).toEqual({
      cartId: '',
      items: [],
      quantity: 0,
      express: false,
      currency: 'EUR',
      note: '',
      address: { city: 'Rome' },
    });
  });

  it('falls back to an empty object without a schema', () => {
    expect(workflowPayloadSkeleton(undefined)).toBe('{}');
  });
});
