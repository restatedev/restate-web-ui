import { useAdminBaseUrl } from '@restate/data-access/admin-api';
import {
  EMPTY_CODECS,
  useCodec,
  type RestateCodecOptions,
} from '@restate/features/codec';
import { useRestateContext } from '@restate/features/restate-context';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { composeRestateDecoder, composeRestateEncoder } from './codecs';
import {
  createFetcherWithCodec,
  type GetCodecOptions,
} from './fetcherWithCodec';
import { useSerdePreviewDecoder, useSerdePreviewEncoder } from './preview';
import { useResolvedCodecOptions } from './useResolvedCodecOptions';

function getCodecError(codecOptions: RestateCodecOptions | undefined) {
  return (
    codecOptions?.service?.error ??
    codecOptions?.deploymentId?.error ??
    codecOptions?.handler?.error
  );
}

function isCodecPending(codecOptions: RestateCodecOptions | undefined) {
  return Boolean(
    codecOptions?.service?.isPending ||
      codecOptions?.deploymentId?.isPending ||
      codecOptions?.handler?.isPending,
  );
}

export function useCodecRuntime(codecOptions?: RestateCodecOptions) {
  const contextOptions = useCodec();
  const merged = codecOptions
    ? { ...contextOptions, ...codecOptions }
    : undefined;
  const resolved = useResolvedCodecOptions(merged);
  const options = merged ? resolved : contextOptions;
  const {
    fetcher = globalThis.fetch,
    decoders = EMPTY_CODECS,
    encoders = EMPTY_CODECS,
  } = useRestateContext();
  const adminBaseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const previewDecoder = useSerdePreviewDecoder(adminBaseUrl ?? '');
  const previewEncoder = useSerdePreviewEncoder(adminBaseUrl ?? '');
  const decoder = useMemo(
    () => composeRestateDecoder([...decoders, previewDecoder]),
    [...decoders, previewDecoder],
  );
  const encoder = useMemo(
    () => composeRestateEncoder([...encoders, previewEncoder]),
    [...encoders, previewEncoder],
  );
  const decode = useCallback(
    (value?: string, optionsOverride?: RestateCodecOptions) =>
      decoder(value, optionsOverride ?? options),
    [decoder, options],
  );
  const encode = useCallback(
    (value?: string, optionsOverride?: RestateCodecOptions) =>
      encoder(value, optionsOverride ?? options),
    [encoder, options],
  );
  const createFetcher = useCallback(
    (getCodecOptions?: GetCodecOptions) =>
      createFetcherWithCodec(fetcher, encoder, decoder, async (request) => {
        const requestOptions = await getCodecOptions?.(request);

        return requestOptions ?? options;
      }),
    [decoder, encoder, fetcher, options],
  );
  const refreshCodec = useCallback(() => {
    queryClient.removeQueries({
      predicate(query) {
        const { queryKey } = query;

        if (!Array.isArray(queryKey)) {
          return false;
        }

        const [path, options] = queryKey;

        if (['decode', 'encode'].includes(String(options))) {
          return true;
        }

        return (
          typeof path === 'string' &&
          path.startsWith('/internal/services/') &&
          path.includes('/serdes/')
        );
      },
    });
  }, [queryClient]);

  return {
    options,
    encode,
    decode,
    createFetcherWithCodec: createFetcher,
    refreshCodec,
    isPending: isCodecPending(options),
    error: getCodecError(options),
  };
}
