import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';
import * as adminApi from '@restate/data-access/admin-api/spec';
type HandlerType = adminApi.components['schemas']['HandlerMetadata']['ty'];

const TITLES: Record<HandlerType, string> = {
  Exclusive: 'Exclusive',
  Shared: 'Shared',
  Workflow: 'Workflow',
};

const DESCRIPTIONS: Record<HandlerType, string> = {
  Exclusive:
    'A handler with exclusive access to state during execution. For any object, only one exclusive handler can run at a time, giving that handler exclusive ownership of the object and state. Invocations are queued into infinitely fine-grained virtual queues.',
  Shared:
    "Handler that executes concurrently to the others and doesn't have write access to the K/V state",
  Workflow:
    'The workflow handler that executes exactly one time per workflow execution/object',
};

const LEARN_MORE: Record<HandlerType, string> = {
  Exclusive: '',
  Shared: '',
  Workflow: '',
};
export function HandlerTypeExplainer({
  children,
  className,
  variant,
  type,
}: PropsWithChildren<{
  className?: string;
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  type: HandlerType;
}>) {
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
