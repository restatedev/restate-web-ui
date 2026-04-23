import type { PropsWithChildren } from 'react';
import { StaticCodecOptionsProvider } from './Codec';
import type { RestateCodecOptions } from './types';
import { useResolvedCodecOptions } from './useResolvedCodecOptions';

export function CodecOptionsProvider({
  options,
  children,
}: PropsWithChildren<{
  options?: RestateCodecOptions;
}>) {
  const resolvedOptions = useResolvedCodecOptions(options);

  return (
    <StaticCodecOptionsProvider options={resolvedOptions}>
      {children}
    </StaticCodecOptionsProvider>
  );
}
