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

describe.each([
  {
    hook: 'useRegisterDeployment',
    useDryRun: (retryWithHttp1: boolean) => {
      const { mutateAsync } = useRegisterDeployment({ retryWithHttp1 });
      return (use_http_11: boolean) =>
        mutateAsync({
          body: {
            uri: 'http://localhost:9080',
            use_http_11,
            force: false,
            dry_run: true,
          },
        });
    },
  },
  {
    hook: 'useUpdateDeployment',
    useDryRun: (retryWithHttp1: boolean) => {
      const { mutateAsync } = useUpdateDeployment('dp_1', { retryWithHttp1 });
      return (use_http_11: boolean) =>
        mutateAsync({ body: { use_http_11, dry_run: true } });
    },
  },
])('$hook dry run', ({ useDryRun }) => {
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

  async function dryRun({ retryWithHttp1 = true, useHttp11 = false } = {}) {
    const { result } = renderHook(() => useDryRun(retryWithHttp1), {
      wrapper,
    });
    return act(() =>
      result.current(useHttp11).catch((error: unknown) => error),
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
    expect(mutationFn.mock.calls[1]?.[0].body).toEqual({
      ...mutationFn.mock.calls[0]?.[0].body,
      use_http_11: true,
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

  it.each([
    { when: 'the retry is off', retryWithHttp1: false, useHttp11: false },
    {
      when: 'the dry run already uses HTTP/1.1',
      retryWithHttp1: true,
      useHttp11: true,
    },
  ])('sends one request when $when', async (options) => {
    mutationFn.mockRejectedValueOnce(unreachable);

    expect(await dryRun(options)).toBe(unreachable);
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});
