import {
  type ListDeploymentsData,
  useListDeployments,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { RestateError, UI_ERROR_CODES } from '@restate/util/errors';
import { useMemo } from 'react';
import type {
  AsyncCodecOption,
  RestateCodecHandlerMetadata,
  RestateCodecOptions,
  RestateCodecServiceMetadata,
} from './types';

function resolveCodecDeployment(
  service: string | undefined,
  deploymentId: string | undefined,
  listDeployments: ListDeploymentsData,
): { deploymentId: string | undefined; didFallback: boolean } {
  if (
    !deploymentId ||
    !service ||
    listDeployments?.deployments.has(deploymentId)
  ) {
    return { deploymentId, didFallback: false };
  }

  const serviceData = listDeployments?.services.get(service);
  const latestRevision = serviceData?.sortedRevisions[0];
  const fallback = latestRevision
    ? serviceData?.deployments[latestRevision]?.[0]
    : undefined;

  if (!fallback) {
    return { deploymentId, didFallback: false };
  }

  return { deploymentId: fallback, didFallback: true };
}

function getDeploymentFallbackError(
  serviceName: string | undefined,
  originalDeploymentId: string | undefined,
  fallbackDeploymentId: string | undefined,
) {
  const parts = [
    `Deployment "${originalDeploymentId ?? 'unknown'}" is no longer registered`,
    serviceName ? ` for service "${serviceName}"` : '',
    `. Using the latest deployment`,
    fallbackDeploymentId ? ` "${fallbackDeploymentId}"` : '',
    ` instead. Decoded or encoded values may not match the original format if the serde changed between deployments.`,
  ];

  return new RestateError(parts.join(''), UI_ERROR_CODES.deploymentFallback);
}

function toAsyncCodecOption<T>(
  value: T | undefined,
  isPending: boolean | undefined,
  error: Error | null | undefined,
): AsyncCodecOption<T> | undefined {
  if (typeof value === 'undefined' && !isPending && !error) {
    return undefined;
  }

  return {
    value,
    isPending: isPending || undefined,
    error: error ?? undefined,
  };
}

function getResolvedCodecServiceValue(
  codecOptions?: RestateCodecOptions,
  serviceMetadata?: RestateCodecServiceMetadata,
) {
  return {
    name: codecOptions?.service?.value?.name ?? serviceMetadata?.name,
    metadata:
      codecOptions?.service?.value?.metadata ?? serviceMetadata?.metadata,
  };
}

function getResolvedCodecHandlerValue(
  codecOptions?: RestateCodecOptions,
  handlerMetadata?: RestateCodecHandlerMetadata,
) {
  return {
    name: codecOptions?.handler?.value?.name ?? handlerMetadata?.name,
    metadata:
      codecOptions?.handler?.value?.metadata ?? handlerMetadata?.metadata,
    input_description:
      codecOptions?.handler?.value?.input_description ??
      handlerMetadata?.input_description,
    input_json_schema:
      codecOptions?.handler?.value?.input_json_schema ??
      handlerMetadata?.input_json_schema,
    output_description:
      codecOptions?.handler?.value?.output_description ??
      handlerMetadata?.output_description,
    output_json_schema:
      codecOptions?.handler?.value?.output_json_schema ??
      handlerMetadata?.output_json_schema,
  };
}

export function useResolvedCodecOptions(codecOptions?: RestateCodecOptions) {
  const serviceName = codecOptions?.service?.value?.name;
  const handlerName = codecOptions?.handler?.value?.name;
  const hasService = Boolean(serviceName);
  const serviceQuery = useServiceDetails(String(serviceName), {
    enabled: hasService,
    refetchOnMount: false,
  });
  const {
    data: listDeployments,
    isPending: isDeploymentPending,
    error: deploymentError,
  } = useListDeployments({
    enabled: hasService,
    refetchOnMount: false,
  });
  const resolvedHandlerMetadata = handlerName
    ? serviceQuery.data?.handlers.find(({ name }) => name === handlerName)
    : undefined;
  const originalDeploymentId = codecOptions?.deploymentId?.value;
  const { deploymentId: resolvedDeploymentId, didFallback } =
    resolveCodecDeployment(serviceName, originalDeploymentId, listDeployments);

  return useMemo(() => {
    if (!codecOptions) {
      return codecOptions;
    }

    return {
      ...codecOptions,
      service: toAsyncCodecOption(
        getResolvedCodecServiceValue(codecOptions, serviceQuery.data),
        codecOptions.service?.isPending ||
          (hasService && serviceQuery.isPending),
        codecOptions.service?.error ??
          (hasService ? serviceQuery.error : null) ??
          undefined,
      ),
      handler: toAsyncCodecOption(
        getResolvedCodecHandlerValue(codecOptions, resolvedHandlerMetadata),
        codecOptions.handler?.isPending ||
          (Boolean(handlerName) && serviceQuery.isPending),
        codecOptions.handler?.error ??
          (handlerName ? serviceQuery.error : null) ??
          undefined,
      ),
      deploymentId: toAsyncCodecOption(
        resolvedDeploymentId,
        codecOptions.deploymentId?.isPending ||
          (hasService && isDeploymentPending),
        codecOptions.deploymentId?.error ??
          (hasService ? deploymentError : null) ??
          (didFallback
            ? getDeploymentFallbackError(
                serviceName,
                originalDeploymentId,
                resolvedDeploymentId,
              )
            : undefined),
      ),
    };
  }, [
    codecOptions,
    deploymentError,
    didFallback,
    handlerName,
    hasService,
    isDeploymentPending,
    originalDeploymentId,
    resolvedDeploymentId,
    resolvedHandlerMetadata,
    serviceName,
    serviceQuery.data,
    serviceQuery.error,
    serviceQuery.isPending,
  ]);
}
