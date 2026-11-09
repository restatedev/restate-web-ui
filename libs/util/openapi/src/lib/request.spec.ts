import { parseServiceContract } from './contract.js';
import {
  buildRequest,
  concreteContentType,
  validateRequest,
} from './request.js';
import { loadFixture } from './test-fixtures.js';
import type { HandlerMode } from './types.js';

function operation(fixture: string, handlerName: string, mode: HandlerMode) {
  const contract = parseServiceContract(loadFixture(fixture));
  const found = contract.handlers.find(({ name }) => name === handlerName)
    ?.modes[mode];
  if (!found) {
    throw new Error(`${handlerName}.${mode} not found in ${fixture}`);
  }
  return found;
}

const baseUrl = 'http://localhost:8080/';

describe('buildRequest', () => {
  it('encodes path values, adds headers and keeps the JSON body', () => {
    const request = buildRequest(
      operation('1.8.1-ts-Cart.json', 'add', 'send'),
      {
        parameters: {
          path: { key: 'user/42 #1?' },
          header: { 'idempotency-key': 'abc' },
          query: { delay: '10s' },
        },
        body: { kind: 'text', text: '{"sku":"a"}' },
      },
      { baseUrl },
    );

    expect(request).toEqual({
      method: 'POST',
      url: 'http://localhost:8080/restate/send/Cart/user%2F42%20%231%3F/add?delay=10s',
      headers: [
        ['Accept', 'application/json'],
        ['idempotency-key', 'abc'],
        ['Content-Type', 'application/json'],
      ],
      body: { kind: 'text', text: '{"sku":"a"}' },
    });
  });

  it('keeps idempotency keys in 1.7 attach paths as the server compares them', () => {
    const request = buildRequest(
      operation('1.7.2-ts-Orders.json', 'echo', 'attach'),
      { parameters: { path: { idempotencyKey: 'order:42/a' } } },
      { baseUrl },
    );

    expect(request.url).toBe(
      'http://localhost:8080/restate/invocation/Orders/echo/order:42%2Fa/attach',
    );
  });

  it('sends no body and no Content-Type for handlers without input', () => {
    const request = buildRequest(
      operation('1.8.1-ts-Orders.json', 'ping', 'call'),
      { parameters: {}, body: { kind: 'text', text: '' } },
      { baseUrl },
    );

    expect(request.body).toBeUndefined();
    expect(request.headers.map(([name]) => name)).not.toContain('Content-Type');
  });

  it('does not send a whitespace-only optional JSON body', () => {
    const request = buildRequest(
      operation('1.8.1-ts-Cart.json', 'add', 'call'),
      {
        parameters: { path: { key: 'a' } },
        body: { kind: 'text', text: ' \n ' },
      },
      { baseUrl },
    );

    expect(request.body).toBeUndefined();
  });

  it('keeps the placeholder for an empty path parameter', () => {
    const request = buildRequest(
      operation('1.8.1-ts-Cart.json', 'add', 'call'),
      { parameters: {} },
      { baseUrl },
    );

    expect(request.url).toBe(
      'http://localhost:8080/restate/call/Cart/{key}/add',
    );
  });

  it('omits an empty optional body', () => {
    const request = buildRequest(
      operation('1.8.1-ts-Orders.json', 'echo', 'call'),
      { parameters: {}, body: { kind: 'text', text: '' } },
      { baseUrl },
    );

    expect(request.body).toBeUndefined();
  });

  it('turns media ranges into a concrete Content-Type', () => {
    expect(concreteContentType('text/*')).toBe('text/plain');
    expect(concreteContentType('*/*')).toBe('application/octet-stream');
    expect(concreteContentType('application/json')).toBe('application/json');

    const request = buildRequest(
      operation('1.8.1-ts-Orders.json', 'importCsv', 'call'),
      { parameters: {}, body: { kind: 'text', text: 'a,b' } },
      { baseUrl },
    );
    expect(request.headers).toContainEqual(['Content-Type', 'text/plain']);
    expect(request.headers).toContainEqual(['Accept', 'text/plain']);
  });

  it('sends files as raw bytes', () => {
    const file = new Blob([new Uint8Array([1, 2, 3])]);
    const request = buildRequest(
      operation('1.8.1-ts-Orders.json', 'upload', 'call'),
      { parameters: {}, body: { kind: 'file', file, name: 'data.bin' } },
      { baseUrl },
    );

    expect(request.body).toEqual({ kind: 'file', file, name: 'data.bin' });
    expect(request.headers).toContainEqual([
      'Content-Type',
      'application/octet-stream',
    ]);
  });

  it('adds an API key as bearer auth only when one is given', () => {
    const add = operation('1.8.1-ts-Cart.json', 'add', 'call');
    const values = { parameters: { path: { key: 'k' } } };

    expect(
      buildRequest(add, values, { baseUrl }).headers.map(([name]) => name),
    ).not.toContain('Authorization');
    expect(
      buildRequest(add, values, { baseUrl, apiKey: 'secret' }).headers,
    ).toContainEqual(['Authorization', 'Bearer secret']);
  });

  it('builds scoped and 1.6 URLs', () => {
    expect(
      buildRequest(
        operation('1.8.1-ts-Cart.json', 'add', 'scopedCall'),
        { parameters: { path: { key: 'k', scope: 'tenant 1' } } },
        { baseUrl: 'http://[::1]:8080' },
      ).url,
    ).toBe('http://[::1]:8080/restate/scope/tenant%201/call/Cart/k/add');
    expect(
      buildRequest(
        operation('1.6.2-ts-Cart.json', 'add', 'send'),
        { parameters: { path: { key: 'k' } } },
        { baseUrl },
      ).url,
    ).toBe('http://localhost:8080/Cart/k/add/send');
  });
});

describe('validateRequest', () => {
  it('reports missing required parameters', () => {
    expect(
      validateRequest(operation('1.8.1-ts-Cart.json', 'add', 'call'), {
        parameters: {},
      }),
    ).toEqual([{ field: 'path:key', message: 'key is required' }]);
    expect(
      validateRequest(operation('1.8.1-ts-Cart.json', 'add', 'call'), {
        parameters: { path: { key: 'k' } },
      }),
    ).toEqual([]);
  });
});
