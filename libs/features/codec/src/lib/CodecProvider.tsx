import type { PropsWithChildren } from 'react';
import { CodecOptionsProvider } from './Codec';
import type { RestateCodecOptions } from './types';
import { useResolvedCodecOptions } from './useResolvedCodecOptions';

export function CodecProvider({
  options,
  children,
}: PropsWithChildren<{
  options?: RestateCodecOptions;
}>) {
  const resolvedOptions = useResolvedCodecOptions(options);

  return (
    <CodecOptionsProvider options={resolvedOptions}>
      {children}
    </CodecOptionsProvider>
  );
}
