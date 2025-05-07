import {
  AdminBaseURLProvider,
  APIStatusProvider,
  useHealth,
  useVersion,
} from '@restate/data-access/admin-api';
import { createContext, PropsWithChildren, useContext } from 'react';

export type Status = 'HEALTHY' | 'DEGRADED' | 'PENDING' | (string & {});
type RestateContext = {
  status: Status;
  version?: string;
  ingressUrl: string;
  baseUrl: string;
};

const InternalRestateContext = createContext<RestateContext>({
  status: 'PENDING',
  ingressUrl: '',
  baseUrl: '',
});

function InternalRestateContextProvider({
  children,
  isPending,
  ingressUrl,
  baseUrl = '',
}: PropsWithChildren<{
  isPending?: boolean;
  ingressUrl?: string;
  baseUrl?: string;
}>) {
  const { data } = useVersion({ enabled: !isPending });
  const version = data?.version;
  const resolvedIngress =
    ingressUrl || data?.ingress_endpoint || 'http://localhost:8080';

  const { isSuccess, failureCount } = useHealth({
    enabled: !isPending,
    retry: true,
    refetchInterval: 1000 * 60,
  });
  const status: Status | undefined = isPending
    ? 'PENDING'
    : failureCount > 0
    ? 'DEGRADED'
    : isSuccess
    ? 'HEALTHY'
    : 'PENDING';

  return (
    <InternalRestateContext.Provider
      value={{ version, status, ingressUrl: resolvedIngress, baseUrl }}
    >
      <APIStatusProvider enabled={status === 'HEALTHY'}>
        {children}
      </APIStatusProvider>
    </InternalRestateContext.Provider>
  );
}

export function RestateContextProvider({
  children,
  adminBaseUrl,
  ingressUrl,
  isPending,
  baseUrl,
}: PropsWithChildren<{
  adminBaseUrl?: string;
  ingressUrl?: string;
  isPending?: boolean;
  baseUrl?: string;
}>) {
  return (
    <AdminBaseURLProvider baseUrl={adminBaseUrl}>
      <InternalRestateContextProvider
        ingressUrl={ingressUrl}
        isPending={isPending}
        baseUrl={baseUrl}
      >
        {children}
      </InternalRestateContextProvider>
    </AdminBaseURLProvider>
  );
}

export function useRestateContext() {
  return useContext(InternalRestateContext);
}
