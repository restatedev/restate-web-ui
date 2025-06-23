import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { ENTRY_EVENTS_TITLES } from '../EntryTooltip';

export function LifeCycle({
  entry,
  invocation,
}: EntryProps<
  | Extract<JournalEntryV2, { type?: 'Created'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Pending'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Scheduled'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Suspended'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Running'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Retrying'; category?: 'event' }>
>) {
  return (
    <div className="text-zinc-500 font-sans mr-2">
      {{ ...ENTRY_EVENTS_TITLES }[String(entry.type)]}
    </div>
  );
}
