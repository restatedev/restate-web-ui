import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import {
  AdminBaseURLProvider,
  SchemaRegistryProvider,
  useSchemaRegistry,
} from '@restate/data-access-admin-api';
import { setQueryClient } from '@restate/util-react-query';
import {
  useDeploymentDetails,
  useListDeployments,
  useListDrainedDeployments,
  useServiceCatalog,
} from './hooks';

const deployment = {
  type: 'http',
  id: 'dp_tenant',
  uri: 'http://checkout.acme/',
  protocol_type: 'BidiStream',
  http_version: 'HTTP/2.0',
  metadata: { tenant: 'acme' },
  created_at: '2026-10-20T10:00:00Z',
  min_protocol_version: 5,
  max_protocol_version: 6,
  services: [{ name: 'checkout', revision: 1 }],
};

const service = {
  name: 'checkout',
  ty: 'Service',
  handlers: [{ name: 'run', ty: 'Exclusive' }],
  deployment_id: 'dp_tenant',
  revision: 1,
  public: true,
};

function requestUrl(input: RequestInfo | URL) {
  return new URL(
    typeof input === 'object' && 'url' in input ? input.url : input,
  );
}

function respond(url: URL) {
  switch (url.pathname) {
    case '/v1/scopes/acme/health':
      return new Response(null, {
        status: 200,
        headers: { 'content-length': '0' },
      });
    case '/v1/scopes/acme/deployments':
      return Response.json({ deployments: [deployment] });
    case '/v1/scopes/acme/deployments/dp_tenant':
      return Response.json({ ...deployment, services: [service] });
    case '/v1/scopes/acme/services':
      return Response.json({ services: [service] });
    default:
      return Response.json({ message: 'not found' }, { status: 404 });
  }
}

describe('catalog hooks with a schema registry', () => {
  let client: QueryClient;
  let requests: string[];

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    setQueryClient(client);
    requests = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = requestUrl(input);
      requests.push(url.href);
      return respond(url);
    });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.restoreAllMocks();
  });

  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>
        <AdminBaseURLProvider baseUrl="http://admin.test">
          <SchemaRegistryProvider baseUrl="http://registry.test/" scope="acme">
            {children}
          </SchemaRegistryProvider>
        </AdminBaseURLProvider>
      </QueryClientProvider>
    );
  }

  it('reads deployments and services from the scope and skips the SQL catalog', async () => {
    const { result } = renderHook(
      () => ({
        deployments: useListDeployments(),
        catalog: useServiceCatalog(),
        drained: useListDrainedDeployments(),
      }),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.deployments.data?.deployments.size).toBe(1),
    );
    await waitFor(() =>
      expect(result.current.catalog.data.get('checkout')?.ty).toBe('Service'),
    );
    expect(result.current.catalog.isPending).toBe(false);
    expect(result.current.drained.fetchStatus).toBe('idle');
    expect(requests).toContain('http://registry.test/v1/scopes/acme/services');
    expect(
      requests.every((url) => url.startsWith('http://registry.test/')),
    ).toBe(true);
  });

  it('reads deployment details from the scope', async () => {
    const { result } = renderHook(() => useDeploymentDetails('dp_tenant'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data?.id).toBe('dp_tenant'));
    expect(requests).toContain(
      'http://registry.test/v1/scopes/acme/deployments/dp_tenant',
    );
  });

  it('keeps catalog queries idle and reports the error when the registry is down', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = requestUrl(input);
      requests.push(url.href);
      return Response.json({ message: 'unavailable' }, { status: 503 });
    });
    const { result } = renderHook(
      () => ({
        registry: useSchemaRegistry(),
        deployments: useListDeployments(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.registry?.error).toBeTruthy(), {
      timeout: 8000,
    });
    expect(result.current.deployments.fetchStatus).toBe('idle');
    expect(requests.length).toBeGreaterThan(0);
    expect(
      requests.every(
        (url) => url === 'http://registry.test/v1/scopes/acme/health',
      ),
    ).toBe(true);
  }, 10_000);
});
