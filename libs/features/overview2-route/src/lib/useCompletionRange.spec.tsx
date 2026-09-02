import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompletionRange } from './useCompletionRange';

const {
  useFinishedInvocationsBreakdownV2Mock,
  useFinishedInvocationsTimelineV2Mock,
  useIsFeatureFlagEnabledMock,
} = vi.hoisted(() => ({
  useFinishedInvocationsBreakdownV2Mock: vi.fn(),
  useFinishedInvocationsTimelineV2Mock: vi.fn(),
  useIsFeatureFlagEnabledMock: vi.fn(),
}));

vi.mock('@restate/data-access/admin-api-hooks', () => ({
  useFinishedInvocationsBreakdownV2: useFinishedInvocationsBreakdownV2Mock,
  useFinishedInvocationsTimelineV2: useFinishedInvocationsTimelineV2Mock,
}));

vi.mock('@restate/util/feature-flag', () => ({
  useIsFeatureFlagEnabled: useIsFeatureFlagEnabledMock,
}));

describe('useCompletionRange', () => {
  beforeEach(() => {
    useFinishedInvocationsBreakdownV2Mock.mockReset();
    useFinishedInvocationsTimelineV2Mock.mockReset();
    useIsFeatureFlagEnabledMock.mockReset();
    useFinishedInvocationsBreakdownV2Mock.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: false,
    });
    useFinishedInvocationsTimelineV2Mock.mockReturnValue({
      buckets: [],
      isPending: false,
    });
  });

  it.each([
    ['completion breakdown', false],
    ['live completion history', true],
  ])('marks the %s for overview refresh', (_, historyEnabled) => {
    useIsFeatureFlagEnabledMock.mockReturnValue(historyEnabled);

    renderHook(() =>
      useCompletionRange({
        hasCompletePopulation: true,
        breakdownMode: 'exact',
        canSampleBreakdown: true,
        refetchInterval: () => 30_000,
      }),
    );

    expect(useFinishedInvocationsBreakdownV2Mock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        enabled: !historyEnabled,
        meta: { overviewRefresh: true },
      }),
    );
    expect(useFinishedInvocationsTimelineV2Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: historyEnabled,
        liveQueryMeta: { overviewRefresh: true },
      }),
    );
  });

  it('reuses the invocation summary for an exact overall breakdown', () => {
    useIsFeatureFlagEnabledMock.mockReturnValue(false);

    const { result } = renderHook(() =>
      useCompletionRange({
        hasCompletePopulation: true,
        breakdownMode: 'exact',
        canSampleBreakdown: true,
        refetchInterval: () => 30_000,
        reuseSummaryForOverall: true,
      }),
    );

    expect(result.current.usesSummary).toBe(true);
    expect(useFinishedInvocationsBreakdownV2Mock).toHaveBeenCalledWith(
      { mode: { type: 'exact' } },
      expect.objectContaining({ enabled: false }),
    );
  });

  it('loads the dedicated breakdown after selecting a bounded range', () => {
    useIsFeatureFlagEnabledMock.mockReturnValue(false);

    const { result } = renderHook(() =>
      useCompletionRange({
        hasCompletePopulation: true,
        breakdownMode: 'exact',
        canSampleBreakdown: true,
        refetchInterval: () => 30_000,
        reuseSummaryForOverall: true,
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
    useIsFeatureFlagEnabledMock.mockReturnValue(false);
    useFinishedInvocationsTimelineV2Mock.mockReturnValue({
      buckets: [
        {
          start: '2026-09-02T10:00:00.000Z',
          end: '2026-09-02T11:00:00.000Z',
          succeeded: 9,
          failed: 1,
          cancelled: 0,
          killed: 0,
        },
      ],
      isPending: false,
    });

    const { result } = renderHook(() =>
      useCompletionRange({
        hasCompletePopulation: true,
        breakdownMode: 'estimate',
        canSampleBreakdown: true,
        refetchInterval: () => 30_000,
        reuseSummaryForOverall: true,
        summaryIsPartial: true,
      }),
    );

    expect(result.current.usesSummary).toBe(true);
    expect(result.current.isSampled).toBe(true);
    expect(result.current.isPartial).toBe(true);
    expect(result.current.rangeBucket).toBeUndefined();
    expect(useFinishedInvocationsBreakdownV2Mock).toHaveBeenCalledWith(
      { mode: { type: 'sampled', sampleSize: 1_000_000 } },
      expect.objectContaining({ enabled: false }),
    );
  });
});
