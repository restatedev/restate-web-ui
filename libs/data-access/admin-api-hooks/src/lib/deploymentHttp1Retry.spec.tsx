import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { RestateError } from '@restate/util-errors';
import { useRegisterDeployment, useUpdateDeployment } from './hooks';

const { mutationFn } = vi.hoisted(() => ({ mutationFn: vi.fn() }));

vi.mock('@restate/features-restate-context', () => ({
  useRestateContext: () => ({}),
}));

vi.mock('@restate/data-access-admin-api', () => ({
  useAPIStatus: () => true,
  useAdminBaseUrl: () => 'http://localhost:9070',
  adminApi: (_type: string, path: string) => ({
    mutationKey: [path],
    meta: { path },
    mutationFn,
  }),
}));

const DRY_RUN = {
  uri: 'http://localhost:9080',
  use_http_11: false,
  force: false,
  dry_run: true,
};

describe.each([
  {
    hook: 'useRegisterDeployment',
    useDeploymentMutation: (retryWithHttp1: boolean) =>
      useRegisterDeployment({ retryWithHttp1 }),
  },
  {
    hook: 'useUpdateDeployment',
    useDeploymentMutation: (retryWithHttp1: boolean) =>
      useUpdateDeployment('dp_1', { retryWithHttp1 }),
  },
])('$hook dry run', ({ useDeploymentMutation }) => {
  let client: QueryClient;
  const unreachable = new RestateError(
    'Cannot reach the service endpoint to execute discovery',
    'META0003',
  );

  beforeEach(() => {
    client = new QueryClient();
    mutationFn.mockReset();
  });

  afterEach(() => {
    cleanup();
    client.clear();
  });

  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }

  async function dryRun(retryWithHttp1 = true) {
    const { result } = renderHook(() => useDeploymentMutation(retryWithHttp1), {
      wrapper,
    });
    return act(() =>
      result.current
        .mutateAsync({ body: DRY_RUN })
        .catch((error: unknown) => error),
    );
  }

  it('fails with META0014 when discovery over HTTP/1.1 works', async () => {
    mutationFn
      .mockRejectedValueOnce(unreachable)
      .mockResolvedValueOnce({ id: 'dp_1', services: [] });

    const error = await dryRun();

    expect(error).toBeInstanceOf(RestateError);
    expect(error).toMatchObject({ restateCode: 'META0014' });
    expect(mutationFn).toHaveBeenCalledTimes(2);
    expect(mutationFn.mock.calls[1]?.[0]).toMatchObject({
      body: { ...DRY_RUN, use_http_11: true },
    });
  });

  it('keeps the original error when discovery over HTTP/1.1 fails too', async () => {
    mutationFn
      .mockRejectedValueOnce(unreachable)
      .mockRejectedValueOnce(
        new RestateError('Still unreachable over HTTP/1.1', 'META0003'),
      );

    expect(await dryRun()).toBe(unreachable);
    expect(mutationFn).toHaveBeenCalledTimes(2);
  });

  it('sends one request when the retry is off', async () => {
    mutationFn.mockRejectedValueOnce(unreachable);

    expect(await dryRun(false)).toBe(unreachable);
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});
