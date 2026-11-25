import { computeTrail } from '@restate/ui-breadcrumbs';
import { createBreadcrumbPages } from './pages';

function labels(pathname: string, patternPrefix?: string, search?: string) {
  return computeTrail({
    pages: createBreadcrumbPages({ patternPrefix }),
    pathname,
    search,
  }).map(({ label, href }) => ({ label, href }));
}

describe('breadcrumb pages', () => {
  it('puts Invocations above an invocation', () => {
    expect(labels('/invocations/inv_1')).toEqual([
      { label: 'Invocations', href: '/invocations' },
      { label: 'inv_1', href: '/invocations/inv_1' },
    ]);
  });

  it('puts Virtual Objects above a virtual object instance', () => {
    expect(
      labels('/virtual-objects/Counter/user-1', undefined, '?scope=tenant-a'),
    ).toEqual([
      { label: 'Virtual Objects', href: '/virtual-objects' },
      {
        label: 'Scope tenant-a · Counter / user-1',
        href: '/virtual-objects/Counter/user-1?scope=tenant-a',
      },
    ]);
  });

  it('keeps the VQueue list above a VQueue details page', () => {
    expect(labels('/flow-control/vqueues/vq_orders')).toEqual([
      { label: 'VQueues', href: '/flow-control/vqueues' },
      { label: 'vq_orders', href: '/flow-control/vqueues/vq_orders' },
    ]);
  });

  it('resolves the list inside a Cloud environment', () => {
    expect(
      labels(
        '/accounts/acc_1/environments/env_1/services/Greeter',
        '/accounts/:accountId/environments/:environmentId',
      ),
    ).toEqual([
      {
        label: 'Services',
        href: '/accounts/acc_1/environments/env_1/services',
      },
      {
        label: 'Greeter',
        href: '/accounts/acc_1/environments/env_1/services/Greeter',
      },
    ]);
  });

  it('resolves the tenant invocation list', () => {
    expect(labels('/tenants/acme/invocations/inv_1', '/tenants/acme')).toEqual([
      { label: 'Invocations', href: '/tenants/acme/invocations' },
      { label: 'inv_1', href: '/tenants/acme/invocations/inv_1' },
    ]);
  });
});
