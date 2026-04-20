import {
  AdminBaseURLProvider,
  APIStatusProvider,
  useHealth,
  useVersion,
  useQueryHealthCheck,
  useAdminBaseUrl,
} from '@restate/data-access/admin-api';
import {
  ComponentType,
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import semverGt from 'semver/functions/gte';
import { useQueryClient } from '@tanstack/react-query';
import {
  composeRestateDecoder,
  composeRestateEncoder,
  type RestateBinaryCodec,
} from './codecs';
import {
  createPlaygroundFetcher,
  type GetPlaygroundCodecOptions,
  type PlaygroundFetcher,
  type RestateStringCodec,
} from './playgroundFetcher';

export type Status = 'HEALTHY' | 'DEGRADED' | 'PENDING' | (string & {});
export type {
  RestateCodecCommand,
  RestateCodecHandlerMetadata,
  RestateCodecOptions,
} from '@restate/features/codec';
export type { RestateBinaryCodec } from './codecs';
export type {
  GetPlaygroundCodecOptions,
  PlaygroundFetcher,
} from './playgroundFetcher';

const EMPTY_CODECS: readonly RestateBinaryCodec[] = [];

type OnboardingComponent = ComponentType<{
  className?: string;
  stage:
    | 'register-deployment-trigger'
    | 'register-deployment-endpoint'
    | 'register-deployment-confirm'
    | 'open-playground'
    | 'view-invocations'
    | 'view-invocation'
    | 'delete-deployment'
    | 'view-template-http'
    | 'view-template-lambda'
    | 'view-template-tunnel';
  endpoint?: string;
  service?: string;
}>;
type RestateContext = {
  status: Status;
  version?: string;
  isVersionGte?: (version: string) => boolean;
  createPlaygroundFetcher: (
    getCodecOptions?: GetPlaygroundCodecOptions,
  ) => PlaygroundFetcher;
  ingressUrl: string;
  baseUrl: string;
  decoder: RestateStringCodec;
  encoder: RestateStringCodec;
  refreshCodec?: VoidFunction;
  EncodingWaterMark?: ComponentType<{
    value?: string;
    className?: string;
    mini?: boolean;
  }>;
  tunnel?: {
    isEnabled?: boolean;
    toHttp: (name: string, url?: string) => string | undefined;
    fromHttp: (
      url?: string,
    ) => { name: string; remoteUrl?: string; tunnelUrl: string } | undefined;
  };
  GettingStarted?: ComponentType<{ className?: string }>;
  OnboardingGuide?: OnboardingComponent;
  isNew?: boolean;
  identityKey?: { value: string; url?: string };
  awsRolePolicy?: { value: string; url?: string };
};

const InternalRestateContext = createContext<RestateContext>({
  status: 'PENDING',
  createPlaygroundFetcher: () => globalThis.fetch,
  ingressUrl: '',
  baseUrl: '',
  decoder: composeRestateDecoder(EMPTY_CODECS),
  encoder: composeRestateEncoder(EMPTY_CODECS),
});

function InternalRestateContextProvider({
  children,
  isPending,
  systemHealthMonitor,
  ingressUrl,
  baseUrl = '',
  fetcher,
  decoder,
  encoder,
  EncodingWaterMark,
  tunnel,
  GettingStarted,
  isNew,
  OnboardingGuide,
  awsRolePolicy,
  identityKey,
  queryHealthCheckEnabled = false,
}: PropsWithChildren<{
  isPending?: boolean;
  ingressUrl?: string;
  baseUrl?: string;
  fetcher?: PlaygroundFetcher;
  decoder: RestateStringCodec;
  encoder: RestateStringCodec;
  EncodingWaterMark?: ComponentType<{
    value?: string;
    className?: string;
    mini?: boolean;
  }>;
  tunnel?: RestateContext['tunnel'];
  GettingStarted?: ComponentType<{ className?: string }>;
  OnboardingGuide?: OnboardingComponent;
  isNew?: boolean;
  identityKey?: { value: string; url?: string };
  awsRolePolicy?: { value: string; url?: string };
  systemHealthMonitor?: { reset: () => void; cleanup: () => void };
  queryHealthCheckEnabled?: boolean;
}>) {
  const { isSuccess, failureCount } = useHealth({
    enabled: !isPending,
    retry: true,
    refetchInterval: 1000 * 60,
  });
  const { data } = useVersion({ enabled: !isPending && isSuccess });
  const version = data?.version;
  const releasedVersion = version?.split('-')?.at(0);
  const resolvedIngress =
    ingressUrl || data?.ingress_endpoint || 'http://localhost:8080';

  const status: Status | undefined = isPending
    ? 'PENDING'
    : failureCount > 0
      ? 'DEGRADED'
      : isSuccess
        ? 'HEALTHY'
        : 'HEALTHY';

  const isVersionGte = useCallback(
    (targetVersion: string) => {
      return releasedVersion ? semverGt(releasedVersion, targetVersion) : false;
    },
    [releasedVersion],
  );

  const queryClient = useQueryClient();
  const refreshCodec = useCallback(() => {
    queryClient.removeQueries({
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

  useQueryHealthCheck({
    enabled: queryHealthCheckEnabled && status === 'HEALTHY',
    refetchInterval: 60_000,
  });

  const createResolvedPlaygroundFetcher = useCallback(
    (getCodecOptions?: GetPlaygroundCodecOptions) =>
      createPlaygroundFetcher(
        fetcher ?? globalThis.fetch,
        encoder,
        decoder,
        getCodecOptions,
      ),
    [fetcher, encoder, decoder],
  );

  const adminBaseUrl = useAdminBaseUrl();
  useEffect(() => {
    return () => {
      systemHealthMonitor?.reset();
    };
  }, [adminBaseUrl, systemHealthMonitor]);

  return (
    <InternalRestateContext.Provider
      value={{
        version,
        status,
        createPlaygroundFetcher: createResolvedPlaygroundFetcher,
        ingressUrl: resolvedIngress,
        isVersionGte,
        baseUrl,
        decoder,
        encoder,
        EncodingWaterMark,
        refreshCodec,
        tunnel,
        GettingStarted,
        OnboardingGuide,
        isNew,
        awsRolePolicy,
        identityKey,
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
  fetcher,
  decoder = EMPTY_CODECS,
  encoder = EMPTY_CODECS,
  EncodingWaterMark,
  tunnel,
  GettingStarted,
  OnboardingGuide,
  isNew,
  awsRolePolicy,
  identityKey,
  systemHealthMonitor,
  queryHealthCheckEnabled = false,
}: PropsWithChildren<{
  adminBaseUrl?: string;
  ingressUrl?: string;
  isPending?: boolean;
  baseUrl?: string;
  fetcher?: PlaygroundFetcher;
  decoder?: readonly RestateBinaryCodec[];
  encoder?: readonly RestateBinaryCodec[];
  EncodingWaterMark?: ComponentType<{
    value?: string;
    className?: string;
    mini?: boolean;
  }>;
  tunnel?: RestateContext['tunnel'];
  GettingStarted?: RestateContext['GettingStarted'];
  OnboardingGuide?: OnboardingComponent;
  isNew?: boolean;
  identityKey?: { value: string; url?: string };
  awsRolePolicy?: { value: string; url?: string };
  systemHealthMonitor?: { reset: () => void; cleanup: () => void };
  queryHealthCheckEnabled?: boolean;
}>) {
  const resolvedDecoder = useMemo(
    () => composeRestateDecoder(decoder),
    [decoder],
  );
  const resolvedEncoder = useMemo(
    () => composeRestateEncoder(encoder),
    [encoder],
  );

  return (
    <AdminBaseURLProvider baseUrl={adminBaseUrl}>
      <InternalRestateContextProvider
        ingressUrl={ingressUrl}
        isPending={isPending}
        baseUrl={baseUrl}
        fetcher={fetcher}
        decoder={resolvedDecoder}
        encoder={resolvedEncoder}
        EncodingWaterMark={EncodingWaterMark}
        tunnel={tunnel}
        GettingStarted={GettingStarted}
        OnboardingGuide={OnboardingGuide}
        isNew={isNew}
        awsRolePolicy={awsRolePolicy}
        identityKey={identityKey}
        systemHealthMonitor={systemHealthMonitor}
        queryHealthCheckEnabled={queryHealthCheckEnabled}
      >
        {children}
      </InternalRestateContextProvider>
    </AdminBaseURLProvider>
  );
}

export function useRestateContext() {
  return useContext(InternalRestateContext);
}
