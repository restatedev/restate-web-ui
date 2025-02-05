import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';
import * as adminApi from '@restate/data-access/admin-api/spec';
type HandlerType = Exclude<
  adminApi.components['schemas']['HandlerMetadata']['ty'],
  undefined | null
>;

const TITLES: Record<HandlerType, string> = {
  Exclusive: 'Exclusive',
  Shared: 'Shared',
  Workflow: 'Workflow',
};

const DESCRIPTIONS: Record<HandlerType, string> = {
  Exclusive:
    "A handler with exclusive access to a Virtual Object's state while it executes. For any specific object, only one exclusive handler can operate concurrently, granting it exclusive control over the object and its state. If multiple invocations target the same Virtual Object key, they will be queued by Restate.",
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
