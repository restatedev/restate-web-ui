import type {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api';
import { Ellipsis } from '@restate/ui/loading';
import {
  formatDateTime,
  formatDurations,
  formatRange,
} from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { DOMAttributes, ReactElement } from 'react';
import { useJournalContext } from './JournalContext';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  CommandEntryType,
  EventEntryType,
  NotificationEntryType,
} from './entries/types';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { isEntryCompletionAmbiguous } from './entries/isEntryCompletionAmbiguous';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';

const entryTooltipStyles = tv({
  base: 'flex h-full',
});
export function EntryTooltip({
  className,
  children,
  entry,
  invocation,
}: {
  entry?: JournalEntryV2;
  invocation?: Invocation;
  className?: string;
  children: ReactElement<DOMAttributes<HTMLElement>, string>;
}) {
  if (!entry) {
    return children;
  }

  return (
    <HoverTooltip
      content={<EntryContent entry={entry} invocation={invocation} />}
      className={entryTooltipStyles({ className })}
      size="lg"
    >
      {children}
    </HoverTooltip>
  );
}

function EntryContent({
  entry,
  invocation,
}: {
  entry: JournalEntryV2;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
}) {
  const isPoint = !entry.end && !entry.isPending;
  const { isAmbiguous: entryCompletionIsAmbiguous, invocationIspaused } =
    isEntryCompletionAmbiguous(entry, invocation);
  const inProgress =
    entry?.isPending &&
    !entryCompletionIsAmbiguous &&
    (!entry.isRetrying || invocation?.status !== 'backing-off');
  const isFinished = !!entry.end;
  const { end } = useJournalContext();
  const categoryTitles: Record<string, string> =
    entry.category === 'command'
      ? ENTRY_COMMANDS_TITLES
      : entry.category === 'notification'
        ? ENTRY_NOTIFICATIONS_TITLES
        : entry.category === 'event'
          ? ENTRY_EVENTS_TITLES
          : {};
  const title = categoryTitles[String(entry.type)];
  return (
    <div className="flex flex-col gap-3">
      <div className="text-base font-semibold">{title}</div>

      <div className="flex gap-5 font-medium">
        <div className="text-right font-normal">
          <div className="flex items-center gap-2">
            {entry.type === 'Scheduled' && entry.end ? (
              <div className="opacity-80">
                {formatDateTime(new Date(String(entry.end)), 'system')}
              </div>
            ) : (
              <>
                {isPoint && (
                  <div className="opacity-80">
                    {formatDateTime(new Date(String(entry.start)), 'system')}
                  </div>
                )}
                {isFinished && (
                  <div className="opacity-80">
                    {formatRange(
                      new Date(String(entry.start)),
                      new Date(String(entry.end)),
                    )}
                  </div>
                )}
                {(entry.isPending || entryCompletionIsAmbiguous) && (
                  <div className="flex items-center gap-1 opacity-80">
                    {`${formatDateTime(
                      new Date(String(entry.start)),
                      'system',
                    )} – `}
                    {entryCompletionIsAmbiguous ? (
                      <span className="flex items-center gap-1">
                        <Icon
                          name={
                            invocationIspaused
                              ? IconName.Pause
                              : IconName.ClockAlert
                          }
                          className="h-3.5 w-3.5"
                        />
                        {invocationIspaused
                          ? 'Paused!'
                          : 'Completion not detected!'}
                      </span>
                    ) : (
                      <>
                        now
                        {inProgress && <Ellipsis> </Ellipsis>}
                      </>
                    )}
                  </div>
                )}

                {entry.start &&
                  (entry.end || entry.isPending) &&
                  !entryCompletionIsAmbiguous && (
                    <div className="font-semibold">
                      (
                      {formatDurations(
                        getDuration(
                          new Date(entry.end || end).getTime() -
                            new Date(entry.start).getTime(),
                        ),
                      )}
                      )
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ENTRY_COMMANDS_TITLES: {
  [K in CommandEntryType]: string;
} = {
  Input: '',
  GetState: 'Get State',
  GetEagerState: 'Get Eager State',
  SetState: 'Set State',
  GetStateKeys: 'Get State Keys',
  GetEagerStateKeys: 'Get Eager State Keys',
  ClearState: 'Clear State',
  ClearAllState: 'Clear All State',
  Call: 'Call',
  Run: 'Run',
  Output: 'Output',
  OneWayCall: 'Send',
  Sleep: 'Sleep',
  CompleteAwakeable: 'Complete Awakeable',
  Awakeable: 'Awakeable',
  AttachInvocation: 'Attach',
  Cancel: 'Cancel',
  GetPromise: 'Get Promise',
  PeekPromise: 'Peek Promise',
  CompletePromise: 'Complete Promise',
};
const ENTRY_NOTIFICATIONS_TITLES: {
  [K in NotificationEntryType]: string;
} = {
  Call: 'Call completion at',
  Run: 'Run completion at',
  CallInvocationId: '',
  Sleep: 'Sleep  completion at',
  CompleteAwakeable: 'Awakeable completion at',
  AttachInvocation: 'Attach completion at',
  Cancel: 'Cancel signal',
  GetPromise: 'Get Promise completion at',
  PeekPromise: 'Peek Promise completion at',
  CompletePromise: 'Complete Promise completion at',
};

export const ENTRY_EVENTS_TITLES: {
  [K in EventEntryType]: string;
} = {
  TransientError: 'Retryable error at',
  Created: 'Created at',
  Running: 'Running',
  Retrying: 'Next retry at',
  Scheduled: 'Scheduled to run at',
  Suspended: 'Suspended',
  Pending: 'Pending',
  Completion: '',
};
