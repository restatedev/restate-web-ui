export const OVERVIEW_RANGE_PARAM = 'range';

export enum PeriodRange {
  PT1H = 'PT1H',
  P1D = 'P1D',
  ALL = 'ALL',
}

export function getOverviewRangeLabel(searchParams: URLSearchParams) {
  const range = searchParams.get(OVERVIEW_RANGE_PARAM);
  if (range === PeriodRange.P1D) return 'in last 24h';
  if (range === PeriodRange.ALL) return 'overall';
  return 'in last 1h';
}
