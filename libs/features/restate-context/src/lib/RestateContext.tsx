import {
  AdminBaseURLProvider,
  APIStatusProvider,
  useHealth,
  useVersion,
} from '@restate/data-access/admin-api';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
} from 'react';
import semverGt from 'semver/functions/gte';
import { base64ToUtf8 } from '@restate/features/service-protocol';

export type Status = 'HEALTHY' | 'DEGRADED' | 'PENDING' | (string & {});
type RestateContext = {
  status: Status;
  version?: string;
  isVersionGte?: (version: string) => boolean;
  ingressUrl: string;
  baseUrl: string;
  decoder: (value?: string) => Promise<string> | string | undefined;
};

const InternalRestateContext = createContext<RestateContext>({
  status: 'PENDING',
  ingressUrl: '',
  baseUrl: '',
  decoder: base64ToUtf8,
});

function InternalRestateContextProvider({
  children,
  isPending,
  ingressUrl,
  baseUrl = '',
  decoder,
}: PropsWithChildren<{
  isPending?: boolean;
  ingressUrl?: string;
  baseUrl?: string;
  decoder: (value?: string) => Promise<string> | string | undefined;
}>) {
  const { data } = useVersion({ enabled: !isPending });
  const version = data?.version;
  const releasedVersion = version?.split('-')?.at(0);
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

  const isVersionGte = useCallback(
    (targetVersion: string) => {
      return releasedVersion ? semverGt(releasedVersion, targetVersion) : false;
    },
    [releasedVersion],
  );

  return (
    <InternalRestateContext.Provider
      value={{
        version,
        status,
        ingressUrl: resolvedIngress,
        isVersionGte,
        baseUrl,
        decoder,
      }}
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
  decoder = base64ToUtf8,
}: PropsWithChildren<{
  adminBaseUrl?: string;
  ingressUrl?: string;
  isPending?: boolean;
  baseUrl?: string;
  decoder?: (value?: string) => Promise<string> | string | undefined;
}>) {
  return (
    <AdminBaseURLProvider baseUrl={adminBaseUrl}>
      <InternalRestateContextProvider
        ingressUrl={ingressUrl}
        isPending={isPending}
        baseUrl={baseUrl}
        decoder={decoder}
      >
        {children}
      </InternalRestateContextProvider>
    </AdminBaseURLProvider>
  );
}

export function useRestateContext() {
  return useContext(InternalRestateContext);
}
