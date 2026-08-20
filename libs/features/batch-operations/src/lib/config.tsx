import { ReactNode } from 'react';
import { IconName } from '@restate/ui/icons';
import { InlineTooltip } from '@restate/ui/tooltip';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { OperationType } from './types';
import { FilterItem } from '@restate/data-access/admin-api-spec';

export interface OperationConfig {
  title: string;
  icon: IconName;
  iconClassName: string;
  submitVariant: 'primary' | 'destructive';
  description: (
    count: number | undefined,
    isLowerBound: boolean,
    duration: string,
    params:
      | {
          invocationIds: string[];
        }
      | {
          filters: (FilterItem & { isActionImplicitFilter?: boolean })[];
        },
  ) => ReactNode;
  alertType?: 'warning' | 'info';
  alertContent?: string;
  submitText: string;
  formMethod: 'POST';
  formAction: string;
  progressTitle: string;
  completedText: string;
  emptyMessage: (hasVqueues: boolean) => string;
}

function invocationCount(
  count: number | undefined,
  isLowerBound: boolean,
  duration: string,
  params: Parameters<OperationConfig['description']>[3],
) {
  const sampledWithoutMatches = count === 0 && isLowerBound;
  const label = (
    <span className="font-medium text-gray-700">
      {count === undefined ? (
        <span
          role="status"
          aria-label="Loading invocation count"
          className="inline-block h-[0.8em] w-[3.5em] animate-pulse rounded-sm bg-gray-300 align-[-0.05em]"
        />
      ) : sampledWithoutMatches ? null : (
        <>
          {formatNumber(count, true)}
          {isLowerBound ? '+' : ''}
        </>
      )}{' '}
      {count === undefined
        ? 'invocations'
        : formatPlurals(count, {
            one: 'invocation',
            other: 'invocations',
          })}
    </span>
  );
  if (count === undefined) return label;
  return (
    <InlineTooltip
      description={
        sampledWithoutMatches
          ? `The sample found no matching invocations ${duration}, but matching invocations may still exist.`
          : isLowerBound
            ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
            : `This count was calculated ${duration} and may have changed.`
      }
      variant="inline-help"
      className="[&_button]:invisible"
      visible={'filters' in params}
    >
      {label}
    </InlineTooltip>
  );
}

export const OPERATION_CONFIG: Record<OperationType, OperationConfig> = {
  cancel: {
    title: 'Cancel Invocations',
    submitText: 'Confirm',
    icon: IconName.Cancel,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    formMethod: 'POST',
    formAction: '/query/invocations/cancel',
    description: (count, isLowerBound, duration, params) => (
      <p>
        Are you sure you want to cancel{' '}
        {invocationCount(count, isLowerBound, duration, params)}{' '}
        {'filters' in params && params.filters?.length > 0
          ? 'matching the following criteria?'
          : '?'}
      </p>
    ),
    alertType: 'info',
    alertContent:
      'Cancellation frees held resources, cooperates with your handler code to roll back changes, and allows proper cleanup. It is non-blocking, so the call may return before cleanup finishes. In rare cases, cancellation may not take effect, retry the operation if needed.',
    progressTitle: 'Cancelling invocations',
    completedText: 'Cancelled',
    emptyMessage: () => 'Only in-flight invocations can be cancelled.',
  },
  pause: {
    title: 'Pause Invocations',
    submitText: 'Pause',
    icon: IconName.Pause,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    formMethod: 'POST',
    formAction: '/query/invocations/pause',
    description: (count, isLowerBound, duration, params) => (
      <p>
        Are you sure you want to pause{' '}
        {invocationCount(count, isLowerBound, duration, params)}{' '}
        {'filters' in params && params.filters?.length > 0
          ? 'matching the following criteria?'
          : '?'}{' '}
        The pause may not take effect right away.
      </p>
    ),
    alertType: 'info',
    alertContent:
      'Paused invocations will stop executing until manually resumed.',
    progressTitle: 'Pausing invocations',
    completedText: 'Paused',
    emptyMessage: (hasVqueues) =>
      hasVqueues
        ? 'Only running or suspended invocations can be paused.'
        : 'Only running invocations can be paused.',
  },
  'restart-as-new': {
    title: 'Restart as New Invocations',
    submitText: 'Restart',
    icon: IconName.Restart,
    submitVariant: 'primary',
    iconClassName: '',
    formMethod: 'POST',
    formAction: '/query/invocations/restart-as-new',
    description: (count, isLowerBound, duration, params) => (
      <p>
        Are you sure you want to restart{' '}
        {invocationCount(count, isLowerBound, duration, params)}{' '}
        {'filters' in params && params.filters?.length > 0
          ? 'as new matching the following criteria?'
          : ' as new?'}
      </p>
    ),
    alertType: 'info',
    alertContent:
      'Creates a new invocation with the same input (if any) as the original leaving the original unchanged. The new invocation will have a different ID',
    progressTitle: 'Restarting invocations',
    completedText: 'Restarted',
    emptyMessage: () => 'Only completed invocations can be restarted.',
  },
  resume: {
    title: 'Resume Invocations',
    submitText: 'Resume',
    icon: IconName.Resume,
    submitVariant: 'primary',
    iconClassName: '',
    formMethod: 'POST',
    formAction: '/query/invocations/resume',
    description: (count, isLowerBound, duration, params) => (
      <p>
        You're about to resume{' '}
        {invocationCount(count, isLowerBound, duration, params)}{' '}
        {'filters' in params && params.filters?.length > 0
          ? 'matching the following criteria.'
          : '.'}
      </p>
    ),
    progressTitle: 'Resuming invocations',
    completedText: 'Resumed',
    emptyMessage: () => 'Only paused invocations can be resumed.',
  },
  'retry-now': {
    title: 'Retry Invocations now',
    submitText: 'Retry',
    icon: IconName.RetryNow,
    iconClassName: '',
    submitVariant: 'primary',
    formMethod: 'POST',
    formAction: '/query/invocations/resume',
    description: (count, isLowerBound, duration, params) => (
      <p>
        Are you sure you want to retry{' '}
        {invocationCount(count, isLowerBound, duration, params)}{' '}
        {'filters' in params && params.filters?.length > 0
          ? 'matching the following criteria now?'
          : ' now?'}
      </p>
    ),
    alertType: 'info',
    alertContent:
      'These invocations are backing off after a failed attempt. Retrying triggers a new attempt immediately instead of waiting for the next scheduled retry, keeping their current deployment.',
    progressTitle: 'Retrying invocations',
    completedText: 'Retried',
    emptyMessage: () => 'Only backing-off invocations can be retried.',
  },
  kill: {
    title: 'Kill Invocations',
    submitText: 'Kill',
    icon: IconName.Kill,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    formMethod: 'POST',
    formAction: '/query/invocations/kill',
    description: (count, isLowerBound, duration, params) => (
      <p>
        Are you sure you want to kill{' '}
        {invocationCount(count, isLowerBound, duration, params)}{' '}
        {'filters' in params && params.filters?.length > 0
          ? 'matching the following criteria?'
          : '?'}
      </p>
    ),
    alertType: 'warning',
    alertContent:
      'Killing immediately stops all calls in the invocation tree without executing compensation logic. This may leave your service in an inconsistent state. Only use as a last resort after trying other fixes.',
    progressTitle: 'Killing invocations',
    completedText: 'Killed',
    emptyMessage: () => 'Only in-flight invocations can be killed.',
  },
  purge: {
    title: 'Purge Invocations',
    icon: IconName.Trash,
    iconClassName: 'text-red-400',
    submitText: 'Purge',
    submitVariant: 'destructive',
    formMethod: 'POST',
    formAction: '/query/invocations/purge',
    description: (count, isLowerBound, duration, params) => (
      <p>
        Are you sure you want to purge{' '}
        {invocationCount(count, isLowerBound, duration, params)}{' '}
        {'filters' in params && params.filters?.length > 0
          ? 'matching the following criteria?'
          : '?'}
      </p>
    ),
    alertType: 'info',
    alertContent:
      'After an invocation completes, it will be retained by Restate for some time, in order to introspect it and, in case of idempotent requests, to perform deduplication.',
    progressTitle: 'Purging invocations',
    completedText: 'Purged',
    emptyMessage: () => 'Only completed invocations can be purged.',
  },
};
