import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import { event } from './event';

type LifeCycleEvent =
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Pending'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Suspended'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Running'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Created'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Scheduled'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Paused'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Retrying'; category?: 'event' }>;

export function lifeCycles(
  eventRawEntries: JournalRawEntry[],
  indexCount: number,
  invocation?: Invocation,
): LifeCycleEvent[] {
  if (!invocation) {
    return [];
  }

  const events: LifeCycleEvent[] = [];

  events.push({
    type: 'Created',
    start: invocation.created_at,
    category: 'event',
    index: -4,
  });

  if (invocation.inboxed_at) {
    events.push({
      type: 'Pending',
      start: invocation.inboxed_at,
      category: 'event',
      end: invocation.running_at,
      isPending: invocation.status === 'pending',
      index: -2,
    });
  }
  if (invocation.scheduled_start_at) {
    events.push({
      type: 'Scheduled',
      start: invocation.scheduled_at,
      category: 'event',
      end: invocation.scheduled_start_at,
      isPending: invocation.status === 'scheduled',
      index: -3,
    });
  }
  if (invocation.completed_at) {
    events.push({
      type: 'Completion',
      start: invocation.completed_at,
      category: 'event',
      end: undefined,
      isPending: false, // TODO check if it's being delivered to PP
    });
  }
  if (invocation.status === 'suspended') {
    events.push({
      type: 'Suspended',
      start: invocation.modified_at,
      category: 'event',
      end: undefined,
      isPending: true,
    });
  }
  const hadPauseEntry = eventRawEntries.some(
    (entry) => entry.entry_type === 'Event: Paused',
  );
  if (invocation.status === 'paused' || hadPauseEntry) {
    eventRawEntries
      .filter((entry) => entry.entry_type === 'Event: Paused')
      .forEach((pausedErrorRawEntry, index, arr) => {
        const isLast = index === arr.length - 1;
        const isPending = isLast && invocation.status === 'paused';
        const pausedErrorEntry = pausedErrorRawEntry
          ? (event(pausedErrorRawEntry, [], invocation) as Extract<
              JournalEntryV2,
              { type?: 'Event: Paused'; category?: 'event' }
            >)
          : undefined;
        events.push({
          type: 'Paused',
          start: pausedErrorEntry?.start,
          category: 'event',
          end: undefined,
          isPending,
          message: pausedErrorEntry?.message,
          code: pausedErrorEntry?.code,
          relatedCommandName: pausedErrorEntry?.relatedCommandName,
          relatedCommandType: pausedErrorEntry?.relatedCommandType,
          relatedRestateErrorCode: pausedErrorEntry?.relatedRestateErrorCode,
          relatedCommandIndex: pausedErrorEntry?.relatedCommandIndex,
          index: indexCount + index,
        });
      });
  }

  if (invocation.running_at) {
    events.push({
      type: 'Running',
      start: invocation.running_at,
      category: 'event',
      end:
        invocation.status === 'running'
          ? undefined
          : invocation.status === 'suspended' ||
              invocation.status === 'ready' ||
              invocation.status === 'paused'
            ? invocation.modified_at
            : invocation.status === 'backing-off'
              ? datesMax(invocation.last_start_at, invocation.modified_at)
              : invocation.completed_at,
      isPending: invocation.status === 'running',
    });
  }
  if (invocation.next_retry_at && invocation.status === 'backing-off') {
    events.push({
      type: 'Retrying',
      category: 'event',
      start: invocation.next_retry_at,
    });
  }

  return events;
}

function datesMax(a?: string, b?: string) {
  try {
    return new Date(
      Math.max(new Date(a || 0).getTime(), new Date(b || 0).getTime()),
    ).toISOString();
  } catch (error) {
    return undefined;
  }
}
