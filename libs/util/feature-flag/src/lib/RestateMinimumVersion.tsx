import { PropsWithChildren } from 'react';
import { useRestateContext } from '@restate/features/restate-context';

export function RestateMinimumVersion({
  children,
  minVersion,
}: PropsWithChildren<{
  minVersion: string;
}>) {
  const { isVersionGte } = useRestateContext();

  if (isVersionGte?.(minVersion)) {
    return null;
  }

  return children;
}
