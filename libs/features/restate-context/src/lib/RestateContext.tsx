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
} from 'react';
import semverGt from 'semver/functions/gte';
import { base64ToUtf8, utf8ToBase64 } from '@restate/util/binary';
import { useQueryClient } from '@tanstack/react-query';

export type Status = 'HEALTHY' | 'DEGRADED' | 'PENDING' | (string & {});
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
  tunnel,
  GettingStarted,
  isNew,
  OnboardingGuide,
  awsRolePolicy,
  identityKey,
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
  tunnel?: RestateContext['tunnel'];
  GettingStarted?: ComponentType<{ className?: string }>;
  OnboardingGuide?: OnboardingComponent;
  isNew?: boolean;
  identityKey?: { value: string; url?: string };
  awsRolePolicy?: { value: string; url?: string };
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
  decoder = base64ToUtf8,
  encoder = utf8ToBase64,
  EncodingWaterMark,
  tunnel,
  GettingStarted,
  OnboardingGuide,
  isNew,
  awsRolePolicy,
  identityKey,
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
  tunnel?: RestateContext['tunnel'];
  GettingStarted?: RestateContext['GettingStarted'];
  OnboardingGuide?: OnboardingComponent;
  isNew?: boolean;
  identityKey?: { value: string; url?: string };
  awsRolePolicy?: { value: string; url?: string };
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
        tunnel={tunnel}
        GettingStarted={GettingStarted}
        OnboardingGuide={OnboardingGuide}
        isNew={isNew}
        awsRolePolicy={awsRolePolicy}
        identityKey={identityKey}
      >
        {children}
      </InternalRestateContextProvider>
    </AdminBaseURLProvider>
  );
}

export function useRestateContext() {
  return useContext(InternalRestateContext);
}
