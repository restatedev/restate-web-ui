import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { EditTimeoutDialog } from './EditTimeoutDialog';
import { EditRetentionDialog } from './EditRetentionDialog';

const { modifyService } = vi.hoisted(() => {
  Object.defineProperty(performance, 'measure', {
    configurable: true,
    value: vi.fn(),
  });
  console.timeStamp = vi.fn();
  return { modifyService: vi.fn() };
});

vi.mock('@restate/data-access/admin-api-hooks', () => ({
  useServiceDetails: () => ({
    data: {
      ty: 'Workflow',
      inactivity_timeout: '1m',
      abort_timeout: '10m',
      workflow_completion_retention: '1day',
      idempotency_retention: '1day',
      journal_retention: '1day',
      handlers: [{ name: 'run', ty: 'Workflow' }],
    },
    queryKey: ['service', 'health'],
    isPending: false,
  }),
  useModifyService: () => ({
    mutate: modifyService,
    reset: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@restate/features/restate-context', () => ({
  RestateMinimumVersion: ({ children }: PropsWithChildren) => children,
}));

class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

describe('EditTimeoutDialog', () => {
  beforeEach(() => modifyService.mockClear());
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('CSS', { escape: (value: string) => value });
  });

  afterAll(() => vi.unstubAllGlobals());

  it('keeps suggestions and the dialog responsive while updating timeout previews', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [{ path: '/services/health', element: <EditTimeoutDialog /> }],
      { initialEntries: ['/services/health?service-timeout=health'] },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    const inactivity = screen.getByRole('combobox', {
      name: 'Inactivity Explain Inactivity timeout',
    });
    await user.click(inactivity);
    expect(
      within(screen.getByRole('group', { name: 'Examples' })).getAllByRole(
        'option',
      ),
    ).toHaveLength(5);
    await user.clear(inactivity);
    await user.type(inactivity, '5m');
    expect(
      within(screen.getByRole('group', { name: 'Examples' })).getAllByRole(
        'option',
      ),
    ).toHaveLength(1);
    await user.click(screen.getByRole('option', { name: '5m' }));

    expect((inactivity as HTMLInputElement).value).toBe('5m');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(
      within(
        screen.getByRole('img', { name: 'Inactivity timeout timeline' }),
      ).getByText('5m'),
    ).toBeTruthy();

    const abort = screen.getByRole('combobox', {
      name: 'Abort Explain Abort timeout',
    });
    await user.clear(abort);
    await user.type(abort, '2h');
    expect(
      screen.getByText('No matching options. Enter a custom value.'),
    ).toBeTruthy();
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowDown}');
    expect(
      within(screen.getByRole('group', { name: 'Examples' })).getAllByRole(
        'option',
      ),
    ).toHaveLength(5);
    await user.keyboard('{Escape}');
    await user.tab();

    expect((abort as HTMLInputElement).value).toBe('2h');
    expect(
      within(
        screen.getByRole('img', { name: 'Abort timeout timeline' }),
      ).getByText('2h'),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(modifyService).toHaveBeenCalledWith({
      parameters: { path: { service: 'health' } },
      body: expect.objectContaining({
        inactivity_timeout: '5m',
        abort_timeout: '2h',
      }),
    });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps all three retention fields responsive while filtering and selecting examples', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [{ path: '/services/health', element: <EditRetentionDialog /> }],
      { initialEntries: ['/services/health?service-retention=health'] },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    for (const input of screen.getAllByRole('combobox')) {
      await user.click(input);
      expect(
        within(screen.getByRole('group', { name: 'Examples' })).getAllByRole(
          'option',
        ),
      ).toHaveLength(4);
      await user.clear(input);
      await user.type(input, '12h');
      expect(
        within(screen.getByRole('group', { name: 'Examples' })).getAllByRole(
          'option',
        ),
      ).toHaveLength(1);
      await user.click(screen.getByRole('option', { name: '12h' }));
      expect((input as HTMLInputElement).value).toBe('12h');
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    }

    const journal = screen.getByRole('combobox', {
      name: 'Journal retention Explain Journal retention',
    });
    await user.clear(journal);
    await user.type(journal, '2h');
    expect(
      screen.getByText('No matching options. Enter a custom value.'),
    ).toBeTruthy();
    await user.keyboard('{Escape}{ArrowDown}');
    expect(
      within(screen.getByRole('group', { name: 'Examples' })).getAllByRole(
        'option',
      ),
    ).toHaveLength(4);
    await user.keyboard('{Escape}');
    await user.tab();
    expect(
      screen
        .getAllByRole('img')
        .some((image) => image.textContent?.includes('2h')),
    ).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(modifyService).toHaveBeenCalledWith({
      parameters: { path: { service: 'health' } },
      body: expect.objectContaining({
        workflow_completion_retention: '12h',
        idempotency_retention: '12h',
        journal_retention: '2h',
      }),
    });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('names the dialog and discards an unsaved draft when it is reopened', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [{ path: '/services/health', element: <EditRetentionDialog /> }],
      { initialEntries: ['/services/health?service-retention=health'] },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('dialog', {
        name: 'Retention configuration for health',
      }),
    ).toBeTruthy();
    const journal = screen.getByRole('combobox', {
      name: 'Journal retention Explain Journal retention',
    });
    await user.clear(journal);
    await user.type(journal, '2h');
    await user.keyboard('{Escape}');
    expect(
      screen
        .getAllByRole('img')
        .some((image) => image.textContent?.includes('2h')),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await router.navigate('/services/health?service-retention=health');

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(
      (
        screen.getByRole('combobox', {
          name: 'Journal retention Explain Journal retention',
        }) as HTMLInputElement
      ).value,
    ).toBe('1day');
    expect(
      screen
        .getAllByRole('img')
        .some((image) => image.textContent?.includes('2h')),
    ).toBe(false);
  });
});
