import { toPlaygroundResult } from './ResponseView';

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('toPlaygroundResult', () => {
  it('reads the invocation ID from a send receipt only', async () => {
    const receipt = await toPlaygroundResult(
      json({ invocationId: 'inv_sent', status: 'Accepted' }, 202),
      5,
    );
    const output = await toPlaygroundResult(
      json({ invocationId: 'inv_child' }, 200),
      5,
    );

    expect(receipt.kind === 'response' && receipt.invocationId).toBe(
      'inv_sent',
    );
    expect(output.kind === 'response' && output.invocationId).toBeUndefined();
  });
});
