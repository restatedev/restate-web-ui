import { createContext, PropsWithChildren, use } from 'react';
import {
  TimelineEngineOutput,
  useTimelineEngine,
} from './useTimelineEngine';

const TimelineEngineContext = createContext<TimelineEngineOutput | null>(null);

export function TimelineEngineProvider({
  actualStart,
  actualEnd,
  areAllCompleted,
  isLiveEnabled,
  containerWidthPx,
  children,
}: PropsWithChildren<{
  actualStart: number;
  actualEnd: number;
  areAllCompleted: boolean;
  isLiveEnabled: boolean;
  containerWidthPx: number;
}>) {
  const engine = useTimelineEngine({
    actualStart,
    actualEnd,
    areAllCompleted,
    isLiveEnabled,
    containerWidthPx,
  });

  return (
    <TimelineEngineContext.Provider value={engine}>
      {children}
    </TimelineEngineContext.Provider>
  );
}

export function useTimelineEngineContext(): TimelineEngineOutput {
  const ctx = use(TimelineEngineContext);
  if (!ctx) {
    throw new Error(
      'useTimelineEngineContext must be used within a TimelineEngineProvider',
    );
  }
  return ctx;
}
