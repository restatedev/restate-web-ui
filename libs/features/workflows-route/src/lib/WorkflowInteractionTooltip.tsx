import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { HoverTooltip, InlineTooltip } from '@restate/ui-tooltip';
import type { ReactNode } from 'react';

interface WorkflowInteractionTooltipProps {
  children?: ReactNode;
  className?: string;
  variant?: 'inline' | 'tab';
}

const description =
  'Interactions are invocations of handlers other than the run handler. They are commonly used to query or signal a Workflow while its execution is running or retained.';
const learnMoreHref =
  'https://docs.restate.dev/tour/workflows#workflow-patterns';

export function WorkflowInteractionTooltip({
  children,
  className,
  variant = 'inline',
}: WorkflowInteractionTooltipProps) {
  if (variant === 'tab') {
    return (
      <span className="inline-flex items-center gap-1">
        {children}
        <HoverTooltip
          content={
            <span className="flex flex-col items-start gap-2">
              <span className="font-semibold text-inverse">
                Workflow interactions
              </span>
              <span>{description}</span>
              <Link
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-inverse-emphasis px-2 py-1 text-sm text-inverse hover:bg-inverse-strong pressed:bg-inverse-muted"
                rel="noopener noreferrer"
                target="_blank"
                variant="button"
                href={learnMoreHref}
              >
                Learn more
                <Icon
                  name={IconName.ExternalLink}
                  className="h-[1em] w-[1em]"
                />
              </Link>
            </span>
          }
          size="default"
          placement="top"
          className={className ?? 'inline-flex shrink-0'}
        >
          <span
            role="img"
            aria-label="About Workflow interactions"
            className="inline-flex text-inverse-muted"
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
      learnMoreHref={learnMoreHref}
      className={className}
    >
      {children}
    </InlineTooltip>
  );
}
