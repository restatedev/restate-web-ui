import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { RestateError } from '@restate/util-errors';
import { useCompleteAwakeable, type CompleteAwakeableVariables } from './hooks';

const { getAuthToken } = vi.hoisted(() => ({
  getAuthToken: vi.fn<() => string | undefined>(),
}));

vi.mock('@restate/util-api-config', () => ({ getAuthToken }));

vi.mock('@restate/features-restate-context', () => ({
  useRestateContext: () => ({
    ingressUrl: 'http://localhost:8080/',
    isVersionGte: () => true,
  }),
}));

vi.mock('@restate/data-access-admin-api', () => ({
  useAPIStatus: () => true,
  useAdminBaseUrl: () => 'http://localhost:9070',
  adminApi: (_type: string, path: string) => ({ queryKey: [path] }),
}));

const AWAKEABLE_ID = 'sign_16dyu5ojHAOSzL-FqewvryjsHZH-fLyCMAAAAEQ';

describe('useCompleteAwakeable', () => {
  let client: QueryClient;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    client = new QueryClient();
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async () => new Response(null, { status: 202 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    getAuthToken.mockReset();
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.unstubAllGlobals();
  });

  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }

  async function complete(
    variables: CompleteAwakeableVariables,
    encode?: (value: string) => Promise<string> | string,
  ) {
    const { result } = renderHook(
      () => useCompleteAwakeable('inv_1', { encode }),
      { wrapper },
    );
    await act(() => result.current.mutateAsync(variables));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    return { url, init, headers: new Headers(init?.headers) };
  }

  it('posts the UTF-8 value to the ingress resolve endpoint', async () => {
    const { url, init } = await complete({
      awakeableId: AWAKEABLE_ID,
      action: 'resolve',
      value: '{"approved":true}',
    });

    expect(url).toBe(
      `http://localhost:8080/restate/awakeables/${AWAKEABLE_ID}/resolve`,
    );
    expect(init).toMatchObject({ credentials: 'include', method: 'POST' });
    expect(new TextDecoder().decode(init?.body as Uint8Array)).toBe(
      '{"approved":true}',
    );
  });

  it('posts the bytes produced by the encode option', async () => {
    const encode = vi.fn(async (value: string) => btoa(`encoded:${value}`));

    const { init } = await complete(
      { awakeableId: AWAKEABLE_ID, action: 'resolve', value: 'v' },
      encode,
    );

    expect(encode).toHaveBeenCalledWith('v');
    expect(new TextDecoder().decode(init?.body as Uint8Array)).toBe(
      'encoded:v',
    );
  });

  it('fails without calling the ingress when encoding fails', async () => {
    const { result } = renderHook(
      () =>
        useCompleteAwakeable('inv_1', {
          encode: () => Promise.reject(new Error('Codec failed')),
        }),
      { wrapper },
    );

    const error = await act(() =>
      result.current
        .mutateAsync({
          awakeableId: AWAKEABLE_ID,
          action: 'resolve',
          value: 'v',
        })
        .catch((error: unknown) => error),
    );

    expect(error).toMatchObject({ message: 'Codec failed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not encode the reject message', async () => {
    const encode = vi.fn((value: string) => btoa(value));

    const { init } = await complete(
      { awakeableId: AWAKEABLE_ID, action: 'reject', message: 'nope' },
      encode,
    );

    expect(encode).not.toHaveBeenCalled();
    expect(init?.body).toBe('nope');
  });

  it('posts the failure message to the ingress reject endpoint', async () => {
    const { url, init } = await complete({
      awakeableId: AWAKEABLE_ID,
      action: 'reject',
      message: 'Rejected by operator',
    });

    expect(url).toBe(
      `http://localhost:8080/restate/awakeables/${AWAKEABLE_ID}/reject`,
    );
    expect(init).toMatchObject({
      credentials: 'include',
      method: 'POST',
      body: 'Rejected by operator',
    });
  });

  it('sends the auth token as a bearer token', async () => {
    getAuthToken.mockReturnValue('token-123');

    const { headers } = await complete({
      awakeableId: AWAKEABLE_ID,
      action: 'reject',
      message: 'nope',
    });

    expect(headers.get('authorization')).toBe('Bearer token-123');
  });

  it('sends no authorization header without an auth token', async () => {
    getAuthToken.mockReturnValue(undefined);

    const { headers } = await complete({
      awakeableId: AWAKEABLE_ID,
      action: 'reject',
      message: 'nope',
    });

    expect(headers.has('authorization')).toBe(false);
  });

  it('throws the ingress error message with the response status', async () => {
    fetchMock.mockImplementation(async () =>
      Response.json(
        { code: 400, message: 'Bad awakeable id' },
        { status: 400 },
      ),
    );
    const { result } = renderHook(() => useCompleteAwakeable('inv_1'), {
      wrapper,
    });

    const error = await act(() =>
      result.current
        .mutateAsync({ awakeableId: 'bad', action: 'reject', message: 'x' })
        .catch((error: unknown) => error),
    );

    expect(error).toBeInstanceOf(RestateError);
    expect(error).toMatchObject({ message: 'Bad awakeable id', status: 400 });
  });

  it('throws the response text when the ingress error is not JSON', async () => {
    fetchMock.mockImplementation(
      async () => new Response('Unauthorized', { status: 401 }),
    );
    const { result } = renderHook(() => useCompleteAwakeable('inv_1'), {
      wrapper,
    });

    const error = await act(() =>
      result.current
        .mutateAsync({
          awakeableId: AWAKEABLE_ID,
          action: 'reject',
          message: 'x',
        })
        .catch((error: unknown) => error),
    );

    expect(error).toMatchObject({ message: 'Unauthorized', status: 401 });
  });
});
