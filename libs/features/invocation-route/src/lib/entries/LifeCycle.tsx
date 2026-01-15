import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { ENTRY_EVENTS_ENTRY_LABELS } from '../EntryTooltip';
import { Badge } from '@restate/ui/badge';
import { Failure } from '../Failure';
export function LifeCycle({
  entry,
  invocation,
}: EntryProps<
  | Extract<JournalEntryV2, { type?: 'Created'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Pending'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Scheduled'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Killed'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Suspended'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Paused'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Running'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Retrying'; category?: 'event' }>
>) {
  const isPaused = entry.type === 'Paused';

  if (isPaused) {
    return (
      <div className="-order-1 mr-2 flex items-center gap-2 font-sans text-zinc-500">
        <span className="shrink-0">{ENTRY_EVENTS_ENTRY_LABELS['Paused']}</span>
        {entry.relatedCommandIndex === undefined ? (
          <Badge
            variant="warning"
            size="sm"
            className="gap-0 truncate px-0 py-0.5 font-sans text-2xs font-normal"
          >
            <Failure
              title="Last failure"
              restate_code={String(
                entry.relatedRestateErrorCode ||
                  entry.code ||
                  entry?.error?.restateCode ||
                  entry?.error?.code ||
                  '',
              )}
              stacktrace={entry?.stack || entry?.error?.stack}
              message={[entry.message, entry?.error?.message]
                .filter(Boolean)
                .join('\n\n')}
              isRetrying
              className="my-[-2px] ml-0 h-5 rounded-md border-none bg-transparent py-0 shadow-none hover:bg-orange-100 pressed:bg-orange-200/50"
            />
          </Badge>
        ) : null}
      </div>
    );
  }
  return (
    <div className="mr-2 flex gap-1 font-sans text-zinc-500">
      {{ ...ENTRY_EVENTS_ENTRY_LABELS }[String(entry.type)]}
    </div>
  );
}
