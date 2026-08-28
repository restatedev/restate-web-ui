import type {
  Deployment,
  Handler,
  Service,
} from '@restate/data-access/admin-api-spec';
import { describe, expect, it } from 'vitest';
import { getDeploymentTableRows } from './DeploymentsTable';
import {
  getNotCompletedInvocationCount,
  getServiceTableRows,
} from './ServicesTable';

function handler(name: string, ty?: Handler['ty']): Handler {
  return {
    name,
    ty,
    input_description: `${name} input`,
    output_description: `${name} output`,
  } as Handler;
}

function service({
  name,
  deploymentId,
  handlers,
}: {
  name: string;
  deploymentId: string;
  handlers: Handler[];
}): Service {
  return {
    name,
    deployment_id: deploymentId,
    handlers,
    revision: 3,
    ty: 'VirtualObject',
  } as Service;
}

function deployment({
  id,
  uri,
  services,
  createdAt,
}: {
  id: string;
  uri: string;
  services: Deployment['services'];
  createdAt: string;
}): Deployment {
  return {
    id,
    uri,
    services,
    created_at: createdAt,
  } as Deployment;
}

describe('overview tables', () => {
  it('excludes completed invocations from the service count', () => {
    expect(
      getNotCompletedInvocationCount([
        { name: 'inbox', count: 3 },
        { name: 'running', count: 2 },
        { name: 'finished', count: 11 },
      ]),
    ).toBe(5);
  });

  it('keeps matching handlers nested under their service', () => {
    const checkout = service({
      name: 'Checkout',
      deploymentId: 'dp_checkout',
      handlers: [handler('charge', 'Exclusive'), handler('refund', 'Shared')],
    });
    const rows = getServiceTableRows({
      servicesMap: new Map([[checkout.name, checkout]]),
      deploymentsMap: new Map(),
      filter: 'refund',
      sortDescriptor: { column: 'name', direction: 'ascending' },
      invocationCounts: new Map(),
      serviceIssuesMap: new Map(),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Checkout');
    expect(rows[0]?.visibleHandlers.map(({ name }) => name)).toEqual([
      'refund',
    ]);
    expect(rows[0]?.autoExpand).toBe(true);
    expect(rows[0]?.handlers).toHaveLength(2);
  });

  it('shows every handler when the service or deployment matches', () => {
    const checkout = service({
      name: 'Checkout',
      deploymentId: 'dp_checkout',
      handlers: [handler('refund'), handler('charge')],
    });
    const checkoutDeployment = deployment({
      id: 'dp_checkout',
      uri: 'http://checkout:9080',
      services: [{ name: checkout.name, revision: checkout.revision }],
      createdAt: '2026-08-26T10:00:00.000Z',
    });
    const rows = getServiceTableRows({
      servicesMap: new Map([[checkout.name, checkout]]),
      deploymentsMap: new Map([[checkoutDeployment.id, checkoutDeployment]]),
      filter: 'checkout:9080',
      sortDescriptor: { column: 'name', direction: 'ascending' },
      invocationCounts: new Map(),
      serviceIssuesMap: new Map(),
    });

    expect(rows[0]?.visibleHandlers.map(({ name }) => name)).toEqual([
      'charge',
      'refund',
    ]);
    expect(rows[0]?.autoExpand).toBe(false);
  });

  it.each([
    ['service name', 'checkout'],
    ['service type', 'virtualobject'],
    ['deployment ID', 'dp_checkout'],
    ['deployment endpoint', 'node:9080'],
  ])('searches services by %s', (_field, filter) => {
    const checkout = service({
      name: 'Checkout',
      deploymentId: 'dp_checkout',
      handlers: [handler('refund'), handler('charge')],
    });
    const checkoutDeployment = deployment({
      id: 'dp_checkout',
      uri: 'http://node:9080',
      services: [{ name: checkout.name, revision: checkout.revision }],
      createdAt: '2026-08-26T10:00:00.000Z',
    });
    const rows = getServiceTableRows({
      servicesMap: new Map([[checkout.name, checkout]]),
      deploymentsMap: new Map([[checkoutDeployment.id, checkoutDeployment]]),
      filter,
      sortDescriptor: { column: 'name', direction: 'ascending' },
      invocationCounts: new Map(),
      serviceIssuesMap: new Map(),
    });

    expect(rows[0]?.visibleHandlers.map(({ name }) => name)).toEqual([
      'charge',
      'refund',
    ]);
    expect(rows[0]?.autoExpand).toBe(false);
  });

  it.each([
    ['deployment ID', 'dp_first'],
    ['deployment endpoint', 'first:9080'],
    ['service name', 'checkout'],
  ])('searches deployments by %s', (_field, filter) => {
    const first = deployment({
      id: 'dp_first',
      uri: 'http://first:9080',
      services: [{ name: 'Checkout', revision: 3 }],
      createdAt: '2026-08-25T10:00:00.000Z',
    });
    const second = deployment({
      id: 'dp_second',
      uri: 'http://second:9080',
      services: [{ name: 'Payments', revision: 1 }],
      createdAt: '2026-08-26T10:00:00.000Z',
    });
    const rows = getDeploymentTableRows({
      deploymentsMap: new Map([
        [first.id, first],
        [second.id, second],
      ]),
      drainedDeploymentIds: new Set([first.id]),
      filter,
      sortDescriptor: { column: 'created_at', direction: 'descending' },
    });

    expect(rows.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'dp_first', status: 'drained' },
    ]);
  });

  it('does not search deployments by status or service revision', () => {
    const first = deployment({
      id: 'dp_first',
      uri: 'http://first:9080',
      services: [{ name: 'Checkout', revision: 3 }],
      createdAt: '2026-08-25T10:00:00.000Z',
    });
    const input = {
      deploymentsMap: new Map([[first.id, first]]),
      drainedDeploymentIds: new Set([first.id]),
      sortDescriptor: {
        column: 'created_at',
        direction: 'descending',
      } as const,
    };

    expect(getDeploymentTableRows({ ...input, filter: 'drained' })).toEqual([]);
    expect(getDeploymentTableRows({ ...input, filter: '3' })).toEqual([]);
  });
});
