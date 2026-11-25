import { act, render, screen } from '@testing-library/react';
import { IconName } from '@restate/ui-icons';
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

  it('should show the list and the current page while navigating', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    expect(trail()).toBe('Invocations*');

    await navigate(router, '/invocations/inv-1');
    expect(trail()).toBe('Invocations / inv-1*');

    await navigate(router, '/invocations/inv-2');
    expect(trail()).toBe('Invocations / inv-2*');
  });

  it('should show the own list of a page, not the page it was opened from', async () => {
    const router = createTestRouter('/services');
    render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');
    expect(trail()).toBe('Invocations / inv-1*');
  });

  it('should reset on list pages', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');
    await navigate(router, '/services');
    expect(trail()).toBe('Services*');
  });

  it('should follow back and forward navigation', async () => {
    const router = createTestRouter();
    render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');
    await navigate(router, '/invocations/inv-2');
    await navigate(router, '/services');

    await navigate(router, -1);
    expect(trail()).toBe('Invocations / inv-2*');
    await navigate(router, -1);
    expect(trail()).toBe('Invocations / inv-1*');
    await navigate(router, 1);
    expect(trail()).toBe('Invocations / inv-2*');
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

  it('should keep the list query on other detail pages and after a reload', async () => {
    const router = createTestRouter('/invocations?filter_status=running');
    const { unmount } = render(<RouterProvider router={router} />);
    await navigate(router, '/invocations/inv-1');
    await navigate(router, '/services');
    await navigate(router, '/invocations/inv-2');
    expect(
      screen.getByRole('link', { name: /Invocations/ }).getAttribute('href'),
    ).toBe('/invocations?filter_status=running');
    unmount();

    render(<RouterProvider router={createTestRouter('/invocations/inv-3')} />);
    expect(
      screen.getByRole('link', { name: /Invocations/ }).getAttribute('href'),
    ).toBe('/invocations?filter_status=running');
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

  it('should put the list before a detail page on direct entry', () => {
    const router = createTestRouter('/invocations/inv-9');
    render(<RouterProvider router={router} />);
    expect(trail()).toBe('Invocations / inv-9*');
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
});
