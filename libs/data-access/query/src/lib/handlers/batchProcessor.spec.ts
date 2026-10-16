import { describe, expect, it, vi } from 'vitest';
import { batchProcessInvocations } from './batchProcessor';

describe('batchProcessInvocations', () => {
  it('only acts on invocation ids', async () => {
    const batchProcessor = vi.fn((invocationIds: string[]) =>
      Promise.resolve({ succeeded: invocationIds, failed: [] }),
    );

    await batchProcessInvocations(['inv_1', 'mut_1', 'inv_2'], batchProcessor);

    expect(batchProcessor.mock.calls).toEqual([[['inv_1', 'inv_2']]]);
  });
});
