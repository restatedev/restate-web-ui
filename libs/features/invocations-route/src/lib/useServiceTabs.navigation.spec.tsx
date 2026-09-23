import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { flushSync } from 'react-dom';
import {
  createMemoryRouter,
  RouterProvider,
  useHref,
  useNavigate,
} from 'react-router';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentPanel } from '@restate/ui/content-panel';
import type { components } from '@restate/data-access/admin-api-spec';
import { useServiceTabs } from './useServiceTabs';
import { useInvocationSearchParams } from './useInvocationSearchParams';

vi.mock('@restate/features/restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features/restate-context')
  >()),
  useRestateContext: () => ({ baseUrl: '' }),
}));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const deployments = {
  services: new Map(),
  deployments: new Map(),
  sortedServiceNames: [
    'AgentSession',
    'HealthyService',
    'NoisyService',
    'OtherA',
    'OtherB',
    'OverflowService',
  ],
};
const clients: QueryClient[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
const originalScrollBy = Element.prototype.scrollBy;

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal('CSS', { ...CSS, escape: (value: string) => value });
  Element.prototype.scrollBy = vi.fn();
});

afterEach(() => {
  cleanup();
  routers.splice(0).forEach((router) => router.dispose());
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalScrollBy) Element.prototype.scrollBy = originalScrollBy;
  else Reflect.deleteProperty(Element.prototype, 'scrollBy');
});

function summaryFor(
  service: string,
): components['schemas']['SummaryInvocationsV2Response'] {
  const counts =
    service === 'all'
      ? {
          NoisyService: 300,
          LegacyService: 250,
          HealthyService: 200,
          AgentSession: 100,
        }
      : {
          NoisyService: 30,
          LegacyService: 25,
          HealthyService: 20,
          AgentSession: 999,
        };
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return {
    mode: 'exact',
    isPartial: false,
    stageCountsArePartial: false,
    queryDurationMs: 1,
    appliedFilters: [],
    total,
    stageBuckets: [
      {
        key: 'finished',
        label: 'Completed',
        statuses: ['succeeded'],
        count: total,
        isIncluded: true,
        breakdownIsPartial: false,
        breakdownCoverage: 'full',
        breakdownCanRefine: false,
      },
    ],
    statusBuckets: [],
    serviceBuckets: Object.entries(counts).map(([service, count]) => ({
      service,
      count,
      isIncluded: true,
      statusBuckets: [],
    })),
  };
}

function setup(withSummary = false) {
  const loader = deferred();
  const results = deferred();
  const navigations = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  if (withSummary) client.setQueryData(['summary', 'all'], summaryFor('all'));

  function Page() {
    const navigate = useNavigate();
    const [params] = useInvocationSearchParams();
    const value = params.get('filter_target_service_name');
    const service: string = value ? JSON.parse(value).value[0] : 'all';
    const summary = useQuery({
      queryKey: ['summary', service],
      queryFn: async () => {
        if (service !== 'all') await results.promise;
        return summaryFor(service);
      },
      enabled: withSummary,
    });
    const tabs = useServiceTabs(
      summary.data,
      deployments,
      undefined,
      withSummary && summary.isPending,
    );
    const query = useQuery({
      queryKey: ['invocations', service],
      queryFn: async () => {
        if (service !== 'all') await results.promise;
        return `${service} rows`;
      },
    });
    return (
      <AriaRouterProvider
        useHref={useHref}
        navigate={(href, options) => {
          navigations(href, options);
          void navigate(href, options);
        }}
      >
        <ContentPanel tabs={tabs}>
          <output aria-label="Rows">
            {query.isPending ? 'Loading invocations' : query.data}
          </output>
        </ContentPanel>
      </AriaRouterProvider>
    );
  }

  const router = createMemoryRouter(
    [
      {
        path: '/invocations',
        loader: async ({ request }) => {
          if (
            new URL(request.url).searchParams.has('filter_target_service_name')
          )
            await loader.promise;
          return null;
        },
        element: <Page />,
      },
    ],
    {
      basename: '/ui',
      initialEntries: ['/ui/invocations'],
      hydrationData: { loaderData: { '0': null } },
    },
  );
  routers.push(router);
  render(
    <QueryClientProvider client={client}>
      <RouterProvider
        router={router}
        flushSync={(fn) => {
          flushSync(fn);
        }}
      />
    </QueryClientProvider>,
  );
  return { loader, results, navigations, router };
}

describe('service tab navigation', () => {
  it('keeps established tab positions through loading and changed counts, including undeployed services', async () => {
    const { loader, results } = setup(true);
    await screen.findByText('all rows');
    const tabOrder = () =>
      screen.getAllByRole('tab').map((tab) => tab.getAttribute('data-key'));
    const before = tabOrder();
    expect(before).toEqual([
      '__all__',
      'NoisyService',
      'LegacyService',
      'HealthyService',
      'AgentSession',
    ]);
    fireEvent.click(screen.getByRole('tab', { name: /^AgentSession/ }));
    expect(screen.getByLabelText('Rows').textContent).toBe(
      'Loading invocations',
    );
    expect(tabOrder()).toEqual(before);
    expect(screen.getByRole('tab', { name: 'NoisyService' })).toBeTruthy();
    await act(async () => loader.resolve());
    expect(tabOrder()).toEqual(before);
    await act(async () => results.resolve());
    await waitFor(() =>
      expect(
        screen.getByRole('tab', { name: /^AgentSession/ }).textContent,
      ).toContain('999'),
    );
    expect(tabOrder()).toEqual(before);
  });

  it.each(['inline', 'overflow', 'mobile'] as const)(
    'updates the %s selection while navigation and results are still pending',
    async (surface) => {
      const { loader, results, navigations } = setup();
      const user = userEvent.setup();
      await screen.findByText('all rows');
      const service = surface === 'inline' ? 'AgentSession' : 'OverflowService';
      if (surface === 'inline') {
        expect(
          screen.getByRole('tab', { name: service }).getAttribute('href'),
        ).toContain('/ui/invocations?');
        await user.click(screen.getByRole('tab', { name: service }));
      } else {
        await user.click(
          screen.getByRole('button', {
            name: surface === 'overflow' ? 'More' : 'All services',
          }),
        );
        await user.click(
          await screen.findByRole('menuitem', { name: service }),
        );
      }
      expect(navigations).toHaveBeenLastCalledWith(expect.any(String), {
        flushSync: true,
        preventScrollReset: true,
      });
      expect(
        screen
          .getByRole('tab', { name: service })
          .getAttribute('aria-selected'),
      ).toBe('true');
      expect(screen.getByLabelText('Rows').textContent).toBe(
        'Loading invocations',
      );
      await act(async () => loader.resolve());
      expect(screen.getByLabelText('Rows').textContent).toBe(
        'Loading invocations',
      );
      await act(async () => results.resolve());
      await screen.findByText(`${service} rows`);
    },
  );

  it('keeps All services selected when an earlier service request finishes late', async () => {
    const { loader, results } = setup();
    await screen.findByText('all rows');
    fireEvent.click(screen.getByRole('tab', { name: 'AgentSession' }));
    fireEvent.click(screen.getByRole('tab', { name: 'All services' }));
    await waitFor(() =>
      expect(
        screen
          .getByRole('tab', { name: 'All services' })
          .getAttribute('aria-selected'),
      ).toBe('true'),
    );
    await act(async () => {
      loader.resolve();
      results.resolve();
    });
    expect(
      screen
        .getByRole('tab', { name: 'All services' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.getByLabelText('Rows').textContent).toBe('all rows');
  });
});
