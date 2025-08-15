import {
  AdminBaseURLProvider,
  APIStatusProvider,
  useHealth,
  useVersion,
} from '@restate/data-access/admin-api';
import {
  ComponentType,
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
} from 'react';
import semverGt from 'semver/functions/gte';
import { base64ToUtf8, utf8ToBase64 } from '@restate/util/binary';
import { useQueryClient } from '@tanstack/react-query';

export type Status = 'HEALTHY' | 'DEGRADED' | 'PENDING' | (string & {});
type RestateContext = {
  status: Status;
  version?: string;
  isVersionGte?: (version: string) => boolean;
  ingressUrl: string;
  baseUrl: string;
  decoder: (value?: string) => Promise<string | undefined> | string | undefined;
  encoder: (value?: string) => Promise<string | undefined> | string | undefined;
  refreshCodec?: VoidFunction;
  EncodingWaterMark?: ComponentType<{
    value?: string;
    className?: string;
    mini?: boolean;
  }>;
};

const InternalRestateContext = createContext<RestateContext>({
  status: 'PENDING',
  ingressUrl: '',
  baseUrl: '',
  decoder: base64ToUtf8,
  encoder: utf8ToBase64,
});

function InternalRestateContextProvider({
  children,
  isPending,
  ingressUrl,
  baseUrl = '',
  decoder,
  encoder,
  EncodingWaterMark,
}: PropsWithChildren<{
  isPending?: boolean;
  ingressUrl?: string;
  baseUrl?: string;
  decoder: (value?: string) => Promise<string | undefined> | string | undefined;
  encoder: (value?: string) => Promise<string | undefined> | string | undefined;
  EncodingWaterMark?: ComponentType<{
    value?: string;
    className?: string;
    mini?: boolean;
  }>;
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

  const queryClient = useQueryClient();
  const refreshCodec = useCallback(() => {
    queryClient.invalidateQueries({
      predicate(query) {
        const { queryKey } = query;
        if (
          Array.isArray(queryKey) &&
          ['decode', 'encode'].includes(queryKey.at(1))
        ) {
          return true;
        }
        return false;
      },
    });
  }, [queryClient]);

  return (
    <InternalRestateContext.Provider
      value={{
        version,
        status,
        ingressUrl: resolvedIngress,
        isVersionGte,
        baseUrl,
        decoder,
        encoder,
        EncodingWaterMark,
        refreshCodec,
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
  encoder = utf8ToBase64,
  EncodingWaterMark,
}: PropsWithChildren<{
  adminBaseUrl?: string;
  ingressUrl?: string;
  isPending?: boolean;
  baseUrl?: string;
  decoder?: (
    value?: string,
  ) => Promise<string | undefined> | string | undefined;
  encoder?: (
    value?: string,
  ) => Promise<string | undefined> | string | undefined;
  EncodingWaterMark?: ComponentType<{
    value?: string;
    className?: string;
    mini?: boolean;
  }>;
}>) {
  return (
    <AdminBaseURLProvider baseUrl={adminBaseUrl}>
      <InternalRestateContextProvider
        ingressUrl={ingressUrl}
        isPending={isPending}
        baseUrl={baseUrl}
        decoder={decoder}
        encoder={encoder}
        EncodingWaterMark={EncodingWaterMark}
      >
        {children}
      </InternalRestateContextProvider>
    </AdminBaseURLProvider>
  );
}

export function useRestateContext() {
  return useContext(InternalRestateContext);
}
