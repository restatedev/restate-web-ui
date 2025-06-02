import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api/spec';

type LifeCycleEvent =
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Pending'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Suspended'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Running'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Created'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Scheduled'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Retrying'; category?: 'event' }>;

export function lifeCycles(
  entries: JournalEntryV2[],
  invocation?: Invocation
): LifeCycleEvent[] {
  if (!invocation) {
    return [];
  }

  const events: LifeCycleEvent[] = [];
  const isCompleted = ['succeeded', 'failed', 'killed', 'cancelled'].includes(
    invocation.status
  );

  events.push({
    type: 'Created',
    start: invocation.created_at,
    category: 'event',
    end: invocation.completed_at,
    isPending: !isCompleted,
    index: -4,
  });

  if (invocation.inboxed_at) {
    events.push({
      type: 'Pending',
      start: invocation.inboxed_at,
      category: 'event',
      end: invocation.completed_at,
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
  if (invocation.running_at) {
    events.push({
      type: 'Running',
      start: invocation.running_at,
      category: 'event',
      end: undefined,
      isPending: invocation.status === 'running',
    });
  }
  if (
    invocation.last_start_at &&
    invocation.retry_count &&
    invocation.retry_count > 1
  ) {
    events.push({
      type: 'Retrying',
      start: invocation.last_start_at,
      category: 'event',
      end: invocation.next_retry_at,
      isPending: invocation.status === 'backing-off',
    });
  }

  return events;
}
