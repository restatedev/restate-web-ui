import { act, render, screen } from '@testing-library/react';
import { IconName } from '@restate/ui/icons';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { Breadcrumbs } from './Breadcrumbs';
import { BreadcrumbsProvider, useBreadcrumbs } from './BreadcrumbsProvider';
import type { PageDefinition } from './types';

const pages: PageDefinition[] = [
  {
    pattern: '/invocations',
    kind: 'list',
    resource: 'invocations',
    label: 'Invocations',
    icon: IconName.Invocation,
  },
  {
    pattern: '/invocations/:id',
    kind: 'detail',
    resource: 'invocations',
    label: (params) => params['id'] ?? '',
    icon: IconName.Invocation,
  },
  {
    pattern: '/services',
    kind: 'list',
    resource: 'services',
    label: 'Services',
    icon: IconName.Box,
  },
];

function TrailProbe() {
  const crumbs = useBreadcrumbs();
  return (
    <div data-testid="trail">
      {crumbs
        .map((crumb) => `${crumb.label}${crumb.isCurrent ? '*' : ''}`)
        .join(' / ')}
    </div>
  );
}

function createTestRouter(
  initialPath = '/invocations',
  testPages = pages,
  variant?: 'chips' | 'flat',
) {
  return createMemoryRouter(
    [
      {
        element: (
          <BreadcrumbsProvider pages={testPages}>
            <TrailProbe />
            <Breadcrumbs variant={variant} />
            <Outlet />
          </BreadcrumbsProvider>
        ),
        children: [
          { path: '/invocations', element: null },
          { path: '/invocations/:id', element: null },
          { path: '/services', element: null },
          { path: '/features', element: null },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
}

async function navigate(
  router: ReturnType<typeof createTestRouter>,
  to: string | number,
) {
  await act(async () => {
    await (typeof to === 'number' ? router.navigate(to) : router.navigate(to));
  });
}

function trail() {
  return screen.getByTestId('trail').textContent;
}

describe('BreadcrumbsProvider', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('should build the trail while navigating and mark the current crumb', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    expect(trail()).toBe('Invocations*');

    await navigate(router, '/invocations/inv-1');
    expect(trail()).toBe('Invocations / inv-1*');

    await navigate(router, '/invocations/inv-2');
    expect(trail()).toBe('Invocations / inv-1 / inv-2*');
  });

  it('should reset on list pages', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');
    await navigate(router, '/services');
    expect(trail()).toBe('Services*');
  });

  it('should restore each history entry on back/forward instead of recomputing', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');
    await navigate(router, '/services');

    await navigate(router, -1);
    expect(trail()).toBe('Invocations / inv-1*');

    await navigate(router, 1);
    expect(trail()).toBe('Services*');
  });

  it('should restore deep trails when walking back through details', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');
    await navigate(router, '/invocations/inv-2');
    await navigate(router, '/invocations/inv-3');

    await navigate(router, -1);
    expect(trail()).toBe('Invocations / inv-1 / inv-2*');
    await navigate(router, -1);
    expect(trail()).toBe('Invocations / inv-1*');
    await navigate(router, 1);
    expect(trail()).toBe('Invocations / inv-1 / inv-2*');
  });

  it('should restore the pre-loop trail when going back after a cycle truncation', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');
    await navigate(router, '/invocations/inv-2');
    await navigate(router, '/invocations/inv-3');
    expect(trail()).toBe('Invocations / inv-1 / inv-2 / inv-3*');

    await navigate(router, '/invocations/inv-1');
    expect(trail()).toBe('Invocations / inv-1*');

    await navigate(router, -1);
    expect(trail()).toBe('Invocations / inv-1 / inv-2 / inv-3*');

    await navigate(router, 1);
    expect(trail()).toBe('Invocations / inv-1*');
  });

  it('should keep the query params the list was left with in the list crumb href', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    await navigate(
      router,
      '/invocations?filter_status=running&sort_field=modified_at',
    );
    await navigate(router, '/invocations/inv-1');

    const listLink = screen.getByRole('link', { name: /Invocations/ });
    expect(listLink.getAttribute('href')).toBe(
      '/invocations?filter_status=running&sort_field=modified_at',
    );
  });

  it('should render custom crumb content configured for a page type', async () => {
    const customPages = pages.map((page) =>
      page.kind === 'detail'
        ? {
            ...page,
            Content: ({ crumb }: { crumb: { label: string } }) => (
              <span data-testid="custom-crumb">{crumb.label}!</span>
            ),
          }
        : page,
    );
    const router = createTestRouter('/invocations', customPages);
    render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');
    expect(screen.getByTestId('custom-crumb').textContent).toBe('inv-1!');
  });

  it('should synthesize the list on direct entry to a detail page', () => {
    const router = createTestRouter('/invocations/inv-9');
    render(<RouterProvider router={router} />);
    expect(trail()).toBe('Invocations / inv-9*');
  });

  it('should collapse long trails into edge crumbs plus dropdowns', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    for (let i = 1; i <= 5; i++) {
      await navigate(router, `/invocations/inv-${i}`);
    }
    expect(trail()).toBe(
      'Invocations / inv-1 / inv-2 / inv-3 / inv-4 / inv-5*',
    );

    expect(screen.getByRole('link', { name: 'Invocations' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'inv-1' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'inv-4' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'inv-2' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'inv-3' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Show 2 more pages' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Show 4 more pages' }),
    ).toBeTruthy();
  });

  it('should clear the trail on unclassified pages', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    await navigate(router, '/features');
    expect(trail()).toBe('');
  });
});

describe('Breadcrumbs flat variant', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('should render crumbs as flat links with a bordered current crumb', async () => {
    const router = createTestRouter('/invocations', pages, 'flat');
    render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');

    const listLink = screen.getByRole('link', { name: 'Invocations' });
    expect(listLink.getAttribute('href')).toBe('/invocations');
    expect(screen.queryByRole('link', { name: 'inv-1' })).toBeNull();
    const currentLabel = screen.getByText('inv-1');
    const currentCrumb = currentLabel.closest('[aria-current="page"]');
    expect(currentCrumb).toBeTruthy();
    expect(currentCrumb?.querySelector('[data-chip]')).toBeTruthy();
  });

  it('should keep the collapse dropdowns in the flat variant', async () => {
    const router = createTestRouter('/invocations', pages, 'flat');
    render(<RouterProvider router={router} />);
    for (let i = 1; i <= 5; i++) {
      await navigate(router, `/invocations/inv-${i}`);
    }

    expect(screen.getByRole('link', { name: 'Invocations' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'inv-1' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'inv-4' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'inv-2' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'inv-3' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Show 2 more pages' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Show 4 more pages' }),
    ).toBeTruthy();
  });
});
