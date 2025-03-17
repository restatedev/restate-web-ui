import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';
import type { ServiceType } from '@restate/data-access/admin-api';

const TITLES: Record<ServiceType, string> = {
  Service: 'Service',
  VirtualObject: 'Virtual object',
  Workflow: 'Workflow',
};

const DESCRIPTIONS: Record<ServiceType, string> = {
  Service:
    'Services expose a collection of durably executed handlers. These handlers operate independently, can be invoked concurrently, and do not have access to the Restate K/V store.',
  VirtualObject:
    'Virtual objects expose a set of durably executed handlers with access to K/V state stored in Restate. To ensure consistent writes to the state, Restate provides concurrency guarantees for Virtual Objects.',
  Workflow:
    'A workflow is a special type of Virtual Object that can be used to implement a set of steps that need to be executed durably. Workflows have additional capabilities such as signaling, querying, additional invocation options',
};

const LEARN_MORE: Record<ServiceType, string> = {
  Service: 'https://docs.restate.dev/concepts/services/#services-1',
  VirtualObject: 'https://docs.restate.dev/concepts/services/#virtual-objects',
  Workflow: 'https://docs.restate.dev/concepts/services/#workflows',
};
export function ServiceTypeExplainer({
  children,
  className,
  variant,
  type,
}: PropsWithChildren<{
  className?: string;
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  type?: ServiceType;
}>) {
  if (!type) {
    return children;
  }
  return (
    <InlineTooltip
      variant={variant}
      className={className}
      title={TITLES[type]}
      description={<p>{DESCRIPTIONS[type]}</p>}
      learnMoreHref={LEARN_MORE[type]}
    >
      {children}
    </InlineTooltip>
  );
}
