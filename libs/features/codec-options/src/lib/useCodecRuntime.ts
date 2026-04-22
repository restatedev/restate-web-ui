import { useAdminBaseUrl } from '@restate/data-access/admin-api';
import {
  useCodec,
  type RestateBinaryCodec,
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

const EMPTY_CODECS: readonly RestateBinaryCodec[] = [];

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
  const mergedCodecOptions = codecOptions
    ? { ...contextOptions, ...codecOptions }
    : contextOptions;
  const resolvedCodecOptions = useResolvedCodecOptions(
    codecOptions ? mergedCodecOptions : undefined,
  );
  const options = codecOptions ? resolvedCodecOptions : contextOptions;
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

        return (
          Array.isArray(queryKey) &&
          ['decode', 'encode'].includes(String(queryKey.at(1)))
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
