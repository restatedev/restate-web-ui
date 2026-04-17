import {
  AdminBaseURLProvider,
  APIStatusProvider,
  useHealth,
  useVersion,
  useQueryHealthCheck,
  useAdminBaseUrl,
} from '@restate/data-access/admin-api';
import type { RestateCodecOptions } from '@restate/features/codec';
import { getAuthToken } from '@restate/util/api-config';
import { base64ToUint8Array, bytesToBase64 } from '@restate/util/binary';
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

export type Status = 'HEALTHY' | 'DEGRADED' | 'PENDING' | (string & {});
export type {
  RestateCodecCommand,
  RestateCodecHandlerMetadata,
  RestateCodecOptions,
} from '@restate/features/codec';
export type { RestateBinaryCodec } from './codecs';

type RestateStringCodec = (
  value?: string,
  options?: RestateCodecOptions,
) => Promise<string> | string;
export type PlaygroundFetcher = typeof globalThis.fetch;

const EMPTY_CODECS: readonly RestateBinaryCodec[] = [];

async function getEncodedPlaygroundBody(
  init: RequestInit | undefined,
  encoder: RestateStringCodec,
) {
  if (init?.body != null && typeof init.body !== 'string') {
    return init.body;
  }

  const encodedBody = await encoder(init?.body ?? '');
  return base64ToUint8Array(encodedBody);
}

function isRestateSendResponse(response: Response) {
  const contentType = response.headers
    .get('Content-Type')
    ?.split(';')
    .at(0)
    ?.trim()
    .toLowerCase();
  const restateId = response.headers.get('X-Restate-Id');

  return (
    response.url.endsWith('/send') &&
    contentType === 'application/json' &&
    restateId?.startsWith('inv_') === true
  );
}

async function getDecodedPlaygroundResponse(
  response: Response,
  decoder: RestateStringCodec,
) {
  if (
    !response.ok ||
    [204, 205, 304].includes(response.status) ||
    isRestateSendResponse(response)
  ) {
    return response;
  }

  const encodedBody = bytesToBase64(
    new Uint8Array(await response.clone().arrayBuffer()),
  );
  const decodedBody = await decoder(encodedBody);

  return new Response(decodedBody, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function createPlaygroundFetcher(
  fetcher: PlaygroundFetcher,
  encoder: RestateStringCodec,
  decoder: RestateStringCodec,
): PlaygroundFetcher {
  return async (input, init) => {
    const request = new Request(input, init);
    const nextRequest = new Request(request, {
      credentials: 'include',
      ...(!['GET', 'HEAD'].includes(request.method.toUpperCase()) && {
        body: await getEncodedPlaygroundBody(init, encoder),
      }),
    });
    const token = getAuthToken();
    if (token && !nextRequest.headers.has('Authorization')) {
      nextRequest.headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetcher(nextRequest);
    return getDecodedPlaygroundResponse(response, decoder);
  };
}

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
  playgroundFetcher: PlaygroundFetcher;
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
  playgroundFetcher: globalThis.fetch,
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
  playgroundFetcher,
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
  playgroundFetcher?: PlaygroundFetcher;
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

  const resolvedPlaygroundFetcher = useMemo(
    () =>
      createPlaygroundFetcher(
        playgroundFetcher ?? globalThis.fetch,
        encoder,
        decoder,
      ),
    [playgroundFetcher, encoder, decoder],
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
        playgroundFetcher: resolvedPlaygroundFetcher,
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
  playgroundFetcher,
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
  playgroundFetcher?: PlaygroundFetcher;
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
        playgroundFetcher={playgroundFetcher}
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
