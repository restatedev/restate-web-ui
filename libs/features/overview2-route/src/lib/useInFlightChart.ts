import { useMemo } from 'react';
import { useRestateContext } from '@restate/features/restate-context';
import {
  buildInboxBreakdownSegments,
  buildInFlightSegments,
  buildInFlightStageSegments,
} from '@restate/features/status-chart';
import {
  toInFlightPlusScheduledInvocationsHref,
  toInvocationsHref,
} from '@restate/util/invocation-links';
import { useOverviewContext } from './OverviewContext';

export function useInFlightChart() {
  const { baseUrl } = useRestateContext();
  const {
    byStage,
    byStatus,
    isBreakdownSampled,
    isInboxBreakdownLoading,
    isInboxBreakdownError,
    linkParams,
  } = useOverviewContext();
  const allTotal = byStage.reduce((sum, stage) => sum + stage.count, 0);
  const total = byStage
    .filter((stage) => stage.name !== 'finished')
    .reduce((sum, stage) => sum + stage.count, 0);
  const segments = useMemo(
    () => buildInFlightSegments(byStatus, baseUrl, linkParams),
    [byStatus, baseUrl, linkParams],
  );
  const legendSegments = useMemo(
    () => buildInFlightStageSegments(byStage, baseUrl, linkParams),
    [byStage, baseUrl, linkParams],
  );
  const inboxBreakdownSegments = useMemo(
    () =>
      buildInboxBreakdownSegments(byStatus, (name) =>
        toInvocationsHref(baseUrl, name, { existingParams: linkParams }),
      ),
    [baseUrl, byStatus, linkParams],
  );
  const href = toInFlightPlusScheduledInvocationsHref(baseUrl, {
    existingParams: linkParams,
  });

  return {
    allTotal,
    total,
    segments,
    legendSegments,
    inboxBreakdownSegments,
    href,
    isSampled: isBreakdownSampled,
    isInboxBreakdownLoading,
    isInboxBreakdownError,
  };
}
