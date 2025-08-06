import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { RestateError } from '@restate/util/errors';
import { useMemo } from 'react';
import { tv } from 'tailwind-variants';
const failureStyle = tv({
  base: '',
  slots: {
    trigger:
      ' bg-white/70 border px-0 py-0 flex rounded-lg items-center gap-0 [font-size:inherit] h-6 min-w-6',
    errorIcon: 'h-3 w-3 shrink-0 mx-[0.3rem]',
    errorBanner:
      'rounded-lg flex-auto max-w-[min(50rem,90vw)] mr-1 [&_details]:max-h-full [&:has(details[open])]:h-[min(50vh,16rem)]  overflow-auto resize max-h-full',
  },
  variants: {
    isRetrying: {
      true: {
        trigger: 'text-orange-700',
        errorIcon: 'text-orange-600',
        errorBanner: '',
      },
      false: {
        trigger: 'text-red-500',
        errorIcon: 'text-red-500/90',
        errorBanner: '',
      },
    },
    hasStack: {
      true: {
        trigger: '',
        errorIcon: '',
        errorBanner: '',
      },
      false: {
        trigger: '',
        errorIcon: '',
        errorBanner: '',
      },
    },
    isLargeError: {
      true: {
        trigger: '',
        errorIcon: '',
        errorBanner: '',
      },
      false: {
        trigger: '',
        errorIcon: '',
        errorBanner: '',
      },
    },
  },
  compoundVariants: [
    {
      isLargeError: false,
      hasStack: false,
      isRetrying: false,
      className: {
        errorBanner: 'w-lg',
      },
    },
    {
      isLargeError: false,
      hasStack: false,
      isRetrying: true,
      className: {
        errorBanner: 'w-lg',
      },
    },
  ],
  defaultVariants: {
    isRetrying: false,
  },
});
export function Failure({
  message,
  restate_code,
  className,
  isRetrying,
}: {
  restate_code?: string;
  message: string;
  className?: string;
  isRetrying?: boolean;
}) {
  const error = useMemo(
    () => new RestateError(message, restate_code),
    [message, restate_code]
  );
  const hasStack = error?.message.includes('\n');
  const isLargeError = error?.message.length > 200;
  const { trigger, errorIcon, errorBanner } = failureStyle({
    isRetrying,
    hasStack,
    isLargeError,
  });

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="secondary"
          className={trigger({ className })}
          disabled={!error}
        >
          <Icon
            name={isRetrying ? IconName.TriangleAlert : IconName.CircleX}
            className={errorIcon()}
          />
          <span className="truncate min-w-0 block mr-1">{restate_code}</span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3 w-3 text-gray-500 shrink-0 mr-1"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <DropdownSection title="Failure">
          <ErrorBanner
            error={error}
            wrap={hasStack}
            className={errorBanner()}
          />
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}
