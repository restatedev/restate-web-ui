import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip, InlineTooltip } from '@restate/ui/tooltip';
import type { ReactNode } from 'react';

interface WorkflowInteractionTooltipProps {
  children: ReactNode;
  variant?: 'inline' | 'tab';
}

const description =
  'Interactions are invocations of handlers other than the run handler. They are commonly used to query or signal a Workflow while its execution is running or retained.';

export function WorkflowInteractionTooltip({
  children,
  variant = 'inline',
}: WorkflowInteractionTooltipProps) {
  if (variant === 'tab') {
    return (
      <span className="inline-flex items-center gap-1">
        {children}
        <HoverTooltip
          content={
            <>
              <span className="font-semibold text-gray-100">
                Workflow interactions
              </span>
              <span>{description}</span>
            </>
          }
          size="default"
          placement="top"
          className="inline-flex shrink-0"
        >
          <span
            role="img"
            aria-label="About Workflow interactions"
            className="inline-flex text-current opacity-70"
          >
            <Icon
              name={IconName.Info}
              className="h-[1em] w-[1em] stroke-[0.18em]"
            />
          </span>
        </HoverTooltip>
      </span>
    );
  }

  return (
    <InlineTooltip
      variant="indicator-button"
      title="Workflow interactions"
      description={description}
    >
      {children}
    </InlineTooltip>
  );
}
