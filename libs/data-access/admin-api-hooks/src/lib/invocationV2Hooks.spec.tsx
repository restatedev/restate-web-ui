import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { metaQueryKey } from '@restate/data-access-admin-api';
import { FeatureFlags } from '@restate/util-feature-flag';
import { useCanSortInvocationsByTransition } from './invocationV2Hooks';

describe('useCanSortInvocationsByTransition', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient();
  });

  afterEach(() => {
    cleanup();
    client.clear();
    localStorage.clear();
  });

  function render(features: Record<string, boolean>) {
    client.setQueryData(metaQueryKey(''), { version: '1.8.1', features });
    return renderHook(() => useCanSortInvocationsByTransition(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>
          <FeatureFlags>{children}</FeatureFlags>
        </QueryClientProvider>
      ),
    });
  }

  it('allows the transition sort when the flag and the server feature are on', async () => {
    localStorage.setItem('FEATURE_INDEXES_V1', 'true');
    const { result } = render({ indexes_v1: true });
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('rejects the transition sort when the server does not report indexes_v1', async () => {
    localStorage.setItem('FEATURE_INDEXES_V1', 'true');
    const { result } = render({ indexes_v1: false });
    await new Promise((resolve) => setTimeout(resolve));
    expect(result.current).toBe(false);
  });

  it('rejects the transition sort when the flag is off', async () => {
    const { result } = render({ indexes_v1: true });
    await new Promise((resolve) => setTimeout(resolve));
    expect(result.current).toBe(false);
  });
});
