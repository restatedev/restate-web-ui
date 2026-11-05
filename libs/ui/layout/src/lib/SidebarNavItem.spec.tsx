import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { IconName } from '@restate/ui-icons';
import { Sidebar, SidebarNav, SidebarProvider } from './Sidebar';
import { SidebarNavItem } from './SidebarNavItem';

function Shell({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <Sidebar />
      {children}
    </SidebarProvider>
  );
}

function Nav({ autoExpandSubItems }: { autoExpandSubItems?: boolean }) {
  const navigate = useNavigate();
  return (
    <AriaRouterProvider navigate={navigate}>
      <SidebarNav>
        <SidebarNavItem
          href="/invocations"
          icon={IconName.Invocation}
          label="Invocations"
        />
        <SidebarNavItem
          href="/observability/logs"
          icon={IconName.Box}
          label="Observability"
          autoExpandSubItems={autoExpandSubItems}
          subItems={[
            { href: '/observability/logs', label: 'Logs' },
            { href: '/observability/metrics', label: 'Metrics' },
          ]}
        />
      </SidebarNav>
    </AriaRouterProvider>
  );
}

function renderSidebar(initialPath: string, autoExpandSubItems?: boolean) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: <Nav autoExpandSubItems={autoExpandSubItems} />,
      },
    ],
    { initialEntries: [initialPath] },
  );
  const { rerender } = render(<Shell />);
  rerender(
    <Shell>
      <RouterProvider router={router} />
    </Shell>,
  );
  return router;
}

function sectionChevron() {
  return screen.getByRole('button', { name: /^(Collapse|Expand) section$/ });
}

function isSectionOpen() {
  return sectionChevron().getAttribute('aria-expanded') === 'true';
}

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SidebarNavItem', () => {
  it('opens a section collapsed with its chevron when its title is clicked', async () => {
    const user = userEvent.setup();
    const router = renderSidebar('/observability/logs');
    expect(isSectionOpen()).toBe(true);

    await user.click(sectionChevron());
    expect(isSectionOpen()).toBe(false);
    expect(router.state.location.pathname).toBe('/observability/logs');

    await user.click(screen.getByRole('link', { name: 'Invocations' }));
    expect(router.state.location.pathname).toBe('/invocations');
    expect(isSectionOpen()).toBe(false);

    await user.click(screen.getByRole('link', { name: 'Observability' }));
    expect(router.state.location.pathname).toBe('/observability/logs');
    expect(isSectionOpen()).toBe(true);
  });

  it('keeps a section expanded with its chevron open when its title is clicked', async () => {
    const user = userEvent.setup();
    renderSidebar('/invocations', false);
    expect(isSectionOpen()).toBe(false);

    await user.click(sectionChevron());
    expect(isSectionOpen()).toBe(true);

    await user.click(screen.getByRole('link', { name: 'Observability' }));
    expect(isSectionOpen()).toBe(true);
  });
});
