import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewProvider, useOverviewContext } from './OverviewContext';

const { useOverviewDataMock } = vi.hoisted(() => ({
  useOverviewDataMock: vi.fn(),
}));

vi.mock('./useOverviewData', () => ({
  useOverviewData: useOverviewDataMock,
}));

vi.mock('@restate/features/restate-context', () => ({
  useRestateContext: () => ({ baseUrl: 'http://localhost:9070' }),
}));

describe('OverviewProvider', () => {
  beforeEach(() => {
    useOverviewDataMock.mockReset();
    useOverviewDataMock.mockReturnValue({
      isSummaryLoading: false,
      isSummaryError: false,
      appliedFilters: [],
    });
  });

  it.each([
    ['/', false],
    ['/?view=services', false],
    ['/?view=deployments', true],
    ['/?view=handlers', false],
  ])('sets deployment status loading for %s', (entry, enabled) => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[entry]}>
          <OverviewProvider>
            <div />
          </OverviewProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(useOverviewDataMock).toHaveBeenCalledWith({
      deploymentStatusEnabled: enabled,
    });
  });

  it('opens old handler-tab URLs on Services', () => {
    const queryClient = new QueryClient();

    function ModeProbe() {
      return <div>{useOverviewContext().mode}</div>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?view=handlers']}>
          <OverviewProvider>
            <ModeProbe />
          </OverviewProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('services')).toBeTruthy();
  });
});
