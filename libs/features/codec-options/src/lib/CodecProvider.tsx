import {
  CodecOptionsProvider,
  type RestateCodecOptions,
} from '@restate/features/codec';
import type { PropsWithChildren } from 'react';
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
