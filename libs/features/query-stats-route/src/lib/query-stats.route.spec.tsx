import { clearQueryStats, recordQuery } from '@restate/data-access/query';
import { AdminBaseURLProvider } from '@restate/data-access/admin-api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryStats, stripRouterBaseFromHref } from './query-stats.route';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('@restate/data-access/admin-api', async () => {
  const original = await vi.importActual<
    typeof import('@restate/data-access/admin-api')
  >('@restate/data-access/admin-api');
  return {
    ...original,
    client: { ...original.client, POST: postMock },
  };
});

class ResizeObserverStub {
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
  disconnect() {
    return undefined;
  }
}

function renderRoute(baseUrl = '') {
  return render(
    <MemoryRouter>
      <AdminBaseURLProvider baseUrl={baseUrl}>
        <QueryClientProvider client={new QueryClient()}>
          <queryStats.Component />
        </QueryClientProvider>
      </AdminBaseURLProvider>
    </MemoryRouter>,
  );
}

describe('queryStats route', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('CSS', { escape: (value: string) => value });
    postMock.mockReset();
    postMock.mockReturnValue(new Promise(() => undefined));
    clearQueryStats();
  });

  it('shows an empty state before any query is recorded', () => {
    renderRoute();
    expect(screen.getByText('No queries recorded yet')).toBeTruthy();
  });

  it('renders recorded executions aggregated per query id', () => {
    recordQuery({
      id: 'invocations/get',
      sql: 'SELECT 1',
      durationMs: 120,
      outcome: 'success',
      executedAt: Date.now(),
      page: { key: '/ui/invocations', href: '/ui/invocations' },
    });
    recordQuery({
      id: 'invocations/get',
      sql: 'SELECT 2',
      durationMs: 400,
      outcome: 'success',
      executedAt: Date.now(),
      page: { key: '/ui/invocations', href: '/ui/invocations' },
    });

    renderRoute();

    expect(
      screen.getAllByText(/Load a single invocation/).length,
    ).toBeGreaterThan(0);
    expect(document.body.textContent).toContain(
      'SELECT … FROM sys_invocation WHERE id = ?',
    );
    expect(
      screen.getAllByRole('link', { name: 'Invocations' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Explain analyze' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('Filter queries…')).toBeTruthy();
    expect(screen.queryByText(/\d+ of \d+ queries/)).toBeNull();
  });

  it('shows the query pattern and slowest recorded query in one tooltip', async () => {
    const user = userEvent.setup();
    recordQuery({
      id: 'invocations/get',
      sql: 'SELECT 1',
      durationMs: 120,
      outcome: 'success',
      executedAt: Date.now(),
    });
    recordQuery({
      id: 'invocations/get',
      sql: 'SELECT 2',
      durationMs: 400,
      outcome: 'success',
      executedAt: Date.now(),
    });
    renderRoute();

    const trigger = document.querySelector<HTMLElement>(
      '[data-query-pattern-trigger="true"]',
    );
    expect(trigger).toBeTruthy();
    expect(trigger?.className).toContain('underline');
    if (!trigger) return;

    await user.hover(trigger);

    expect(await screen.findByText('Query pattern')).toBeTruthy();
    expect(screen.getByText('Slowest recorded query')).toBeTruthy();
    expect(document.body.textContent).toContain('SELECT 2');
  });

  it('removes the router base from recorded page hrefs', () => {
    expect(stripRouterBaseFromHref('/ui/invocations', '/ui/')).toBe(
      '/invocations',
    );
    expect(
      stripRouterBaseFromHref(
        '/accounts/acc_123/environments/env_123/invocations?status=running',
        '/',
      ),
    ).toBe('/accounts/acc_123/environments/env_123/invocations?status=running');
    expect(stripRouterBaseFromHref('/ui2/invocations', '/ui/')).toBe(
      '/ui2/invocations',
    );
  });

  it('shows only stats for the current admin base URL', () => {
    const firstBaseUrl = 'https://admin.first-route.example';
    const secondBaseUrl = 'https://admin.second-route.example';
    recordQuery({
      id: 'invocations/get',
      sql: 'SELECT first',
      durationMs: 100,
      outcome: 'success',
      executedAt: Date.now(),
      baseUrl: firstBaseUrl,
      page: { key: '/overview', href: '/ui/overview' },
    });
    recordQuery({
      id: 'invocations/get',
      sql: 'SELECT second',
      durationMs: 900,
      outcome: 'success',
      executedAt: Date.now(),
      baseUrl: secondBaseUrl,
      page: { key: '/state', href: '/ui/state' },
    });

    renderRoute(firstBaseUrl);

    expect(
      screen.getAllByRole('link', { name: 'Overview' }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'State' })).toBeNull();
  });

  it('offers table and page filters', async () => {
    const user = userEvent.setup();
    recordQuery({
      id: 'invocations/get',
      sql: 'SELECT 1',
      durationMs: 120,
      outcome: 'success',
      executedAt: Date.now(),
      page: { key: '/ui/invocations', href: '/ui/invocations' },
    });
    renderRoute();

    await user.click(screen.getByPlaceholderText('Filter queries…'));

    expect(await screen.findByRole('option', { name: /Tables/ })).toBeTruthy();
    expect(await screen.findByRole('option', { name: /Pages/ })).toBeTruthy();
  });

  it('runs standard explain analyze from the primary action', async () => {
    recordQuery({
      id: 'invocations/get',
      sql: 'SELECT 1',
      durationMs: 120,
      outcome: 'success',
      executedAt: Date.now(),
    });
    renderRoute();

    const primaryAction = screen
      .getAllByRole('button', { name: 'Explain analyze' })
      .at(-1);
    expect(primaryAction).toBeDefined();
    if (!primaryAction) return;
    fireEvent.click(primaryAction);

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        '/query',
        expect.objectContaining({
          body: { query: 'EXPLAIN ANALYZE SELECT 1' },
        }),
      ),
    );
  });

  it('runs verbose explain analyze from the actions menu', async () => {
    recordQuery({
      id: 'invocations/get',
      sql: 'SELECT 1',
      durationMs: 120,
      outcome: 'success',
      executedAt: Date.now(),
    });
    renderRoute();

    const actionTriggers = document.querySelectorAll('button.trigger');
    fireEvent.click(actionTriggers.item(actionTriggers.length - 1));
    const verboseAction = (
      await screen.findAllByRole('menuitem', {
        name: 'Explain analyze verbose',
      })
    ).at(-1);
    expect(verboseAction).toBeDefined();
    if (!verboseAction) return;
    fireEvent.click(verboseAction);

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        '/query',
        expect.objectContaining({
          body: { query: 'EXPLAIN ANALYZE VERBOSE SELECT 1' },
        }),
      ),
    );
  });
});
