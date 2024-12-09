import {
  Invocation,
  InvocationComputedStatus,
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

function getError(invocation: Invocation) {
  const message = invocation.last_failure ?? invocation.completion_failure;
  return message
    ? new RestateError(message, invocation.last_failure_error_code)
    : undefined;
}

function getBadgeVariant(status: InvocationComputedStatus) {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'retrying':
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
      pending: 'border-dashed bg-transparent border-zinc-300 text-zinc-500',
      scheduled: 'border-dashed bg-transparent border-zinc-300',
      ready: 'border-dashed bg-transparent border-zinc-300 text-zinc-500',
      running: 'border-dashed',
      suspended: 'border-dashed border-zinc-300',
      succeeded: '',
      failed: 'pr-0.5 py-0.5',
      cancelled: '',
      killed: '',
      retrying: 'border-dashed border border-orange-200 pr-0.5 py-0.5',
    },
  },
});

const STATUS_LABEL: Record<InvocationComputedStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  ready: 'Ready',
  running: 'Running',
  suspended: 'Suspended',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
  killed: 'Killed',
  retrying: 'Retrying',
};

export function Status({
  invocation,
  className,
}: {
  invocation: Invocation;
  className?: string;
}) {
  const { status } = invocation;
  const variant = getBadgeVariant(status);
  const error = getError(invocation);

  return (
    <div className="flex items-center flex-wrap flex-row gap-0.5">
      <Badge
        variant={variant}
        className={styles({
          className,
          status,
          variant,
        })}
      >
        <Ellipsis visible={['running', 'retrying'].includes(status)}>
          {STATUS_LABEL[status]}
        </Ellipsis>
        {['retrying', 'failed'].includes(status) && (
          <LastError
            isRetrying={status === 'retrying'}
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
  },
  variants: {
    isRetrying: {
      true: {
        trigger: 'text-orange-700',
        errorIcon: 'text-orange-600',
      },
      false: { trigger: 'text-red-500', errorIcon: 'text-red-500/90' },
    },
  },
});

const ERROR_CODE_REGEXP = /^\[(?<restate_code>\d+)\]/;
function LastError({
  isRetrying,
  isFailed,
  error,
  attemptCount = 0,
}: {
  isRetrying: boolean;
  isFailed: boolean;
  error?: RestateError;
  attemptCount?: number;
}) {
  const { trigger, errorIcon } = lastErrorStyles({ isRetrying });
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
      <PopoverContent className="max-w-lg">
        <DropdownSection
          title={isFailed ? 'Completion failure' : 'Last failure'}
        >
          <ErrorBanner
            error={error}
            className="rounded-lg [&_details]:max-h-[min(10rem,30vh)]"
          />
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}
