import {
  Invocation,
  InvocationComputedStatus2,
} from '@restate/data-access/admin-api';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { RestateError } from '@restate/util/errors';
import { tv } from 'tailwind-variants';
import { formatOrdinals } from '@restate/util/intl';
import { Ellipsis } from '@restate/ui/loading';
import { StatusTimeline } from './StatusTimeline';

export function getRestateError(invocation?: Invocation) {
  if (!invocation) {
    return undefined;
  }
  const message = invocation.last_failure ?? invocation.completion_failure;
  return message
    ? new RestateError(message, invocation.last_failure_error_code)
    : undefined;
}

function getBadgeVariant(
  status: InvocationComputedStatus2,
  isRetrying?: boolean
) {
  if (isRetrying) {
    return 'warning';
  }
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'pending':
      return 'warning';
    case 'running':
      return 'info';
    case 'failed':
      return 'danger';

    default:
      return 'default';
  }
}

const styles = tv({
  base: 'max-w-full inline-flex gap-2 relative',
  variants: {
    variant: {
      success: '',
      danger: '',
      warning: '',
      default: 'bg-zinc-100',
      info: '',
    },
    status: {
      pending:
        'border-dashed bg-transparent border-orange-300/90 text-orange-700',
      scheduled: 'border-dashed bg-transparent border-zinc-400/60',
      ready: 'border-dashed bg-transparent border-zinc-300 text-zinc-500',
      running: 'border-dashed',
      suspended: 'border-dashed border-zinc-400/60 bg-zinc-200/40',
      succeeded: '',
      failed: 'pr-0.5 py-0.5',
      cancelled: '',
      killed: '',
      'backing-off': '',
    },
    isRetrying: {
      true: 'border-dashed border border-orange-300/80 pr-0.5 py-0.5',
      false: '',
    },
  },
});

const STATUS_LABEL: Record<InvocationComputedStatus2, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  ready: 'Ready',
  running: 'Running',
  suspended: 'Suspended',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
  killed: 'Killed',
  'backing-off': 'Backing-off',
};

export function Status({
  invocation,
  className,
}: {
  invocation: Invocation;
  className?: string;
}) {
  const { status } = invocation;
  const variant = getBadgeVariant(status, invocation.isRetrying);
  const error = getRestateError(invocation);

  return (
    <div className="flex items-baseline flex-wrap flex-row gap-0.5">
      <Badge
        variant={variant}
        className={styles({
          className,
          status,
          isRetrying: Boolean(invocation.isRetrying),
          variant,
        })}
      >
        <Ellipsis visible={status === 'running'}>
          {STATUS_LABEL[status]}
        </Ellipsis>
        {(status === 'failed' || invocation.isRetrying) && (
          <LastError
            isRetrying={Boolean(invocation.isRetrying)}
            isFailed={status === 'failed'}
            error={error}
            attemptCount={invocation.retry_count}
          />
        )}
      </Badge>
      <StatusTimeline invocation={invocation} />
    </div>
  );
}

const lastErrorStyles = tv({
  base: '',
  slots: {
    trigger:
      'truncate bg-white/70 border-gray-200/80 px-1.5 py-0.5 flex rounded-md items-center gap-1 text-2xs h-5 shadow-none',
    errorIcon: 'h-3 w-3 shrink-0',
    errorBanner:
      'rounded-lg flex-auto  max-w-[min(50rem,90vw)] [&_details]:max-h-full [&:has(details[open])]:h-[min(50vh,16rem)]  overflow-auto resize  max-h-full',
  },
  variants: {
    isRetrying: {
      true: {
        trigger: 'text-orange-700',
        errorIcon: 'text-orange-600',
      },
      false: { trigger: 'text-red-500', errorIcon: 'text-red-500/90' },
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
        errorBanner: 'w-[32rem]',
      },
    },
    {
      isLargeError: false,
      hasStack: false,
      isRetrying: true,
      className: {
        errorBanner: 'w-[32rem]',
      },
    },
  ],
});

const ERROR_CODE_REGEXP = /^\[(?<restate_code>\d+)\]/;
export function LastError({
  isRetrying,
  isFailed,
  error,
  attemptCount = 0,
  popoverTitle,
}: {
  isRetrying: boolean;
  isFailed: boolean;
  error?: RestateError;
  attemptCount?: number;
  popoverTitle?: string;
}) {
  const hasStack = error?.message.includes('\n');
  const isLargeError = Boolean(error && error?.message.length > 200);
  const { trigger, errorIcon, errorBanner } = lastErrorStyles({
    isRetrying,
    hasStack,
    isLargeError,
  });
  const errorCode =
    error?.restate_code ??
    error?.message.match(ERROR_CODE_REGEXP)?.groups?.restate_code;

  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="secondary" className={trigger()} disabled={!error}>
          <Icon
            name={isRetrying ? IconName.TriangleAlert : IconName.CircleX}
            className={errorIcon()}
          />
          {isFailed ? (
            errorCode
          ) : (
            <span className="truncate">
              {formatOrdinals(attemptCount)}{' '}
              <span className="opacity2-80 font-normal">attempt</span>
            </span>
          )}
          {error && (
            <Icon
              name={IconName.ChevronsUpDown}
              className="h-3 w-3 text-gray-500 shrink-0"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <DropdownSection
          title={
            popoverTitle ?? (isFailed ? 'Completion failure' : 'Last failure')
          }
          className=""
        >
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
