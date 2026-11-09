import { createFetcherWithCodec } from './fetcherWithCodec';

vi.mock('@restate/util-api-config', () => ({ getAuthToken: () => undefined }));

const INGRESS = 'http://localhost:8080';

function setup(response: () => Response) {
  const decoder = vi.fn(() => '"decoded"');
  const fetcher = createFetcherWithCodec(
    async () => response(),
    (value = '') => btoa(value),
    decoder,
  );
  return { fetcher, decoder };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createFetcherWithCodec', () => {
  it.each([
    ['a send', '/restate/send/Cart/user-1/add', 202],
    ['a scoped send', '/restate/scope/tenant-a/send/Cart/user-1/add', 200],
    ['a delayed send', '/restate/send/Cart/user-1/add?delay=10s', 200],
    ['a send on 1.6', '/Cart/user-1/add/send', 202],
    ['a status lookup', '/restate/status/inv_1', 200],
    ['a status lookup by target', '/restate/status', 200],
  ])('keeps the reply to %s as it is', async (_, path, status) => {
    const { fetcher, decoder } = setup(() =>
      json({ invocationId: 'inv_1', status: 'Accepted' }, status),
    );
    const response = await fetcher(`${INGRESS}${path}`, {
      method: 'POST',
      body: '{}',
    });
    expect(decoder).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      invocationId: 'inv_1',
      status: 'Accepted',
    });
  });

  it.each([
    ['a call', '/restate/call/Cart/user-1/add'],
    ['a call to a handler named send', '/restate/call/Mailer/send'],
    ['a keyed call to send', '/restate/call/Notifier/user-1/send'],
    ['a scoped call to send', '/restate/scope/tenant-a/call/Mailer/send'],
    ['a call on 1.6 to send', '/Mailer/send'],
    ['a call with key restate', '/restate/call/Jobs/restate/status'],
    ['an attach', '/restate/attach/inv_1'],
    ['an output lookup', '/restate/output/inv_1'],
  ])('decodes the reply to %s', async (_, path) => {
    const { fetcher, decoder } = setup(() => json(1));
    const response = await fetcher(`${INGRESS}${path}`, {
      method: 'POST',
      body: '{}',
    });
    expect(decoder).toHaveBeenCalledOnce();
    expect(await response.text()).toBe('"decoded"');
  });
});
