import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';
import type { ServiceType } from '@restate/data-access/admin-api';

const TITLES: Record<ServiceType, string> = {
  Service: 'Basic Service',
  VirtualObject: 'Virtual Object',
  Workflow: 'Workflow',
};

const DESCRIPTIONS: Record<ServiceType, string> = {
  Service:
    'Basic Services group handlers into callable units that run to completion with Durable Execution. They scale horizontally with high concurrency and have no shared state, making them ideal for API calls, sagas, background jobs, parallel tasks, and ETL operations.',
  VirtualObject:
    'Virtual Objects are stateful entities identified by a unique key. They use Durable Execution, retain key/value state across requests, and scale consistently by allowing only one writer per key while supporting concurrent reads and execution across different keys.',
  Workflow:
    'Workflows orchestrate multi-step processes with guaranteed once per ID execution. The run handler executes exactly once per workflow ID, while other handlers can run concurrently to signal, query state, or wait for events, making workflows ideal for approvals, onboarding, multi-step transactions, and complex orchestration.',
};

const LEARN_MORE: Record<ServiceType, string> = {
  Service: 'https://docs.restate.dev/foundations/services#basic-service',
  VirtualObject: 'https://docs.restate.dev/foundations/services#virtual-object',
  Workflow: 'https://docs.restate.dev/foundations/services#workflow',
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
