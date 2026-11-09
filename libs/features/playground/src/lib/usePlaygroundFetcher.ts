import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateInvocationsV2Queries,
  useServiceDetails,
} from '@restate/data-access-admin-api-hooks';
import {
  useCodecRuntime,
  useResolvedCodecOptions,
} from '@restate/features-codec';

const INVALIDATION_DELAYS = [2_000, 4_000, 8_000, 16_000, 32_000];

export function usePlaygroundFetcher(service: string, handlerName?: string) {
  const resolvedServiceOptions = useResolvedCodecOptions({
    service: { value: { name: service } },
  });
  const { data: serviceDetails } = useServiceDetails(service, {
    refetchOnMount: false,
  });
  const queryClient = useQueryClient();
  const { createFetcherWithCodec } = useCodecRuntime();

  return useMemo(
    () =>
      createFetcherWithCodec(
        () => {
          if (!resolvedServiceOptions) {
            return undefined;
          }
          const handler = handlerName
            ? serviceDetails?.handlers.find(({ name }) => name === handlerName)
            : undefined;
          const { deploymentId: _deploymentId, ...rest } =
            resolvedServiceOptions;
          return {
            ...rest,
            handler: handler ? { value: handler } : undefined,
          };
        },
        (request) => {
          if (request.method === 'GET') {
            return;
          }
          const invalidate = () => {
            if (
              typeof document !== 'undefined' &&
              document.visibilityState !== 'visible'
            ) {
              return;
            }
            void invalidateInvocationsV2Queries(queryClient);
          };
          invalidate();
          for (const delay of INVALIDATION_DELAYS) {
            setTimeout(invalidate, delay);
          }
        },
      ),
    [
      createFetcherWithCodec,
      handlerName,
      queryClient,
      resolvedServiceOptions,
      serviceDetails,
    ],
  );
}
