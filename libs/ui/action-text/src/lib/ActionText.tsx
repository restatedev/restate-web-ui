import type { PropsWithChildren } from 'react';

export function ActionText({
  children,
  hasFollowup = true,
}: PropsWithChildren<{ hasFollowup?: boolean }>) {
  return (
    <>
      {children}
      {hasFollowup ? '…' : ''}
    </>
  );
}
