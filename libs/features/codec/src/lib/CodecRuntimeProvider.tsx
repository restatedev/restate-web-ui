import { createContext, type PropsWithChildren, use } from 'react';
import { EMPTY_CODECS, type RestateBinaryCodec } from './types';

export type CodecFetcher = typeof globalThis.fetch;

interface CodecRuntimeConfig {
  fetcher: CodecFetcher;
  decoders: readonly RestateBinaryCodec[];
  encoders: readonly RestateBinaryCodec[];
}

const DEFAULT_CONFIG: CodecRuntimeConfig = {
  fetcher: globalThis.fetch,
  decoders: EMPTY_CODECS,
  encoders: EMPTY_CODECS,
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
  return (
    <CodecRuntimeContext.Provider value={{ fetcher, decoders, encoders }}>
      {children}
    </CodecRuntimeContext.Provider>
  );
}

export function useCodecRuntimeConfig() {
  return use(CodecRuntimeContext);
}
