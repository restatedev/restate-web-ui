import { describe, expect, it } from 'vitest';
import {
  getMetadataKeys,
  groupServices,
  parseServiceGroupBy,
} from './serviceGroups';
import type { OverviewService } from './sortServices';

function service(
  name: string,
  deploymentId: string,
  metadata?: Record<string, string>,
): OverviewService {
  return {
    name,
    ty: 'Service',
    revision: 1,
    deployment_id: deploymentId,
    metadata,
  } as OverviewService;
}

describe('service groups', () => {
  it.each([
    ['deployment', 'deployment'],
    ['meta.team', 'meta.team'],
    ['meta.', 'none'],
    ['type', 'none'],
    [null, 'none'],
  ])('reads %s from the URL as %s', (value, expected) => {
    expect(parseServiceGroupBy(value)).toBe(expected);
  });

  it('lists visible metadata keys, most used first', () => {
    const keys = getMetadataKeys([
      service('Cart', 'dp_core', {
        team: 'payments',
        tier: 'critical',
        'dev.restate.serde.preview.handler': 'json',
      }),
      service('Signup', 'dp_core', { team: 'identity' }),
      service('Greeter', 'dp_core'),
    ]);

    expect(keys).toEqual([
      { key: 'team', count: 2 },
      { key: 'tier', count: 1 },
    ]);
  });

  it('groups by a metadata key and puts services without it last', () => {
    const groups = groupServices(
      [
        service('Signup', 'dp_core', { team: 'identity' }),
        service('Greeter', 'dp_core'),
        service('Refunds', 'dp_core', { team: 'payments' }),
        service('Cart', 'dp_core', { team: 'payments' }),
        service('Export', 'dp_core', { team: '  ' }),
      ],
      'meta.team',
    );

    expect(
      groups.map(({ value, services }) => [
        value,
        services.map(({ name }) => name),
      ]),
    ).toEqual([
      ['identity', ['Signup']],
      ['payments', ['Refunds', 'Cart']],
      [null, ['Greeter', 'Export']],
    ]);
  });

  it('groups by deployment and orders groups by their label', () => {
    const endpoints: Record<string, string> = {
      dp_1: 'http://shipping:9080',
      dp_2: 'http://core:9080',
    };
    const groups = groupServices(
      [service('Shipping', 'dp_1'), service('Cart', 'dp_2')],
      'deployment',
      (id) => endpoints[id] ?? id,
    );

    expect(groups.map(({ value }) => value)).toEqual(['dp_2', 'dp_1']);
  });
});
