import { useCallback } from 'react';
import { useCodec } from './Codec';
import { useCodecRuntimeConfig } from './CodecRuntimeProvider';
import {
  createFetcherWithCodec,
  type GetCodecOptions,
} from './fetcherWithCodec';
import type { RestateCodecOptions } from './types';
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
  const { fetcher, decoder, encoder, refreshCodec } = useCodecRuntimeConfig();

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
    (getCodecOptions?: GetCodecOptions, onCall?: (req: Request) => void) =>
      createFetcherWithCodec(
        fetcher,
        encoder,
        decoder,
        async (request) => {
          const requestOptions = await getCodecOptions?.(request);

          return requestOptions ?? options;
        },
        onCall,
      ),
    [decoder, encoder, fetcher, options],
  );

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
