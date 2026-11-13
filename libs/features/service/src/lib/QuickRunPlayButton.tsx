import { lazy, Suspense, useState } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { useSearchParams } from 'react-router';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import { PopoverContent } from '@restate/ui-popover';
import { HoverTooltip } from '@restate/ui-tooltip';
import {
  PLAYGROUND_HANDLER_QUERY_PARAM,
  SERVICE_PLAYGROUND_QUERY_PARAM,
} from '@restate/util-panel';
import { tv } from '@restate/util-styles';

const LazyQuickRun = lazy(() =>
  import('@restate/features-playground').then((module) => ({
    default: module.QuickRun,
  })),
);

const playStyles = tv({
  slots: {
    button:
      'relative shrink-0 rounded-md border-none bg-subtle px-1 py-1 align-middle shadow-none',
    icon: 'ml-px h-3 w-3 fill-accent-strong text-accent-subtle/5',
  },
  variants: {
    isHighlighted: {
      true: {
        button: 'animate-pulseButton bg-accent-subtle',
        icon: 'fill-accent',
      },
    },
  },
});

export function QuickRunPlayButton({
  service,
  handler,
  isHighlighted = false,
  'aria-label': ariaLabel,
}: {
  service: string;
  handler?: string;
  isHighlighted?: boolean;
  'aria-label': string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const styles = playStyles({ isHighlighted: isHighlighted && !isOpen });

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <HoverTooltip content="Quick run" disabled={isHighlighted}>
        <Button
          variant="secondary"
          aria-label={ariaLabel}
          className={styles.button()}
          autoFocus={isHighlighted}
        >
          <Icon name={IconName.Play} className={styles.icon()} />
        </Button>
      </HoverTooltip>
      <PopoverContent placement="bottom start" className="max-w-none">
        <Suspense
          fallback={
            <div className="flex min-h-32 w-[30rem] items-center justify-center gap-2 text-sm text-muted">
              <Spinner className="h-4 w-4" />
              Loading…
            </div>
          }
        >
          <LazyQuickRun
            service={service}
            handler={handler}
            onOpenFull={(name) => {
              setIsOpen(false);
              setSearchParams(
                (previous) => {
                  const next = new URLSearchParams(previous);
                  next.set(SERVICE_PLAYGROUND_QUERY_PARAM, service);
                  next.set(PLAYGROUND_HANDLER_QUERY_PARAM, name);
                  return next;
                },
                { preventScrollReset: true },
              );
            }}
          />
        </Suspense>
      </PopoverContent>
    </DialogTrigger>
  );
}
