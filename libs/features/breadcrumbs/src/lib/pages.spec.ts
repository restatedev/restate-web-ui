import { computeNextTrail } from '@restate/ui/breadcrumbs';
import { createBreadcrumbPages } from './pages';

describe('breadcrumb pages', () => {
  it('keeps VQueues as the origin when opening a virtual object instance', () => {
    const pages = createBreadcrumbPages();
    const vqueues = computeNextTrail({
      pages,
      pathname: '/flow-control/vqueues',
    });
    const instance = computeNextTrail({
      pages,
      prevTrail: vqueues,
      pathname: '/virtual-objects/Counter/user-1',
      search: '?scope=tenant-a',
    });

    expect(instance.map(({ label }) => label)).toEqual([
      'VQueues',
      'Scope tenant-a · Counter / user-1',
    ]);
    expect(instance[0]?.href).toBe('/flow-control/vqueues');
  });
});
