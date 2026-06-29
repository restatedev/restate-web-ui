import {
  AdminBaseURLProvider,
  APIStatusProvider,
  useHealth,
  useVersion,
  useQueryHealthCheck,
  useAdminBaseUrl,
  useFeatures,
} from '@restate/data-access/admin-api';
import {
  ComponentType,
  createContext,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
} from 'react';
import semverGt from 'semver/functions/gte';
import { RangeProvider } from './Range';

const EXECUTION_METRICS_FEATURE = 'execution-metrics';

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
  children?: ReactNode;
}>;
type RestateContext = {
  status: Status;
  version?: string;
  isVersionGte?: (version: string) => boolean;
  ingressUrl: string;
  baseUrl: string;
  observabilityDashboardUrl?: string;
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
  gcpServiceAccount?: { value: string; url?: string };
  isGoogleIdTokenAuthAvailable?: boolean;
  isExecutionMetricsEnabled: boolean;
};

const InternalRestateContext = createContext<RestateContext>({
  status: 'PENDING',
  ingressUrl: '',
  baseUrl: '',
  isGoogleIdTokenAuthAvailable: true,
  isExecutionMetricsEnabled: false,
});

function InternalRestateContextProvider({
  children,
  isPending,
  systemHealthMonitor,
  ingressUrl,
  baseUrl = '',
  observabilityDashboardUrl,
  EncodingWaterMark,
  tunnel,
  GettingStarted,
  isNew,
  OnboardingGuide,
  awsRolePolicy,
  identityKey,
  gcpServiceAccount,
  isGoogleIdTokenAuthAvailable = true,
  executionMetricsEnabled = false,
  queryHealthCheckEnabled = false,
}: PropsWithChildren<{
  isPending?: boolean;
  ingressUrl?: string;
  baseUrl?: string;
  observabilityDashboardUrl?: string;
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
  gcpServiceAccount?: { value: string; url?: string };
  isGoogleIdTokenAuthAvailable?: boolean;
  executionMetricsEnabled?: boolean;
  systemHealthMonitor?: { reset: () => void; cleanup: () => void };
  queryHealthCheckEnabled?: boolean;
}>) {
  const { isSuccess, failureCount } = useHealth({
    enabled: !isPending,
    retry: true,
    refetchInterval: 1000 * 60,
  });
  const { data } = useVersion({ enabled: !isPending && isSuccess });
  const features = useFeatures();
  const version = data?.version;
  const releasedVersion = version?.split('-')?.at(0);
  // const hasExecutionMetricsFeature = features.has(EXECUTION_METRICS_FEATURE);
  const isExecutionMetricsEnabled = executionMetricsEnabled;
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

  useQueryHealthCheck({
    enabled: queryHealthCheckEnabled && status === 'HEALTHY',
  });

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
        ingressUrl: resolvedIngress,
        isVersionGte,
        baseUrl,
        observabilityDashboardUrl,
        EncodingWaterMark,
        tunnel,
        GettingStarted,
        OnboardingGuide,
        isNew,
        awsRolePolicy,
        identityKey,
        gcpServiceAccount,
        isGoogleIdTokenAuthAvailable,
        isExecutionMetricsEnabled,
      }}
    >
      <APIStatusProvider enabled={status === 'HEALTHY'}>
        <RangeProvider>{children}</RangeProvider>
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
  observabilityDashboardUrl,
  EncodingWaterMark,
  tunnel,
  GettingStarted,
  OnboardingGuide,
  isNew,
  awsRolePolicy,
  identityKey,
  gcpServiceAccount,
  isGoogleIdTokenAuthAvailable = true,
  executionMetricsEnabled = false,
  systemHealthMonitor,
  queryHealthCheckEnabled = false,
}: PropsWithChildren<{
  adminBaseUrl?: string;
  ingressUrl?: string;
  isPending?: boolean;
  baseUrl?: string;
  observabilityDashboardUrl?: string;
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
  gcpServiceAccount?: { value: string; url?: string };
  isGoogleIdTokenAuthAvailable?: boolean;
  executionMetricsEnabled?: boolean;
  systemHealthMonitor?: { reset: () => void; cleanup: () => void };
  queryHealthCheckEnabled?: boolean;
}>) {
  return (
    <AdminBaseURLProvider baseUrl={adminBaseUrl}>
      <InternalRestateContextProvider
        ingressUrl={ingressUrl}
        isPending={isPending}
        baseUrl={baseUrl}
        observabilityDashboardUrl={observabilityDashboardUrl}
        EncodingWaterMark={EncodingWaterMark}
        tunnel={tunnel}
        GettingStarted={GettingStarted}
        OnboardingGuide={OnboardingGuide}
        isNew={isNew}
        awsRolePolicy={awsRolePolicy}
        identityKey={identityKey}
        gcpServiceAccount={gcpServiceAccount}
        isGoogleIdTokenAuthAvailable={isGoogleIdTokenAuthAvailable}
        executionMetricsEnabled={executionMetricsEnabled}
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
