import { PropsWithChildren, ReactNode } from 'react';
import { useRestateContext } from './RestateContext';

export function RestateMinimumVersion({
  children,
  minVersion,
  fallback = null,
}: PropsWithChildren<{
  minVersion: string;
  fallback?: ReactNode;
}>) {
  const { isVersionGte } = useRestateContext();

  if (!isVersionGte?.(minVersion)) {
    return fallback;
  }

  return children;
}
