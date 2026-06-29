import {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api-spec';
import { event } from './event';

type LifeCycleEvent =
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Pending'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Killed'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Suspended'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Running'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Created'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Scheduled'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Paused'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Queued'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Retrying'; category?: 'event' }>;

export function lifeCycles(
  eventRawEntries: JournalRawEntry[],
  allocateSyntheticIndex: () => number,
  invocation?: Invocation,
  vqueue?: { first_runnable_at?: string; first_attempt_at?: string },
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
  if (vqueue?.first_runnable_at) {
    events.push({
      type: 'Queued',
      start: vqueue.first_runnable_at,
      category: 'event',
      end: vqueue.first_attempt_at,
      isPending:
        !vqueue.first_attempt_at &&
        new Date(vqueue.first_runnable_at).getTime() <= Date.now(),
      index: -1,
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
  if (invocation.status === 'killed') {
    events.push({
      type: 'Killed',
      start: invocation.completed_at,
      category: 'event',
      end: undefined,
      isPending: false,
    });
  }
  const suspendedRawEntries = eventRawEntries.filter(
    (entry) => entry.entry_type === 'Event: Suspended',
  );
  if (suspendedRawEntries.length > 0) {
    suspendedRawEntries.forEach((suspendedRawEntry, index, arr) => {
      const isLast = index === arr.length - 1;
      const isPending = isLast && invocation.status === 'suspended';
      const suspendedEntry = event(
        suspendedRawEntry,
        [],
        invocation,
      ) as Extract<
        JournalEntryV2,
        { type?: 'Event: Suspended'; category?: 'event' }
      >;
      events.push({
        type: 'Suspended',
        start: suspendedEntry?.start,
        category: 'event',
        end: undefined,
        isPending,
        // Live suspension → use the invocation's current waiting future, which
        // reflects the actual outstanding awaits. Historical events keep their
        // own snapshot. `isPending` tells consumers which case we're in.
        awaitingOn: isPending
          ? invocation.suspended_waiting_future_json
          : suspendedEntry?.awaitingOn,
        afterJournalEntryIndex: suspendedEntry?.afterJournalEntryIndex,
        index: allocateSyntheticIndex(),
      });
    });
  } else if (invocation.status === 'suspended') {
    events.push({
      type: 'Suspended',
      start: invocation.modified_at,
      category: 'event',
      end: undefined,
      isPending: true,
      awaitingOn: invocation.suspended_waiting_future_json,
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
          stack: pausedErrorEntry?.stack,
          code: pausedErrorEntry?.code,
          relatedCommandName: pausedErrorEntry?.relatedCommandName,
          relatedCommandType: pausedErrorEntry?.relatedCommandType,
          relatedRestateErrorCode: pausedErrorEntry?.relatedRestateErrorCode,
          relatedCommandIndex: pausedErrorEntry?.relatedCommandIndex,
          afterJournalEntryIndex: pausedErrorEntry?.afterJournalEntryIndex,
          index: allocateSyntheticIndex(),
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
      awaitingOn:
        invocation.status === 'running'
          ? invocation.last_awaiting_on_future_json
          : undefined,
    });
  }
  if (invocation.next_retry_at && invocation.status === 'backing-off') {
    events.push({
      type: 'Retrying',
      category: 'event',
      start: invocation.next_retry_at,
      isPending: false,
      awaitingOn: invocation.last_awaiting_on_future_json,
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
