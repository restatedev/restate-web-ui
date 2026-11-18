import {
  coalescingTimeoutProvider,
  TIMEOUT_BUCKET_MS,
} from './coalescingTimeoutProvider';

describe('coalescingTimeoutProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 10_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs long timeouts together at the end of their bucket', () => {
    const calls: string[] = [];
    coalescingTimeoutProvider.setTimeout(() => calls.push('a'), 1_200);
    coalescingTimeoutProvider.setTimeout(() => calls.push('b'), 1_700);

    vi.advanceTimersByTime(1_700);
    expect(calls).toEqual([]);

    vi.advanceTimersByTime(TIMEOUT_BUCKET_MS * 2 - 1_700);
    expect(calls).toEqual(['a', 'b']);
  });

  it('never runs a timeout early', () => {
    const callback = vi.fn();
    coalescingTimeoutProvider.setTimeout(callback, 5_000);

    vi.advanceTimersByTime(4_999);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('keeps the other timeouts of a bucket when one is cleared', () => {
    const kept = vi.fn();
    const cleared = vi.fn();
    coalescingTimeoutProvider.setTimeout(kept, 1_500);
    const id = coalescingTimeoutProvider.setTimeout(cleared, 1_500);

    coalescingTimeoutProvider.clearTimeout(id);
    vi.advanceTimersByTime(TIMEOUT_BUCKET_MS * 2);

    expect(kept).toHaveBeenCalledTimes(1);
    expect(cleared).not.toHaveBeenCalled();
  });

  it('cancels the bucket timer once its last timeout is cleared', () => {
    const id = coalescingTimeoutProvider.setTimeout(vi.fn(), 3_000);

    coalescingTimeoutProvider.clearTimeout(id);

    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps short timeouts exact', () => {
    const callback = vi.fn();
    const id = coalescingTimeoutProvider.setTimeout(callback, 300);

    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledTimes(1);

    coalescingTimeoutProvider.clearTimeout(id);
    const cleared = vi.fn();
    coalescingTimeoutProvider.clearTimeout(
      coalescingTimeoutProvider.setTimeout(cleared, 300),
    );
    vi.advanceTimersByTime(300);
    expect(cleared).not.toHaveBeenCalled();
  });

  it('runs the rest of a bucket when a callback throws', () => {
    const rethrow = vi
      .spyOn(globalThis, 'queueMicrotask')
      .mockImplementation(() => undefined);
    const after = vi.fn();
    coalescingTimeoutProvider.setTimeout(() => {
      throw new Error('boom');
    }, 1_000);
    coalescingTimeoutProvider.setTimeout(after, 1_000);

    vi.advanceTimersByTime(TIMEOUT_BUCKET_MS);

    expect(after).toHaveBeenCalledTimes(1);
    expect(rethrow).toHaveBeenCalledTimes(1);
    rethrow.mockRestore();
  });
});
