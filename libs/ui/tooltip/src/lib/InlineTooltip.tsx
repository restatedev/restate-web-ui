import { forwardRef, PropsWithChildren, ReactNode, useRef } from 'react';
import { InternalTooltipContent } from './TooltipContent';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { TooltipTrigger as AriaTooltip } from 'react-aria-components';
import { useFocusable, useObjectRef } from 'react-aria';
import { tv } from 'tailwind-variants';

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
        <div className="flex flex-col gap-2 items-start">
          <h6 className="text-sm font-semibold text-gray-100">{title}</h6>
          {description}
          {learnMoreHref && (
            <Link
              className="mt-2 bg-zinc-600 hover:bg-zinc-500 pressed:bg-zinc-400 text-gray-100 px-2 py-1 text-sm rounded-lg inline-flex items-center gap-2"
              rel="noopener noreferrer"
              target="_blank"
              variant="button"
              href={learnMoreHref}
            >
              Learn more
              <Icon name={IconName.ExternalLink} className="w-[1em] h-[1em]" />
            </Link>
          )}
        </div>
      </InternalTooltipContent>
    </AriaTooltip>
  );
}

const helpStyles = tv({
  base: 'cursor-help group underline-offset-4 decoration-from-font decoration-dashed underline inline-flex items-center',
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
      <span className="group-hover:bg-black/5 rounded-sm mx-[-0.1em] px-[0.1em] ">
        {children}{' '}
      </span>
      <sup className="-ml-[0.1em] -mr-[0.4em]">
        <Button
          variant="icon"
          className="[font-size:inherit] -outline-offset-2 p-0 -mb-[0.4em] inline [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:stroke-[0.18em] text-current opacity-80"
        >
          <Icon name={IconName.Help} />
        </Button>
      </sup>
    </span>
  );
});

const infoStyles = tv({
  base: 'group inline-flex items-center gap-1',
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
        className="[font-size:inherit] p-0 inline [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:stroke-[0.18em] text-current"
      >
        <Icon name={IconName.Info} />
      </Button>
    </span>
  );
});
