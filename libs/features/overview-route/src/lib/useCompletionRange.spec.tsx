import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompletionRange } from './useCompletionRange';

const { useFinishedInvocationsBreakdownV2Mock } = vi.hoisted(() => ({
  useFinishedInvocationsBreakdownV2Mock: vi.fn(),
}));

vi.mock('@restate/data-access/admin-api-hooks', () => ({
  useFinishedInvocationsBreakdownV2: useFinishedInvocationsBreakdownV2Mock,
}));

describe('useCompletionRange', () => {
  beforeEach(() => {
    useFinishedInvocationsBreakdownV2Mock.mockReset();
    useFinishedInvocationsBreakdownV2Mock.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: false,
    });
  });

  it('marks the completion breakdown for overview refresh', () => {
    renderHook(() =>
      useCompletionRange({
        breakdownMode: 'exact',
        refetchInterval: () => 30_000,
      }),
    );

    expect(useFinishedInvocationsBreakdownV2Mock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        meta: { overviewRefresh: true },
      }),
    );
  });

  it('reuses the invocation summary for an exact overall breakdown', () => {
    const { result } = renderHook(() =>
      useCompletionRange({
        breakdownMode: 'exact',
        refetchInterval: () => 30_000,
        summaryBreakdownIsLoading: true,
      }),
    );

    expect(result.current.usesSummary).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(useFinishedInvocationsBreakdownV2Mock).toHaveBeenCalledWith(
      { mode: { type: 'exact' } },
      expect.objectContaining({ enabled: false }),
    );
  });

  it('loads the dedicated breakdown after selecting a bounded range', () => {
    const { result } = renderHook(() =>
      useCompletionRange({
        breakdownMode: 'exact',
        refetchInterval: () => 30_000,
      }),
    );

    act(() => result.current.setTimeRange('PT1H'));

    expect(result.current.usesSummary).toBe(false);
    expect(useFinishedInvocationsBreakdownV2Mock).toHaveBeenLastCalledWith(
      {
        mode: { type: 'exact' },
        startTime: expect.any(String),
      },
      expect.objectContaining({ enabled: true }),
    );
  });

  it('reuses a partial sampled summary for estimated overall counts', () => {
    const { result } = renderHook(() =>
      useCompletionRange({
        breakdownMode: 'estimate',
        refetchInterval: () => 30_000,
        summaryBreakdownIsLoading: true,
        summaryIsPartial: true,
      }),
    );

    expect(result.current.usesSummary).toBe(true);
    expect(result.current.isSampled).toBe(true);
    expect(result.current.isPartial).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.rangeBucket).toBeUndefined();
    expect(useFinishedInvocationsBreakdownV2Mock).toHaveBeenCalledWith(
      { mode: { type: 'sampled', sampleSize: 1_000_000 } },
      expect.objectContaining({ enabled: false }),
    );
  });
});
