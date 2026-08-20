import type { Invocation } from '@restate/data-access/admin-api-spec';
import {
  Header,
  type HeaderIconProps,
  type HeaderVariant,
} from '@restate/ui/header';
import type { PropsWithChildren, ReactNode } from 'react';

export type InvocationStatusIntent = HeaderVariant;

export function getInvocationStatusIntent(
  invocation?: Invocation,
  status?: string,
): InvocationStatusIntent {
  if (!invocation && !status) return 'default';
  if (invocation?.isRetrying) return 'warning';
  switch (invocation?.status ?? status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'danger';
    case 'pending':
      return 'pending';
    case 'paused':
    case 'backing-off':
      return 'warning';
    case 'running':
    case 'started':
      return 'info';
    default:
      return 'default';
  }
}

export function InvocationStatusHeader({
  invocation,
  status,
  className,
  trail,
  children,
  ...iconProps
}: PropsWithChildren<{
  invocation?: Invocation;
  status?: string;
  className?: string;
  trail?: ReactNode;
}> &
  HeaderIconProps) {
  return (
    <Header
      variant={getInvocationStatusIntent(invocation, status)}
      className={className}
      trail={trail}
      {...iconProps}
    >
      {children}
    </Header>
  );
}
