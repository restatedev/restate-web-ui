import { useSearchParams } from 'react-router';
import type { FilterItem } from '@restate/data-access/admin-api-spec';

export const OVERVIEW_RANGE_PARAM = 'range';

export enum PeriodRange {
  PT1H = 'PT1H',
  P1D = 'P1D',
  ALL = 'ALL',
}

const RANGE_DURATIONS: Record<string, number> = {
  [PeriodRange.PT1H]: 60 * 60 * 1000,
  [PeriodRange.P1D]: 24 * 60 * 60 * 1000,
};
const DEFAULT_RANGE = PeriodRange.PT1H;
const MINUTE = 60 * 1000;

export function useRangeFilters(): FilterItem[] {
  const [searchParams] = useSearchParams();
  const range = searchParams.get(OVERVIEW_RANGE_PARAM) ?? DEFAULT_RANGE;
  const ms = RANGE_DURATIONS[range];
  if (!ms) return [];
  const bucket = Math.floor((Date.now() - ms) / MINUTE) * MINUTE;
  return [
    {
      type: 'DATE',
      field: 'created_at',
      operation: 'AFTER',
      value: new Date(bucket).toISOString(),
    },
  ];
}
