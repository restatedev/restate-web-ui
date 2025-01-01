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
  ingressUrl: string;
};

const InternalRestateContext = createContext<RestateContext>({
  status: 'PENDING',
  ingressUrl: '',
});

function InternalRestateContextProvider({
  children,
  isPending,
  ingressUrl,
}: PropsWithChildren<{ isPending?: boolean; ingressUrl: string }>) {
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
    <InternalRestateContext.Provider value={{ version, status, ingressUrl }}>
      {children}
    </InternalRestateContext.Provider>
  );
}

export function RestateContextProvider({
  children,
  adminBaseUrl,
  ingressUrl,
  isPending,
}: PropsWithChildren<{
  adminBaseUrl?: string;
  ingressUrl: string;
  isPending?: boolean;
}>) {
  return (
    <AdminBaseURLProvider baseUrl={adminBaseUrl}>
      <InternalRestateContextProvider
        ingressUrl={ingressUrl}
        isPending={isPending}
      >
        {children}
      </InternalRestateContextProvider>
    </AdminBaseURLProvider>
  );
}

export function useRestateContext() {
  return useContext(InternalRestateContext);
}
