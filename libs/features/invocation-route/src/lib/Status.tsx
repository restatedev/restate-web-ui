import {
  Invocation,
  InvocationComputedStatus2,
} from '@restate/data-access/admin-api';
import { useGetPausedError } from '@restate/data-access/admin-api-hooks';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { RestateError } from '@restate/util/errors';
import { tv } from '@restate/util/styles';
import { formatOrdinals } from '@restate/util/intl';
import { Ellipsis } from '@restate/ui/loading';
import { StatusTimeline } from './StatusTimeline';

export function getRestateError(invocation?: Invocation) {
  if (!invocation) {
    return undefined;
  }
  const message = invocation.last_failure ?? invocation.completion_failure;
  return message
    ? new RestateError(
        message,
        invocation.last_failure_error_code,
        !invocation.completion_failure,
      )
    : undefined;
}

function getBadgeVariant(
  status: InvocationComputedStatus2,
  isRetrying?: boolean,
) {
  if (isRetrying) {
    return 'warning';
  }
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'pending':
    case 'paused':
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
  base: 'relative inline-flex max-w-full gap-2',
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
        'border-dashed border-orange-300/90 bg-transparent text-orange-700',
      scheduled: 'border-dashed border-zinc-400/60 bg-transparent',
      ready: 'border-dashed border-zinc-300 bg-transparent text-zinc-500',
      running: 'border-dashed',
      suspended: 'border-dashed border-zinc-400/60 bg-zinc-200/40',
      succeeded: '',
      failed: 'py-0.5 pr-0.5',
      cancelled: '',
      killed: '',
      'backing-off': '',
      paused: 'border-dashed',
    },
    isRetrying: {
      true: 'border border-dashed border-orange-300/80 py-0.5 pr-0.5',
      false: '',
    },
    hasPausedError: {
      true: 'py-0.5 pr-0.5',
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
  paused: 'Paused',
};

export function Status({
  invocation,
  className,
}: {
  invocation: Invocation;
  className?: string;
}) {
  const { status } = invocation;
  const isPaused = status === 'paused';
  const { data: pausedErrorData } = useGetPausedError(invocation.id, {
    enabled: isPaused,
    refetchOnMount: true,
    staleTime: 0,
  });
  const pausedError =
    isPaused && pausedErrorData?.message
      ? new RestateError(
          pausedErrorData.message,
          pausedErrorData.relatedRestateErrorCode,
          true,
          pausedErrorData.stack,
        )
      : undefined;
  const hasPausedError = Boolean(pausedError) && invocation.status === 'paused';
  const variant = getBadgeVariant(status, invocation.isRetrying);
  const error = getRestateError(invocation);
  return (
    <div className="flex flex-row flex-wrap items-baseline gap-0.5">
      <Badge
        variant={variant}
        className={styles({
          className,
          status,
          isRetrying: Boolean(invocation.isRetrying),
          hasPausedError,
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
        {hasPausedError && (
          <LastError
            isRetrying
            isFailed={false}
            error={pausedError}
            popoverTitle="Paused error"
            label="after…"
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
      'flex h-5 items-center gap-1 truncate rounded-md border-gray-200/80 bg-white/70 px-1.5 py-0.5 text-2xs shadow-none',
    errorIcon: 'h-3 w-3 shrink-0',
    errorBanner:
      'max-h-full max-w-[min(80rem,90vw)] flex-auto resize overflow-auto rounded-xl [&_.error]:max-h-72',
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
});

const ERROR_CODE_REGEXP = /^\[(?<restate_code>\d+)\]/;
export function LastError({
  isRetrying,
  isFailed,
  error,
  attemptCount = 0,
  popoverTitle,
  label,
}: {
  isRetrying: boolean;
  isFailed: boolean;
  error?: RestateError;
  attemptCount?: number;
  popoverTitle?: string;
  label?: string;
}) {
  const hasStack = error?.message.includes('\n') || !!error?.stack;
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
          {label ? (
            <span className="truncate">{label}</span>
          ) : isFailed ? (
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
              className="h-3 w-3 shrink-0 text-gray-500"
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
            isTransient={isRetrying}
          />
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}
