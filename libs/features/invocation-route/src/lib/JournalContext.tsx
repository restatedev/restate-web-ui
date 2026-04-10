import {
  createContext,
  PropsWithChildren,
  RefObject,
  use,
  useMemo,
} from 'react';

const JournalEntriesContext = createContext<{
  invocationIds: string[];
  addInvocationId?: (id: string) => void;
  removeInvocationId?: (id: string) => void;
  isPending?: Record<string, boolean | undefined>;
  error?: Record<string, Error | null | undefined>;
  isCompact: boolean;
}>({
  invocationIds: [],
  isCompact: true,
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
  isCompact,
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
  isCompact: boolean;
}>) {
  const entriesValue = useMemo(
    () => ({
      invocationIds,
      addInvocationId,
      removeInvocationId,
      isPending,
      error,
      isCompact,
    }),
    [
      invocationIds,
      addInvocationId,
      removeInvocationId,
      isPending,
      error,
      isCompact,
    ],
  );

  return (
    <JournalEntriesContext.Provider value={entriesValue}>
      <JournalTimelineContext.Provider
        value={{
          start,
          end,
          dataUpdatedAt,
          cancelTime,
          containerRef,
          isLive,
        }}
      >
        {children}
      </JournalTimelineContext.Provider>
    </JournalEntriesContext.Provider>
  );
}

export function useJournalEntriesContext() {
  return use(JournalEntriesContext);
}

export function useJournalTimelineContext() {
  return use(JournalTimelineContext);
}

export function useJournalContext() {
  return { ...useJournalEntriesContext(), ...useJournalTimelineContext() };
}

export function useIsCircularRef(
  calledInvocationId: string | undefined,
  callerInvocationId: string | undefined,
) {
  const { invocationIds } = useJournalEntriesContext();
  if (!calledInvocationId) return false;
  const calledIdx = invocationIds.indexOf(String(calledInvocationId));
  if (calledIdx === -1) return false;
  const callerIdx = invocationIds.indexOf(String(callerInvocationId));
  return calledIdx <= callerIdx;
}
