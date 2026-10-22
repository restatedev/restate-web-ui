import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { AdminBaseURLProvider } from '@restate/data-access-admin-api';
import { setAuthToken } from '@restate/util-api-config';
import { setQueryClient } from '@restate/util-react-query';
import { RestateError } from '@restate/util-errors';
import {
  useSendInvocationSignal,
  type SendInvocationSignalVariables,
} from './hooks';

vi.mock('@restate/features-restate-context', () => ({
  useRestateContext: () => ({}),
}));

describe('useSendInvocationSignal', () => {
  let client: QueryClient;
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

  beforeEach(() => {
    client = new QueryClient();
    setQueryClient(client);
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async () =>
        new Response(null, {
          status: 202,
          headers: { 'Content-Length': '0' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.unstubAllGlobals();
  });

  function wrapper({ children }: PropsWithChildren) {
    return (
      <AdminBaseURLProvider baseUrl="http://localhost:9070">
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </AdminBaseURLProvider>
    );
  }

  async function send(
    variables: SendInvocationSignalVariables,
    encode?: (value: string) => Promise<string> | string,
  ) {
    const { result } = renderHook(
      () => useSendInvocationSignal('inv_1', { encode }),
      { wrapper },
    );
    await act(() => result.current.mutateAsync(variables));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [request] = fetchMock.mock.calls[0] ?? [];
    if (!request) {
      throw new Error('No request was sent');
    }
    return request;
  }

  it('resolves the signal with the UTF-8 value as an octet-stream', async () => {
    const request = await send({
      signalName: 'approval',
      action: 'resolve',
      value: '{"approved":true}',
    });

    expect(request.method).toBe('POST');
    expect(request.url).toBe(
      'http://localhost:9070/invocations/inv_1/signals/approval',
    );
    expect(request.headers.get('content-type')).toBe(
      'application/octet-stream',
    );
    expect(await request.text()).toBe('{"approved":true}');
  });

  it('resolves the signal with the bytes produced by the encode option', async () => {
    const encode = vi.fn(async (value: string) => btoa(`encoded:${value}`));

    const request = await send(
      { signalName: 'approval', action: 'resolve', value: 'v' },
      encode,
    );

    expect(encode).toHaveBeenCalledWith('v');
    expect(await request.text()).toBe('encoded:v');
  });

  it('rejects the signal with a failure body', async () => {
    const request = await send({
      signalName: 'approval',
      action: 'reject',
      message: 'Rejected by operator',
      code: 409,
    });

    expect(request.headers.get('content-type')).toBe(
      'application/vnd.restate.error+json',
    );
    expect(await request.json()).toEqual({
      message: 'Rejected by operator',
      code: 409,
    });
  });

  it('leaves the code to the server default when it is not set', async () => {
    const request = await send({
      signalName: 'approval',
      action: 'reject',
      message: 'nope',
    });

    expect(await request.json()).toEqual({ message: 'nope' });
  });

  it.each([70000, -1, 1.5, Number.NaN])(
    'rejects the failure code %s without calling the admin API',
    async (code) => {
      const { result } = renderHook(() => useSendInvocationSignal('inv_1'), {
        wrapper,
      });

      const error = await act(() =>
        result.current
          .mutateAsync({
            signalName: 'approval',
            action: 'reject',
            message: 'nope',
            code,
          })
          .catch((error: unknown) => error),
      );

      expect(error).toBeInstanceOf(RestateError);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('encodes the signal name as a single path segment', async () => {
    const request = await send({
      signalName: 'needs approval/1',
      action: 'resolve',
      value: '',
    });

    expect(request.url).toBe(
      'http://localhost:9070/invocations/inv_1/signals/needs%20approval%2F1',
    );
  });

  it('sends the auth token as a bearer token', async () => {
    setAuthToken('token-123');

    const request = await send({
      signalName: 'approval',
      action: 'reject',
      message: 'nope',
    });

    expect(request.headers.get('authorization')).toBe('Bearer token-123');
  });

  it('throws the admin API error message', async () => {
    fetchMock.mockImplementation(async () =>
      Response.json(
        { message: 'The request field body is invalid', restate_code: null },
        { status: 400 },
      ),
    );
    const { result } = renderHook(() => useSendInvocationSignal('inv_1'), {
      wrapper,
    });

    const error = await act(() =>
      result.current
        .mutateAsync({
          signalName: 'approval',
          action: 'reject',
          message: 'x',
        })
        .catch((error: unknown) => error),
    );

    expect(error).toBeInstanceOf(RestateError);
    expect(error).toMatchObject({
      message: 'The request field body is invalid',
      status: 400,
    });
  });
});
