const MIN_OVERVIEW_REFETCH_INTERVAL = 10_000;
const MIN_STATS_OVERVIEW_REFETCH_INTERVAL = 4_000;
const MAX_OVERVIEW_REFETCH_INTERVAL = 60_000;
const OVERVIEW_REFETCH_DURATION_MULTIPLIER = 10;

export function getMinOverviewRefetchInterval(isFromStats: boolean) {
  return isFromStats
    ? MIN_STATS_OVERVIEW_REFETCH_INTERVAL
    : MIN_OVERVIEW_REFETCH_INTERVAL;
}

export function getOverviewRefetchInterval(
  summaryFetchDuration: number,
  isFromStats: boolean,
) {
  return Math.min(
    MAX_OVERVIEW_REFETCH_INTERVAL,
    Math.max(
      getMinOverviewRefetchInterval(isFromStats),
      summaryFetchDuration * OVERVIEW_REFETCH_DURATION_MULTIPLIER,
    ),
  );
}
