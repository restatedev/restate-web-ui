import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from 'react';

type Status = 'HEALTHY' | 'DEGRADED' | (string & {});
type Context = {
  status?: Status;
  version?: string;
  adminBaseUrl?: string;
};
interface RestateContextInterface extends Context {
  setVersion: (value: string) => void;
  setStatus: (value: Status) => void;
  setAdminBaseUrl: (value: string) => void;
}

const NoOp = () => undefined;
const RestateContext = createContext<RestateContextInterface>({
  setVersion: NoOp,
  setStatus: NoOp,
  setAdminBaseUrl: NoOp,
});

export function RestateContextProvider({
  children,
  context: initialContext,
}: PropsWithChildren<{
  context: Partial<Context>;
}>) {
  const [context, setContext] = useState<Context>(initialContext);

  const setVersion = useCallback((version: string) => {
    setContext((old) => ({ ...old, version }));
  }, []);
  const setStatus = useCallback((status: Status) => {
    setContext((old) => ({ ...old, status }));
  }, []);
  const setAdminBaseUrl = useCallback((adminBaseUrl: string) => {
    setContext((old) => ({ ...old, adminBaseUrl }));
  }, []);

  return (
    <RestateContext.Provider
      value={{ ...context, setVersion, setAdminBaseUrl, setStatus }}
    >
      {children}
    </RestateContext.Provider>
  );
}

export function useAdminBaseUrl() {
  const { adminBaseUrl } = useContext(RestateContext);
  return adminBaseUrl ?? '';
}
