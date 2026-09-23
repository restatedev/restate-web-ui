import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useInvocationSearchParams } from './useInvocationSearchParams';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const clients: QueryClient[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];

afterEach(() => {
  cleanup();
  routers.splice(0).forEach((router) => router.dispose());
  clients.splice(0).forEach((client) => client.clear());
});

function setup() {
  const loader = deferred();
  const results = deferred();
  const requests: string[] = [];
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);

  function Controls() {
    const [params, setParams] = useInvocationSearchParams();
    const navigate = useNavigate();
    const focus = params.get('filter_status') ?? 'all';
    return (
      <>
        {['all', 'not-completed', 'completed'].map((status) => (
          <button
            key={status}
            aria-pressed={focus === status}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('filter_status', status);
              void navigate(`?${next}`, { flushSync: true });
            }}
          >
            {status}
          </button>
        ))}
        <button
          onClick={() =>
            setParams((previous) => {
              previous.set('filter_target_service_name', 'AgentSession');
              return previous;
            })
          }
        >
          Select service
        </button>
        <output aria-label="Query">{params.toString()}</output>
      </>
    );
  }

  function Results() {
    const [params] = useInvocationSearchParams();
    const focus = params.get('filter_status') ?? 'all';
    const query = useQuery({
      queryKey: ['invocations', focus],
      queryFn: async () => {
        requests.push(focus);
        if (focus === 'completed') await results.promise;
        return `${focus} rows`;
      },
    });
    return (
      <output aria-label="Rows">
        {query.isPending ? 'Loading invocations' : query.data}
      </output>
    );
  }

  const router = createMemoryRouter(
    [
      {
        path: '/invocations',
        loader: async ({ request }) => {
          if (
            new URL(request.url).searchParams.get('filter_status') ===
            'completed'
          )
            await loader.promise;
          return null;
        },
        element: (
          <>
            <Controls />
            <Results />
          </>
        ),
      },
      {
        path: '/other',
        loader: async () => {
          await loader.promise;
          return null;
        },
        element: <p>Other page</p>,
      },
    ],
    {
      basename: '/ui',
      initialEntries: ['/ui/invocations?filter_status=all'],
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
  return { loader, results, requests, router };
}

describe('invocation query navigation', () => {
  it('updates selection and loading results before either navigation or the first query resolves', async () => {
    const { loader, results, requests } = setup();
    await screen.findByText('all rows');
    fireEvent.click(screen.getByRole('button', { name: 'completed' }));
    expect(
      screen
        .getByRole('button', { name: 'completed' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByLabelText('Rows').textContent).toBe(
      'Loading invocations',
    );
    await waitFor(() => expect(requests).toContain('completed'));
    await act(async () => loader.resolve());
    expect(screen.getByLabelText('Rows').textContent).toBe(
      'Loading invocations',
    );
    await act(async () => results.resolve());
    await screen.findByText('completed rows');
  });

  it('keeps the latest selection when an earlier navigation and query finish late', async () => {
    const { loader, results } = setup();
    await screen.findByText('all rows');
    fireEvent.click(screen.getByRole('button', { name: 'completed' }));
    fireEvent.click(screen.getByRole('button', { name: 'not-completed' }));
    await screen.findByText('not-completed rows');
    await act(async () => {
      loader.resolve();
      results.resolve();
    });
    expect(
      screen
        .getByRole('button', { name: 'not-completed' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByLabelText('Rows').textContent).toBe(
      'not-completed rows',
    );
  });

  it('preserves the requested status when changing another filter during navigation', async () => {
    const { loader, results, router } = setup();
    await screen.findByText('all rows');
    fireEvent.click(screen.getByRole('button', { name: 'completed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select service' }));
    expect(screen.getByLabelText('Query').textContent).toBe(
      'filter_status=completed&filter_target_service_name=AgentSession',
    );
    await act(async () => {
      loader.resolve();
      results.resolve();
    });
    await waitFor(() =>
      expect(router.state.location.search).toContain(
        'filter_target_service_name=AgentSession',
      ),
    );
  });

  it('restores filters on back navigation and ignores pending navigation to other pages', async () => {
    const { loader, results, router } = setup();
    await screen.findByText('all rows');
    fireEvent.click(screen.getByRole('button', { name: 'not-completed' }));
    await screen.findByText('not-completed rows');
    await act(async () => {
      await router.navigate(-1);
    });
    expect(
      screen.getByRole('button', { name: 'all' }).getAttribute('aria-pressed'),
    ).toBe('true');
    act(() => {
      void router.navigate('/other?filter_status=completed', {
        flushSync: true,
      });
    });
    expect(
      screen.getByRole('button', { name: 'all' }).getAttribute('aria-pressed'),
    ).toBe('true');
    await act(async () => {
      loader.resolve();
      results.resolve();
    });
    await screen.findByText('Other page');
  });
});
