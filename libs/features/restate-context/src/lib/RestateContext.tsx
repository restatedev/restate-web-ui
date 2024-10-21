import {
  AdminBaseURLProvider,
  useHealth,
  useVersion,
} from '@restate/data-access/admin-api';
import { createContext, PropsWithChildren, useContext } from 'react';

export type Status = 'HEALTHY' | 'DEGRADED' | 'PENDING' | (string & {});
type RestateContext = {
  status: Status;
  version?: string;
};

const InternalRestateContext = createContext<RestateContext>({
  status: 'PENDING',
});

function InternalRestateContextProvider({
  children,
  isPending,
}: PropsWithChildren<{ isPending?: boolean }>) {
  const { data } = useVersion({ enabled: !isPending });
  const version = data?.version;

  const { isSuccess, failureCount } = useHealth({
    enabled: !isPending,
    retry: true,
    refetchInterval: 1000 * 60,
  });
  const status: Status | undefined = isPending
    ? 'PENDING'
    : isSuccess
    ? 'HEALTHY'
    : failureCount > 0
    ? 'DEGRADED'
    : 'PENDING';

  return (
    <InternalRestateContext.Provider value={{ version, status }}>
      {children}
    </InternalRestateContext.Provider>
  );
}

export function RestateContextProvider({
  children,
  adminBaseUrl,
}: PropsWithChildren<{
  adminBaseUrl?: string;
}>) {
  return (
    <AdminBaseURLProvider baseUrl={adminBaseUrl}>
      <InternalRestateContextProvider>
        {children}
      </InternalRestateContextProvider>
    </AdminBaseURLProvider>
  );
}

export function useRestateContext() {
  return useContext(InternalRestateContext);
}
