import { createContext, PropsWithChildren, RefObject, use } from 'react';

const JournalContext = createContext<{
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
}>({
  invocationIds: [],
  start: 0,
  end: 0,
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
  return (
    <JournalContext.Provider
      value={{
        invocationIds,
        addInvocationId,
        removeInvocationId,
        start,
        end,
        dataUpdatedAt,
        cancelTime,
        containerRef,
        isPending,
        error,
        isLive,
        isCompact,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournalContext() {
  return use(JournalContext);
}
