import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { tv } from '@restate/util/styles';
import { EntryProgress, EntryProgressContainer } from './EntryProgress';

const styles = tv({
  base: 'relative flex flex-col items-center',
});

export function LifeCycleProgress({
  className,
  invocation,
  createdEvent,
  lifeCycleEntries,
}: {
  className?: string;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  createdEvent?: JournalEntryV2;
  lifeCycleEntries: JournalEntryV2[];
}) {
  return (
    <div className={styles({ className })}>
      <div className="relative mt-4 h-6 w-full">
        {createdEvent && (
          <EntryProgressContainer
            className="absolute top-1"
            entry={createdEvent}
            invocation={invocation}
          >
            <div className="h-6 w-full rounded-md" />
          </EntryProgressContainer>
        )}

        {lifeCycleEntries?.map((entry) => (
          <div
            className="absolute inset-0 top-2"
            data-entry-type={entry.type}
            key={entry.type + String(entry.start)}
          >
            <EntryProgress
              invocation={invocation}
              entry={entry}
              showDuration={false}
              className="*:h-3.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
