export enum PeriodRange {
  PT1H = 'PT1H',
  P1D = 'P1D',
  ALL = 'ALL',
}

export function getRangeLabel(range: string | undefined): string {
  if (range === PeriodRange.P1D) return 'in last 24h';
  if (range === PeriodRange.ALL) return 'overall';
  return 'in last 1h';
}
