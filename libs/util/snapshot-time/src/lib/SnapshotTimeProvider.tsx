import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
} from 'react';

const SnapshotTimeContext = createContext({
  lastSnapshot: Date.now(),
});

export function SnapshotTimeProvider({
  lastSnapshot,
  children,
}: PropsWithChildren<{ lastSnapshot?: number }>) {
  if (!lastSnapshot) {
    return children;
  }
  return (
    <SnapshotTimeContext.Provider value={{ lastSnapshot }}>
      {children}
    </SnapshotTimeContext.Provider>
  );
}

const MILLISECONDS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;
const HOURS_IN_DAY = 24;
export function useDurationSinceLastSnapshot() {
  const { lastSnapshot } = useContext(SnapshotTimeContext);
  const durationSinceLastSnapshot = useCallback(
    (value?: string | number | Date) => {
      if (!value) {
        return {};
      }
      const date = new Date(value);
      if (isNaN(date.valueOf())) {
        return {};
      }

      return getDuration(date.getTime() - lastSnapshot);
    },
    [lastSnapshot]
  );

  return durationSinceLastSnapshot;
}

export function getDuration(duration?: number) {
  if (duration === undefined) {
    return {};
  }
  if (duration === 0) {
    return { milliseconds: 0 };
  }

  const isPast = duration < 0;
  duration = Math.abs(duration);
  let milliseconds = duration % MILLISECONDS_IN_SECOND;
  duration = (duration - milliseconds) / MILLISECONDS_IN_SECOND;
  let seconds = duration % SECONDS_IN_MINUTE;
  duration = (duration - seconds) / SECONDS_IN_MINUTE;
  let minutes = duration % MINUTES_IN_HOUR;
  duration = (duration - minutes) / MINUTES_IN_HOUR;
  const hours = duration % HOURS_IN_DAY;
  const days = (duration - hours) / HOURS_IN_DAY;

  if (days || hours || minutes) {
    milliseconds = 0;
  }
  if (days || hours) {
    seconds = 0;
  }
  if (days) {
    minutes = 0;
  }

  return { milliseconds, seconds, minutes, hours, days, isPast };
}
