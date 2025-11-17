import { ReactNode } from 'react';
import { IconName } from '@restate/ui/icons';
import { InlineTooltip } from '@restate/ui/tooltip';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { OperationType } from './types';

export interface OperationConfig {
  title: string;
  icon: IconName;
  iconClassName: string;
  submitVariant: 'primary' | 'destructive';
  description: (
    count: number,
    isLowerBound: boolean,
    duration: string,
  ) => ReactNode;
  alertType?: 'warning' | 'info';
  alertContent?: string;
  submitText: string;
  formMethod: 'POST';
  formAction: string;
  progressTitle: string;
  completedText: string;
  emptyMessage: string;
}

export const OPERATION_CONFIG: Record<OperationType, OperationConfig> = {
  cancel: {
    title: 'Cancel Invocations',
    submitText: 'Cancel',
    icon: IconName.Cancel,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    formMethod: 'POST',
    formAction: '/query/invocations/cancel',
    description: (count, isLowerBound, duration) => (
      <p>
        Are you sure you want to cancel{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>
        ?
      </p>
    ),
    alertType: 'info',
    alertContent:
      'Cancellation frees held resources, cooperates with your handler code to roll back changes, and allows proper cleanup. It is non-blocking, so the call may return before cleanup finishes. In rare cases, cancellation may not take effect, retry the operation if needed.',
    progressTitle: 'Cancelling invocations',
    completedText: 'Cancelled',
    emptyMessage:
      'No invocations match your criteria. Only non-completed invocations can be cancelled.',
  },
  pause: {
    title: 'Pause Invocations',
    submitText: 'Pause',
    icon: IconName.Pause,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    formMethod: 'POST',
    formAction: '/query/invocations/pause',
    description: (count, isLowerBound, duration) => (
      <p>
        Are you sure you want to pause{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>
        ? The pause may not take effect right away.
      </p>
    ),
    alertType: 'info',
    alertContent:
      'Paused invocations will stop executing until manually resumed.',
    progressTitle: 'Pausing invocations',
    completedText: 'Paused',
    emptyMessage:
      'No invocations match your criteria. Only running invocations can be paused.',
  },
  resume: {
    title: 'Resume Invocations',
    submitText: 'Resume',
    icon: IconName.Resume,
    submitVariant: 'primary',
    iconClassName: '',
    formMethod: 'POST',
    formAction: '/query/invocations/resume',
    description: (count, isLowerBound, duration) => (
      <p>
        You're about to resume{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>
        . Should each keep its current deployment or switch to the latest?
      </p>
    ),
    progressTitle: 'Resuming invocations',
    completedText: 'Resumed',
    emptyMessage:
      'No invocations match your criteria. Only paused invocations can be resumed.',
  },
  kill: {
    title: 'Kill Invocations',
    submitText: 'Kill',
    icon: IconName.Kill,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    formMethod: 'POST',
    formAction: '/query/invocations/kill',
    description: (count, isLowerBound, duration) => (
      <p>
        Are you sure you want to kill{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>
        ?
      </p>
    ),
    alertType: 'warning',
    alertContent:
      'Killing immediately stops all calls in the invocation tree without executing compensation logic. This may leave your service in an inconsistent state. Only use as a last resort after trying other fixes.',
    progressTitle: 'Killing invocations',
    completedText: 'Killed',
    emptyMessage:
      'No invocations match your criteria. Only non-completed invocations can be killed.',
  },
  purge: {
    title: 'Purge Invocations',
    icon: IconName.Trash,
    iconClassName: 'text-red-400',
    submitText: 'Purge',
    submitVariant: 'destructive',
    formMethod: 'POST',
    formAction: '/query/invocations/purge',
    description: (count, isLowerBound, duration) => (
      <p>
        Are you sure you want to purge{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>
        ?
      </p>
    ),
    alertType: 'info',
    alertContent:
      'After an invocation completes, it will be retained by Restate for some time, in order to introspect it and, in case of idempotent requests, to perform deduplication.',
    progressTitle: 'Purging invocations',
    completedText: 'Purged',
    emptyMessage:
      'No invocations match your criteria. Only completed invocations can be purged.',
  },
};
