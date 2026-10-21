import { muxPost } from './ingress-mux.js';

describe('muxPost', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts JSON as the tenant and parses the answer', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ invocationId: 'inv_1' }));

    const answer = await muxPost<{ invocationId: string }>({
      muxUrl: 'http://mux.test/',
      scope: 'acme',
      path: '/restate/send/checkout/run',
      body: { cart: 'c1' },
      headers: { 'idempotency-key': 'run-1' },
    });

    expect(answer).toEqual({ invocationId: 'inv_1' });
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://mux.test/restate/send/checkout/run',
      expect.objectContaining({
        method: 'POST',
        body: '{"cart":"c1"}',
        headers: {
          accept: 'application/json',
          'x-restate-tenant': 'acme',
          'content-type': 'application/json',
          'idempotency-key': 'run-1',
        },
      }),
    );
  });

  it('turns an error answer into an error with its message and status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: 'missing x-restate-tenant' }, { status: 400 }),
    );

    await expect(
      muxPost({ muxUrl: 'http://mux.test', scope: 'acme', path: '/x' }),
    ).rejects.toMatchObject({
      message: 'missing x-restate-tenant',
      status: 400,
    });
  });
});
