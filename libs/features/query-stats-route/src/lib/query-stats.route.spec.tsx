import { clearQueryStats, recordQuery } from '@restate/data-access/query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryStats } from './query-stats.route';

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

function renderRoute() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <queryStats.Component />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('queryStats route', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
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
    expect(
      screen.getAllByText('SELECT … FROM sys_invocation WHERE id = ?').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: 'Invocations' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Explain analyze' }).length,
    ).toBeGreaterThan(0);
  });
});
