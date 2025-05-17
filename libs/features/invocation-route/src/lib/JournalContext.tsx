import {
  createContext,
  Dispatch,
  PropsWithChildren,
  RefObject,
  SetStateAction,
  use,
} from 'react';

const JournalContext = createContext<{
  invocationIds: string[];
  setInvocationIds?: Dispatch<SetStateAction<string[]>>;
  start: number;
  end: number;
  cancelTime?: string;
  dataUpdatedAt: number;
  isPending?: Record<string, boolean | undefined>;
  error?: Record<string, Error | null | undefined>;
  containerRef?: RefObject<HTMLDivElement | null>;
}>({
  invocationIds: [],
  start: 0,
  end: 0,
  dataUpdatedAt: 0,
});

export function JournalContextProvider({
  invocationIds,
  setInvocationIds,
  children,
  start,
  end,
  dataUpdatedAt,
  cancelTime,
  isPending,
  error,
  containerRef,
}: PropsWithChildren<{
  invocationIds: string[];
  setInvocationIds?: Dispatch<SetStateAction<string[]>>;
  start: number;
  end: number;
  cancelTime?: string;
  dataUpdatedAt: number;
  isPending?: Record<string, boolean | undefined>;
  error?: Record<string, Error | null | undefined>;
  containerRef?: RefObject<HTMLDivElement | null>;
}>) {
  return (
    <JournalContext.Provider
      value={{
        invocationIds,
        setInvocationIds,
        start,
        end,
        dataUpdatedAt,
        cancelTime,
        containerRef,
        isPending,
        error,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournalContext() {
  return use(JournalContext);
}
