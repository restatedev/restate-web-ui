import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { RestateError } from '@restate/util/errors';
import { useMemo } from 'react';
import { tv } from '@restate/util/styles';
const failureStyle = tv({
  base: '',
  slots: {
    trigger:
      'flex h-5 max-w-[50ch] min-w-6 items-center gap-0 rounded-full border bg-white/70 px-0 py-0 pl-0.5 text-2xs shadow-none',
    errorIcon: 'mr-[0.3rem] ml-[0.15rem] h-3 w-3 shrink-0',
    errorBanner:
      'max-h-full w-[min(80rem,90vw)] max-w-[min(80rem,90vw)] flex-auto resize overflow-auto rounded-xl',
  },
  variants: {
    isRetrying: {
      true: {
        trigger: 'text-orange-700',
        errorIcon: 'text-orange-600',
        errorBanner: '',
      },
      false: {
        trigger: 'text-red-600',
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
    isTransient: {
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
    hasLongMetadata: {
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
      hasLongMetadata: false,
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
  title = isRetrying ? 'Transient failure' : 'Failure',
  stacktrace,
  metadata,
}: {
  restate_code?: string;
  message: string;
  stacktrace?: string;
  className?: string;
  isRetrying?: boolean;
  title?: string;
  metadata?: Array<{ key: string; value: string }>;
}) {
  const error = useMemo(
    () =>
      new RestateError(
        message,
        restate_code,
        isRetrying,
        stacktrace,
        undefined,
        undefined,
        metadata,
      ),
    [message, restate_code, isRetrying, stacktrace, metadata],
  );
  const hasStack = error?.message.includes('\n') || !!stacktrace;
  const isLargeError = error?.message.length > 200;
  const hasLongMetadata = (metadata ?? []).some(
    ({ key, value }) =>
      key.length > 28 || value.length > 60 || value.includes('\n'),
  );
  const { trigger, errorIcon, errorBanner } = failureStyle({
    isRetrying,
    hasStack,
    isLargeError,
    hasLongMetadata,
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
          <span className="block min-w-0 truncate">{error.message}</span>
          <span className="block w-1 min-w-0" />
          <Icon
            name={IconName.ChevronsUpDown}
            className="mr-1 h-3 w-3 shrink-0 text-gray-500"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <DropdownSection title={title}>
          <ErrorBanner
            error={error}
            className={errorBanner()}
            isTransient={isRetrying}
          />
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}
