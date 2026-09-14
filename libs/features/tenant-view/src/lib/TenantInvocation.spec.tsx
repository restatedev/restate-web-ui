import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantInvocation } from './TenantInvocation';

vi.mock('@restate/features/restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features/restate-context')
  >()),
  useRestateContext: () => ({ baseUrl: '/tenant-view/acme' }),
}));

const hooks = vi.hoisted(() => ({ journal: vi.fn() }));
vi.mock('@restate/data-access/admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access/admin-api-hooks')
  >()),
  useGetInvocationJournalWithInvocationV2: hooks.journal,
  useGetPausedError: () => ({}),
  useGetTransientError: () => ({}),
}));
vi.mock('@restate/features/invocation-route', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features/invocation-route')
  >()),
  JournalV2: ({ invocationId }: { invocationId: string }) => (
    <div data-testid="journal">{invocationId}</div>
  ),
}));

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal('CSS', { ...globalThis.CSS, escape: (value: string) => value });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TenantInvocation', () => {
  it('renders the shared journal and preserves the list filters on the back link', () => {
    hooks.journal.mockReturnValue({
      data: {
        id: 'inv-acme',
        scope: 'acme',
        target: 'Greeter/run',
        target_service_name: 'Greeter',
        target_handler_name: 'run',
        target_service_ty: 'service',
        status: 'succeeded',
        created_at: '2026-09-14T08:00:00Z',
        modified_at: '2026-09-14T08:00:02Z',
        completed_at: '2026-09-14T08:00:02Z',
        vqueue: {
          vqueue_id: 'vq-acme',
          stage: 'finished',
          status: 'succeeded',
          created_at: '2026-09-14T08:00:00Z',
          first_runnable_at: '2026-09-14T08:00:00Z',
          first_attempt_at: '2026-09-14T08:00:01Z',
          num_attempts: 1,
        },
      },
      dataUpdatedAt: Date.now(),
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter
          initialEntries={[
            '/tenant-view/acme/invocations/inv-acme?service=Greeter&status=running&detail=all&q=ignored',
          ]}
        >
          <TenantInvocation scope="acme" invocationId="inv-acme" />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Lifecycle' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
    expect(screen.getByTestId('journal').textContent).toBe('inv-acme');
    expect(
      screen.getByRole('link', { name: 'Invocations' }).getAttribute('href'),
    ).toBe('/tenant-view/acme/invocations?service=Greeter&status=running');
    expect(
      screen.queryByRole('button', { name: /Cancel|Kill|Pause|Resume/ }),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: /Open.*handler/ })).toBeNull();
    expect(screen.queryByText('SCOPE')).toBeNull();
  });

  it('does not mount the journal when the invocation lookup fails', () => {
    hooks.journal.mockReturnValue({
      error: new Error('Invocation not found.'),
      dataUpdatedAt: 0,
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <TenantInvocation scope="acme" invocationId="inv-other" />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.queryByTestId('journal')).toBeNull();
    expect(screen.getByText('Invocation not found.')).toBeTruthy();
  });
});
