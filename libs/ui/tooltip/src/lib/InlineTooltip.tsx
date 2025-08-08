import { forwardRef, PropsWithChildren, ReactNode, useRef } from 'react';
import { InternalTooltipContent } from './TooltipContent';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { TooltipTrigger as AriaTooltip } from 'react-aria-components';
import { useFocusable, useObjectRef } from 'react-aria';
import { tv } from '@restate/util/styles';

interface InlineTooltipProps {
  title: ReactNode;
  description: ReactNode;
  learnMoreHref?: string;
  className?: string;
  variant?: 'inline-help' | 'indicator-button';
}

export function InlineTooltip({
  children,
  title,
  description,
  learnMoreHref,
  className,
  variant = 'inline-help',
}: PropsWithChildren<InlineTooltipProps>) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const Trigger =
    variant === 'inline-help' ? HelpTooltipTrigger : InfoTooltipTrigger;

  return (
    <AriaTooltip delay={250}>
      <Trigger ref={triggerRef} className={className}>
        {children}
      </Trigger>
      <InternalTooltipContent triggerRef={triggerRef}>
        <div className="flex flex-col items-start gap-2">
          <h6 className="text-sm font-semibold text-gray-100">{title}</h6>
          {description}
          {learnMoreHref && (
            <Link
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-2 py-1 text-sm text-gray-100 hover:bg-zinc-500 pressed:bg-zinc-400"
              rel="noopener noreferrer"
              target="_blank"
              variant="button"
              href={learnMoreHref}
            >
              Learn more
              <Icon name={IconName.ExternalLink} className="h-[1em] w-[1em]" />
            </Link>
          )}
        </div>
      </InternalTooltipContent>
    </AriaTooltip>
  );
}

const helpStyles = tv({
  base: 'group inline-flex cursor-help items-center underline decoration-dashed decoration-from-font underline-offset-4 outline-none',
});

const HelpTooltipTrigger = forwardRef<
  HTMLElement,
  PropsWithChildren<{ className?: string }>
>(({ children, className }, ref) => {
  const refObject = useObjectRef(ref);
  const { focusableProps } = useFocusable({}, refObject);

  return (
    <span
      ref={refObject}
      {...focusableProps}
      className={helpStyles({ className })}
    >
      <span className="mx-[-0.1em] rounded-xs px-[0.1em] group-hover:bg-black/5">
        {children}{' '}
      </span>
      <sup className="-mr-[0.4em] -ml-[0.1em]">
        <Button
          variant="icon"
          className="-mb-[0.4em] inline p-0 [font-size:inherit] text-current opacity-80 -outline-offset-2 [&_svg]:h-[1em] [&_svg]:w-[1em] [&_svg]:stroke-[0.18em]"
        >
          <Icon name={IconName.Help} />
        </Button>
      </sup>
    </span>
  );
});

const infoStyles = tv({
  base: 'group inline-flex items-center gap-1 outline-none',
});

const InfoTooltipTrigger = forwardRef<
  HTMLElement,
  PropsWithChildren<{ className?: string }>
>(({ children, className }, ref) => {
  const refObject = useObjectRef(ref);
  const { focusableProps } = useFocusable({}, refObject);

  return (
    <span
      ref={refObject}
      {...focusableProps}
      className={infoStyles({ className })}
    >
      {children}
      <Button
        variant="icon"
        className="inline p-0 [font-size:inherit] text-current [&_svg]:h-[1em] [&_svg]:w-[1em] [&_svg]:stroke-[0.18em]"
      >
        <Icon name={IconName.Info} />
      </Button>
    </span>
  );
});
