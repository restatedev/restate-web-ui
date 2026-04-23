import { useAdminBaseUrl } from '@restate/data-access/admin-api';
import { useRestateContext } from '@restate/features/restate-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useMemo,
} from 'react';
import {
  composeRestateDecoder,
  composeRestateEncoder,
  type RestateStringCodec,
} from './codecs';
import { useSerdePreviewDecoder, useSerdePreviewEncoder } from './preview';
import { EMPTY_CODECS, type RestateBinaryCodec } from './types';

export type CodecFetcher = typeof globalThis.fetch;

interface CodecRuntimeConfig {
  fetcher: CodecFetcher;
  decoder: RestateStringCodec;
  encoder: RestateStringCodec;
  refreshCodec: VoidFunction;
}

const DEFAULT_CONFIG: CodecRuntimeConfig = {
  fetcher: globalThis.fetch,
  decoder: composeRestateDecoder(EMPTY_CODECS),
  encoder: composeRestateEncoder(EMPTY_CODECS),
  refreshCodec: () => undefined,
};

const CodecRuntimeContext = createContext<CodecRuntimeConfig>(DEFAULT_CONFIG);

export function CodecRuntimeProvider({
  fetcher = globalThis.fetch,
  decoders = EMPTY_CODECS,
  encoders = EMPTY_CODECS,
  children,
}: PropsWithChildren<{
  fetcher?: CodecFetcher;
  decoders?: readonly RestateBinaryCodec[];
  encoders?: readonly RestateBinaryCodec[];
}>) {
  const adminBaseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const { isVersionGte } = useRestateContext();
  const serdePreviewSupported = Boolean(isVersionGte?.('1.6.3'));
  const previewDecoder = useSerdePreviewDecoder(adminBaseUrl ?? '');
  const previewEncoder = useSerdePreviewEncoder(adminBaseUrl ?? '');
  const decoder = useMemo(
    () =>
      composeRestateDecoder(
        serdePreviewSupported ? [...decoders, previewDecoder] : decoders,
      ),
    [...decoders, previewDecoder, serdePreviewSupported],
  );
  const encoder = useMemo(
    () =>
      composeRestateEncoder(
        serdePreviewSupported ? [...encoders, previewEncoder] : encoders,
      ),
    [...encoders, previewEncoder, serdePreviewSupported],
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

  return (
    <CodecRuntimeContext.Provider
      value={{ fetcher, decoder, encoder, refreshCodec }}
    >
      {children}
    </CodecRuntimeContext.Provider>
  );
}

export function useCodecRuntimeConfig() {
  return use(CodecRuntimeContext);
}
