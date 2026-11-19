import {
  createContext,
  PropsWithChildren,
  RefObject,
  use,
  useMemo,
} from 'react';
import { COMPACT_DETAIL, type JournalDetail } from './useJournalDetail';

const JournalEntriesContext = createContext<{
  addInvocationId?: (id: string) => void;
  removeInvocationId?: (id: string) => void;
  detail: JournalDetail;
  disableExpand?: boolean;
  hideOutput?: boolean;
  disableAwaitingHighlight?: boolean;
}>({
  detail: COMPACT_DETAIL,
});

export { JournalEntriesContext };

const JournalExpansionContext = createContext<{
  invocationIds: string[];
  isPending?: Record<string, boolean | undefined>;
  error?: Record<string, Error | null | undefined>;
}>({
  invocationIds: [],
});

const JournalTimelineContext = createContext<{
  start: number;
  end: number;
  cancelTime?: string;
  dataUpdatedAt: number;
  containerRef?: RefObject<HTMLDivElement | null>;
  isLive: boolean;
}>({
  start: 0,
  end: 0,
  dataUpdatedAt: 0,
  isLive: false,
});

export function JournalContextProvider({
  invocationIds,
  addInvocationId,
  removeInvocationId,
  children,
  start,
  end,
  dataUpdatedAt,
  cancelTime,
  isPending,
  error,
  containerRef,
  isLive,
  detail,
}: PropsWithChildren<{
  invocationIds: string[];
  addInvocationId?: (id: string) => void;
  removeInvocationId?: (id: string) => void;
  start: number;
  end: number;
  cancelTime?: string;
  dataUpdatedAt: number;
  isPending?: Record<string, boolean | undefined>;
  error?: Record<string, Error | null | undefined>;
  containerRef?: RefObject<HTMLDivElement | null>;
  isLive: boolean;
  detail: JournalDetail;
}>) {
  const entriesValue = useMemo(
    () => ({ addInvocationId, removeInvocationId, detail }),
    [addInvocationId, removeInvocationId, detail],
  );

  const expansionValue = useMemo(
    () => ({ invocationIds, isPending, error }),
    [invocationIds, isPending, error],
  );

  const timelineValue = useMemo(
    () => ({
      start,
      end,
      dataUpdatedAt,
      cancelTime,
      containerRef,
      isLive,
    }),
    [start, end, dataUpdatedAt, cancelTime, containerRef, isLive],
  );

  return (
    <JournalEntriesContext.Provider value={entriesValue}>
      <JournalExpansionContext.Provider value={expansionValue}>
        <JournalTimelineContext.Provider value={timelineValue}>
          {children}
        </JournalTimelineContext.Provider>
      </JournalExpansionContext.Provider>
    </JournalEntriesContext.Provider>
  );
}

export function useJournalEntriesContext() {
  return use(JournalEntriesContext);
}

export function useJournalExpansionContext() {
  return use(JournalExpansionContext);
}

export function useJournalTimelineContext() {
  return use(JournalTimelineContext);
}

export function useIsCircularRef(
  calledInvocationId: string | undefined,
  callerInvocationId: string | undefined,
) {
  const { invocationIds } = useJournalExpansionContext();
  if (!calledInvocationId) return false;
  const calledIdx = invocationIds.indexOf(String(calledInvocationId));
  if (calledIdx === -1) return false;
  const callerIdx = invocationIds.indexOf(String(callerInvocationId));
  return calledIdx <= callerIdx;
}
