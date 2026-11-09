import { parseServiceContract } from './contract.js';
import {
  fixtureNames,
  loadFixture,
  withCloudSecurity,
} from './test-fixtures.js';

describe('parseServiceContract', () => {
  it.each(fixtureNames())('classifies every operation in %s', (name) => {
    const contract = parseServiceContract(loadFixture(name));

    expect(contract.isSupportedVersion).toBe(true);
    expect(contract.otherOperations).toEqual([]);
    expect(contract.handlers.length).toBeGreaterThan(0);
    for (const handler of contract.handlers) {
      expect(handler.modes.call).toBeDefined();
      expect(handler.modes.send).toBeDefined();
    }
  });

  it.each(['1.6.2', '1.7.2', '1.8.1'])(
    'groups Orders handlers for server %s',
    (version) => {
      const contract = parseServiceContract(
        loadFixture(`${version}-ts-Orders.json`),
      );

      expect(contract.name).toBe('Orders');
      expect(contract.handlers.map(({ name }) => name)).toEqual([
        'classify',
        'create',
        'echo',
        'forest',
        'importCsv',
        'ping',
        'tree',
        'upload',
      ]);
    },
  );

  it('reads 1.8 scoped modes and invocation tools', () => {
    const contract = parseServiceContract(loadFixture('1.8.1-ts-Cart.json'));
    const add = contract.handlers.find(({ name }) => name === 'add');

    expect(Object.keys(add?.modes ?? {}).sort()).toEqual([
      'call',
      'scopedCall',
      'scopedSend',
      'send',
    ]);
    expect(add?.modes.scopedCall?.path).toBe(
      '/restate/scope/{scope}/call/Cart/{key}/add',
    );
    expect(
      add?.modes.scopedSend?.parameters.map(({ name, role }) => [name, role]),
    ).toEqual([
      ['scope', 'scope'],
      ['key', 'key'],
      ['idempotency-key', 'idempotencyKey'],
      ['x-restate-limit-key', 'limitKey'],
      ['delay', 'delay'],
    ]);
    expect(
      contract.invocationTools.map(({ kind, byId, byTarget }) => [
        kind,
        byId?.method,
        byTarget?.method,
      ]),
    ).toEqual([
      ['attach', 'GET', 'POST'],
      ['output', 'GET', 'POST'],
      ['status', 'GET', 'POST'],
    ]);
  });

  it('reads per-handler attach and output from 1.6 and 1.7 servers', () => {
    for (const version of ['1.6.2', '1.7.2']) {
      const cart = parseServiceContract(loadFixture(`${version}-ts-Cart.json`));
      const add = cart.handlers.find(({ name }) => name === 'add');
      expect(add?.modes.attach?.path).toBe(
        '/restate/invocation/Cart/{key}/add/{idempotencyKey}/attach',
      );
      expect(add?.modes.output?.method).toBe('GET');

      const signup = parseServiceContract(
        loadFixture(`${version}-ts-Signup.json`),
      );
      const run = signup.handlers.find(({ name }) => name === 'run');
      expect(run?.modes.attach?.path).toBe(
        '/restate/workflow/Signup/{key}/attach',
      );
      expect(run?.modes.output?.path).toBe(
        '/restate/workflow/Signup/{key}/output',
      );
      expect(signup.invocationTools).toEqual([]);
    }
  });

  it.each(['1.6.2-ts-Orders.json', '1.7.2-ts-Orders.json'])(
    'ignores attach and output boilerplate in %s',
    (fixture) => {
      const contract = parseServiceContract(loadFixture(fixture));
      const handler = (name: string) =>
        contract.handlers.find((candidate) => candidate.name === name);

      expect(handler('echo')?.description).toBeUndefined();
      expect(handler('create')?.description).toBe(
        'Create a new order from a cart snapshot.',
      );
    },
  );

  it('keeps docs, metadata and bodies', () => {
    const contract = parseServiceContract(loadFixture('1.8.1-ts-Orders.json'));
    const handler = (name: string) =>
      contract.handlers.find((candidate) => candidate.name === name);

    expect(contract.description).toBe('Creates and inspects orders.');
    expect(contract.extensions).toEqual({
      team: 'commerce',
      owner: 'orders@example.com',
    });
    expect(handler('create')?.description).toBe(
      'Create a new order from a cart snapshot.',
    );
    expect(handler('create')?.extensions).toEqual({
      visibility: 'public',
      sla: '200ms',
    });
    expect(handler('echo')?.description).toBeUndefined();
    expect(handler('ping')?.modes.call?.body).toBeUndefined();
    expect(handler('upload')?.modes.call?.body).toMatchObject({
      contentType: 'application/octet-stream',
      schema: undefined,
    });
    expect(handler('create')?.modes.call?.body?.schema).toEqual({
      $ref: '#/components/schemas/createRequest',
    });
    expect(
      handler('create')?.modes.send?.responses.map(({ status }) => status),
    ).toEqual(['202', 'default']);
  });

  it('detects bearer auth added by Restate Cloud', () => {
    const plain = parseServiceContract(loadFixture('1.8.1-ts-Cart.json'));
    const cloud = parseServiceContract(
      withCloudSecurity(loadFixture('1.8.1-ts-Cart.json')),
    );

    expect(plain.security.bearer).toBe(false);
    expect(cloud.security).toEqual({ bearer: true, description: 'API Key' });
  });

  it('keeps unknown operations instead of dropping them', () => {
    const contract = parseServiceContract({
      openapi: '3.0.3',
      info: { title: 'Legacy' },
      paths: { '/health': { get: { operationId: 'health' } } },
    });

    expect(contract.isSupportedVersion).toBe(false);
    expect(contract.handlers).toEqual([]);
    expect(contract.otherOperations.map(({ id }) => id)).toEqual(['health']);
  });

  it('handles service names with dots', () => {
    const contract = parseServiceContract({
      openapi: '3.1.0',
      info: { title: 'acme.orders.v1.Orders' },
      paths: {
        '/restate/call/acme.orders.v1.Orders/create': {
          post: { operationId: 'create' },
        },
        '/restate/send/acme.orders.v1.Orders/create': {
          post: { operationId: 'createSend' },
        },
      },
    });

    expect(contract.handlers.map(({ name }) => name)).toEqual(['create']);
    expect(contract.otherOperations).toEqual([]);
  });
});
