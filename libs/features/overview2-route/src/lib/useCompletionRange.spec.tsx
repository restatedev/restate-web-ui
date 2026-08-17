import { renderHook } from '@testing-library/react';
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
});
