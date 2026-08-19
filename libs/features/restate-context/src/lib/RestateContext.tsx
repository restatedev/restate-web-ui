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
  useMemo,
} from 'react';
import semverGt from 'semver/functions/gte';
import {
  classifyHealthFailure,
  type HealthFailure,
} from '@restate/util/errors';
import { RangeProvider } from './Range';

export type Status =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNREACHABLE'
  | 'PENDING'
  | (string & {});

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
// Tuning knobs for the invocations list page. `sampleSize` caps sampled
// list/summary scans; `slowQueryMs` is how long the loading skeleton may be up
// before the slow-query reassurance banner appears. The table (list) query has
// its own sampling default, independent of the summary's estimate/exact knob,
// chosen per query preset: `listSampledDefaultByPreset` is keyed by preset id
// from @restate/util/sidebar-nav ('all' | 'inflight' | … | 'custom' for any
// non-preset filter combination) — kept as strings to avoid a dependency cycle
// with sidebar-nav — and `listSampledDefault` is the fallback for presets not
// listed there.
export type InvocationsListOptions = {
  sampleSize: number;
  slowQueryMs: number;
  listSampledDefault: boolean;
  listSampledDefaultByPreset: Partial<Record<string, boolean>>;
};

const DEFAULT_INVOCATIONS_LIST_OPTIONS: InvocationsListOptions = {
  sampleSize: 1_000_000,
  slowQueryMs: 5_000,
  listSampledDefault: false,
  listSampledDefaultByPreset: {
    all: false,
    inflight: false,
    processing: false,
    stuck: false,
    scheduled: false,
    notcompleted: false,
    custom: false,
  },
};

type RestateContext = {
  status: Status;
  healthFailure?: HealthFailure;
  version?: string;
  isVersionGte?: (version: string) => boolean;
  ingressUrl: string;
  baseUrl: string;
  observabilityDashboardUrl?: string;
  // Preset applied when landing on /invocations without an explicit query (e.g.
  // the Invocations nav link) — falls back to the "All" view when unset. A
  // preset id from @restate/util/sidebar-nav ('all' | 'inflight' | 'processing'
  // | 'stuck' | …). Kept as a string to avoid a dependency cycle with
  // sidebar-nav; the invocations route validates it.
  defaultInvocationsPreset?: string;
  invocationsListOptions: InvocationsListOptions;
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
  invocationsListOptions: DEFAULT_INVOCATIONS_LIST_OPTIONS,
});

function InternalRestateContextProvider({
  children,
  isPending,
  systemHealthMonitor,
  ingressUrl,
  baseUrl = '',
  observabilityDashboardUrl,
  defaultInvocationsPreset,
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
  invocationsListOptions,
}: PropsWithChildren<{
  isPending?: boolean;
  ingressUrl?: string;
  baseUrl?: string;
  observabilityDashboardUrl?: string;
  defaultInvocationsPreset?: string;
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
  invocationsListOptions?: Partial<InvocationsListOptions>;
}>) {
  const { isSuccess, failureCount, error, failureReason } = useHealth({
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

  // During retries the query's `error` is still null but `failureReason`
  // already holds the last attempt's error, so classify from either.
  const healthError = failureCount > 0 ? (failureReason ?? error) : null;
  const healthFailure = useMemo(
    () => (healthError ? classifyHealthFailure(healthError) : undefined),
    [healthError],
  );

  const status: Status | undefined = isPending
    ? 'PENDING'
    : healthFailure
      ? healthFailure.kind === 'unreachable'
        ? 'UNREACHABLE'
        : 'DEGRADED'
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

  const resolvedInvocationsListOptions = useMemo<InvocationsListOptions>(
    () => ({
      ...DEFAULT_INVOCATIONS_LIST_OPTIONS,
      ...invocationsListOptions,
      listSampledDefaultByPreset: {
        ...DEFAULT_INVOCATIONS_LIST_OPTIONS.listSampledDefaultByPreset,
        ...invocationsListOptions?.listSampledDefaultByPreset,
      },
    }),
    [invocationsListOptions],
  );

  return (
    <InternalRestateContext.Provider
      value={{
        version,
        status,
        healthFailure,
        ingressUrl: resolvedIngress,
        isVersionGte,
        baseUrl,
        observabilityDashboardUrl,
        defaultInvocationsPreset,
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
        invocationsListOptions: resolvedInvocationsListOptions,
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
  defaultInvocationsPreset,
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
  invocationsListOptions,
}: PropsWithChildren<{
  adminBaseUrl?: string;
  ingressUrl?: string;
  isPending?: boolean;
  baseUrl?: string;
  observabilityDashboardUrl?: string;
  defaultInvocationsPreset?: string;
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
  invocationsListOptions?: Partial<InvocationsListOptions>;
}>) {
  return (
    <AdminBaseURLProvider baseUrl={adminBaseUrl}>
      <InternalRestateContextProvider
        ingressUrl={ingressUrl}
        isPending={isPending}
        baseUrl={baseUrl}
        observabilityDashboardUrl={observabilityDashboardUrl}
        defaultInvocationsPreset={defaultInvocationsPreset}
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
        invocationsListOptions={invocationsListOptions}
      >
        {children}
      </InternalRestateContextProvider>
    </AdminBaseURLProvider>
  );
}

export function useRestateContext() {
  return useContext(InternalRestateContext);
}
