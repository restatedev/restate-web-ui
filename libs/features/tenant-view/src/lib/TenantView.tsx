import { TenantInvocation } from './TenantInvocation';
import { TenantInvocations } from './TenantInvocations';
import type { TenantInvocationsProps } from './TenantInvocations';

export interface TenantViewProps extends TenantInvocationsProps {
  invocationId?: string;
}

export function TenantView({ invocationId, ...props }: TenantViewProps) {
  return invocationId ? (
    <TenantInvocation {...props} invocationId={invocationId} />
  ) : (
    <TenantInvocations {...props} />
  );
}
