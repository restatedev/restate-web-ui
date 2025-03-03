import { createContext, PropsWithChildren, useContext } from 'react';

const APIStatusContext = createContext<{ enabled: boolean }>({ enabled: true });

export function APIStatusProvider({
  children,
  enabled,
}: PropsWithChildren<{ enabled: boolean }>) {
  return (
    <APIStatusContext.Provider
      value={{
        enabled,
      }}
    >
      {children}
    </APIStatusContext.Provider>
  );
}

export function useAPIStatus() {
  const { enabled } = useContext(APIStatusContext);
  return enabled;
}
