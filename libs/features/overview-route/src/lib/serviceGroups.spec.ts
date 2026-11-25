import { describe, expect, it } from 'vitest';
import {
  getMetadataKeys,
  getNextCollapsedGroups,
  groupServices,
  parseServiceGroupBy,
  resolveServiceGroupBy,
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

    expect(keys).toEqual(['team', 'tier']);
  });

  it.each([
    ['meta.team', 'meta.team'],
    ['meta.owner', 'none'],
    ['meta.dev.restate.serde.preview.handler', 'none'],
    ['meta.constructor', 'none'],
    ['deployment', 'deployment'],
  ] as const)(
    'keeps %s only when a service has that key',
    (groupBy, expected) => {
      expect(resolveServiceGroupBy(groupBy, ['team', 'tier'])).toBe(expected);
    },
  );

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

  it('ignores keys inherited from Object', () => {
    const groups = groupServices(
      [service('Cart', 'dp_core', { team: 'payments' })],
      'meta.constructor',
    );

    expect(groups.map(({ value }) => value)).toEqual([null]);
  });

  it('gives groups ids that no service or handler row can have', () => {
    const groups = groupServices(
      [service('group', 'dp_core', { team: 'payments' })],
      'meta.team',
    );

    expect(groups[0]?.id.startsWith('\x00')).toBe(true);
  });

  it('keeps collapsed groups that are not on screen when another row toggles', () => {
    const collapsed = new Set(['\x00group:billing', '\x00group:support']);
    const visible = ['\x00group:support', '\x00group:growth'];

    expect(
      getNextCollapsedGroups(
        collapsed,
        visible,
        new Set(['\x00group:growth', 'Cart']),
      ),
    ).toBeUndefined();
    expect(
      getNextCollapsedGroups(collapsed, visible, new Set(['Cart'])),
    ).toEqual(
      new Set(['\x00group:billing', '\x00group:support', '\x00group:growth']),
    );
    expect(
      getNextCollapsedGroups(
        collapsed,
        visible,
        new Set(['\x00group:support', '\x00group:growth']),
      ),
    ).toEqual(new Set(['\x00group:billing']));
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
