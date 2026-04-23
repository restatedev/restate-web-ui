import { createContext, PropsWithChildren, use } from 'react';
import type { RestateCodecOptions } from './types';

const EMPTY_CODEC_OPTIONS: RestateCodecOptions = {};
const CodecContext = createContext<RestateCodecOptions>(EMPTY_CODEC_OPTIONS);

export function CodecOptionsProvider({
  options,
  children,
}: PropsWithChildren<{
  options?: RestateCodecOptions;
}>) {
  return (
    <CodecContext.Provider value={options ?? EMPTY_CODEC_OPTIONS}>
      {children}
    </CodecContext.Provider>
  );
}

export function useCodec() {
  return use(CodecContext);
}

export function useCodecOptions() {
  return useCodec();
}
