import { forwardRef, PropsWithChildren, ReactNode, useRef } from 'react';
import { InternalTooltipContent } from './TooltipContent';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { TooltipTrigger as AriaTooltip } from 'react-aria-components';
import { useFocusable, useObjectRef } from 'react-aria';

interface InlineTooltipProps {
  title: ReactNode;
  description: ReactNode;
  learnMoreHref?: string;
}

export function InlineTooltip({
  children,
  title,
  description,
  learnMoreHref,
}: PropsWithChildren<InlineTooltipProps>) {
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <AriaTooltip delay={250}>
      <TooltipTrigger ref={triggerRef}>{children}</TooltipTrigger>
      <InternalTooltipContent triggerRef={triggerRef}>
        <div className="flex flex-col gap-2 items-start">
          <h6>{title}</h6>
          {description}
          {learnMoreHref && (
            <Link variant="button" rel="noopener noreferrer" target="_blank">
              Learn more
            </Link>
          )}
        </div>
      </InternalTooltipContent>
    </AriaTooltip>
  );
}

const TooltipTrigger = forwardRef<HTMLElement, PropsWithChildren<unknown>>(
  ({ children }, ref) => {
    const refObject = useObjectRef(ref);
    const { focusableProps } = useFocusable({}, refObject);

    return (
      <span
        ref={refObject}
        {...focusableProps}
        className="group underline-offset-4 decoration-from-font decoration-dashed underline inline-flex items-center"
      >
        <span className="group-hover:bg-black/5 rounded-sm mx-[-0.1em] px-[0.1em] ">
          {children}{' '}
        </span>
        <sup className="-mr-[0.2em]">
          <Button
            variant="icon"
            className="p-0.5 inline [&_svg]:w-[0.85em] [&_svg]:h-[0.85em] [&_svg]:stroke-[0.18em] text-current"
          >
            <Icon name={IconName.Info} />
          </Button>
        </sup>
      </span>
    );
  }
);
