import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { IconName } from '@restate/ui-icons';
import { SidebarNavItem } from './SidebarNavItem';

function renderSection(initialPath: string, autoExpandSubItems?: boolean) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <ul>
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
          </ul>
        ),
      },
    ],
    { initialEntries: [initialPath] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function isSectionOpen() {
  return (
    screen
      .getByRole('button', { name: /section$/ })
      .getAttribute('aria-expanded') === 'true'
  );
}

describe('SidebarNavItem', () => {
  it('opens a section collapsed by hand when you enter it again', async () => {
    const router = renderSection('/observability/logs');

    await userEvent.click(screen.getByRole('button', { name: /section$/ }));
    expect(isSectionOpen()).toBe(false);

    await act(() => router.navigate('/invocations'));
    expect(isSectionOpen()).toBe(false);

    await act(() => router.navigate('/observability/logs'));
    expect(isSectionOpen()).toBe(true);
  });

  it('keeps a section expanded by hand open when you enter it', async () => {
    const router = renderSection('/invocations', false);

    await userEvent.click(screen.getByRole('button', { name: /section$/ }));
    await act(() => router.navigate('/observability/metrics'));
    expect(isSectionOpen()).toBe(true);
  });
});
