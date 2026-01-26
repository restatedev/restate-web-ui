import { createContext, PropsWithChildren, RefObject, use } from 'react';

const JournalContext = createContext<{
  invocationIds: string[];
  addInvocationId?: (id: string) => void;
  removeInvocationId?: (id: string) => void;
  start: number;
  end: number;
  viewportStart: number;
  viewportEnd: number;
  setViewport: (start: number, end: number) => void;
  cancelTime?: string;
  dataUpdatedAt: number;
  isPending?: Record<string, boolean | undefined>;
  error?: Record<string, Error | null | undefined>;
  containerRef?: RefObject<HTMLDivElement | null>;
  isLive: boolean;
  isCompact: boolean;
  firstPendingCommandIndex?: number;
}>({
  invocationIds: [],
  start: 0,
  end: 0,
  viewportStart: 0,
  viewportEnd: 0,
  setViewport: () => undefined,
  dataUpdatedAt: 0,
  isLive: false,
  isCompact: true,
});

export function JournalContextProvider({
  invocationIds,
  addInvocationId,
  removeInvocationId,
  children,
  start,
  end,
  viewportStart,
  viewportEnd,
  setViewport,
  dataUpdatedAt,
  cancelTime,
  isPending,
  error,
  containerRef,
  isLive,
  isCompact,
  firstPendingCommandIndex,
}: PropsWithChildren<{
  invocationIds: string[];
  addInvocationId?: (id: string) => void;
  removeInvocationId?: (id: string) => void;
  start: number;
  end: number;
  viewportStart: number;
  viewportEnd: number;
  setViewport: (start: number, end: number) => void;
  cancelTime?: string;
  dataUpdatedAt: number;
  isPending?: Record<string, boolean | undefined>;
  error?: Record<string, Error | null | undefined>;
  containerRef?: RefObject<HTMLDivElement | null>;
  isLive: boolean;
  isCompact: boolean;
  firstPendingCommandIndex?: number;
}>) {
  return (
    <JournalContext.Provider
      value={{
        invocationIds,
        addInvocationId,
        removeInvocationId,
        start,
        end,
        viewportStart,
        viewportEnd,
        setViewport,
        dataUpdatedAt,
        cancelTime,
        containerRef,
        isPending,
        error,
        isLive,
        isCompact,
        firstPendingCommandIndex,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournalContext() {
  return use(JournalContext);
}
