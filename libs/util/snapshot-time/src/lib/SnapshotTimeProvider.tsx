import { createContext, PropsWithChildren, useContext } from 'react';

const SnapshotTimeContext = createContext({
  lastSnapshot: new Date().toISOString(),
});

export function SnapshotTimeProvider({
  lastSnapshot,
  children,
}: PropsWithChildren<{ lastSnapshot?: string }>) {
  if (!lastSnapshot) {
    return children;
  }
  return (
    <SnapshotTimeContext.Provider value={{ lastSnapshot }}>
      {children}
    </SnapshotTimeContext.Provider>
  );
}

export function useLastSnapshot() {
  const { lastSnapshot } = useContext(SnapshotTimeContext);
  return new Date(lastSnapshot);
}
