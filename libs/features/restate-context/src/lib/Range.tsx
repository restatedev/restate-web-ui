import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
} from 'react';
import { useSearchParams } from 'react-router';
import { useIsFeatureFlagEnabled } from '@restate/util/feature-flag';

export const RANGE_PARAM = 'range';

export enum PeriodRange {
  PT1H = 'PT1H',
  P1D = 'P1D',
  ALL = 'ALL',
}

export const DEFAULT_RANGE = PeriodRange.PT1H;

export function getRangeLabel(range: string | undefined): string {
  if (range === PeriodRange.P1D) return 'in last 24h';
  if (range === PeriodRange.ALL) return 'overall';
  return 'in last 1h';
}

type RangeContextValue = {
  range: string;
  setRange: (next: string) => void;
};

const RangeContext = createContext<RangeContextValue>({
  range: DEFAULT_RANGE,
  setRange: () => undefined,
});

export function RangeProvider({ children }: PropsWithChildren) {
  const [searchParams, setSearchParams] = useSearchParams();
  // The completion-history feature pins the overview to the All range.
  const isCompletionHistoryEnabled = useIsFeatureFlagEnabled(
    'FEATURE_COMPLETION_HISTORY',
  );
  const range = isCompletionHistoryEnabled
    ? PeriodRange.ALL
    : (searchParams.get(RANGE_PARAM) ?? DEFAULT_RANGE);

  const setRange = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          if (next === DEFAULT_RANGE) prev.delete(RANGE_PARAM);
          else prev.set(RANGE_PARAM, next);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <RangeContext.Provider value={{ range, setRange }}>
      {children}
    </RangeContext.Provider>
  );
}

export function useRange(): string {
  return useContext(RangeContext).range;
}

export function useSetRange(): (next: string) => void {
  return useContext(RangeContext).setRange;
}
