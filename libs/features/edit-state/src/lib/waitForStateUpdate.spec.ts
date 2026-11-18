import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForStateUpdate } from './waitForStateUpdate';

type Snapshot = {
  version: string;
  state: { name: string; value: string }[];
};

function snapshot(version: string, values: Record<string, string>): Snapshot {
  return {
    version,
    state: Object.entries(values).map(([name, value]) => ({
      name,
      value: btoa(value),
    })),
  };
}

function refetchReturning(...snapshots: Snapshot[]) {
  const refetch = vi.fn<() => Promise<{ data?: Snapshot }>>();
  for (const data of snapshots) {
    refetch.mockResolvedValueOnce({ data });
  }
  refetch.mockResolvedValue({ data: snapshots.at(-1) });
  return refetch;
}

const before = snapshot('v1', { Status: '"pending"', attempts: '3' });

describe('waitForStateUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves once the state has the new value', async () => {
    const after = snapshot('v2', { Status: '"done"', attempts: '3' });
    const refetch = refetchReturning(before, after);

    const result = waitForStateUpdate(refetch, 'v1', { Status: '"done"' });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(after);
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('rejects when the state changed without the new value', async () => {
    const changed = snapshot('v3', { Status: '"pending"', attempts: '4' });
    const refetch = refetchReturning(changed);

    const result = waitForStateUpdate(refetch, 'v1', { Status: '"done"' });
    const assertion = expect(result).rejects.toThrow(
      'so the mutation was discarded',
    );
    await vi.runAllTimersAsync();

    await assertion;
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('resolves with the unchanged state while the mutation waits in the queue', async () => {
    const refetch = refetchReturning(before);

    const result = waitForStateUpdate(refetch, 'v1', { Status: '"done"' });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(before);
    expect(refetch).toHaveBeenCalledTimes(4);
  });

  it('compares binary values byte by byte', async () => {
    const binary = snapshot('v2', { blob: String.fromCharCode(0xff, 0x00) });
    const refetch = refetchReturning(binary);

    const result = waitForStateUpdate(refetch, 'v1', { blob: [0xff, 0x00] });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(binary);
  });
});
