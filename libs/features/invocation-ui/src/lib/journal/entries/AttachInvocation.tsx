import { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { EntryProps } from './types';
import { InvocationId } from '../../InvocationId';
import { EntryExpression } from './EntryExpression';
import { tv } from '@restate/util-styles';
import { ExpandInvocationButton } from './ExpandInvocationButton';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

const styles = tv({
  base: 'relative flex flex-auto flex-row items-center gap-1.5',
});

export function AttachInvocation({
  entry,
  invocation,
  className,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'AttachInvocation'; category?: 'command' }>
>) {
  return (
    <>
      <div className={styles({ className })}>
        <EntryExpression
          entry={entry}
          invocation={invocation}
          input={
            <InvocationId
              id={String(entry.invocationId)}
              className="mx-0.5 max-w-[15ch] truncate text-2xs font-semibold text-muted not-italic"
              size="md"
            />
          }
          output={
            <LazyJournalEntryPayload.Value
              invocationId={invocation?.id}
              entry={entry}
              title="Result"
              isBase64
              hideWhenEntryIsPending
            />
          }
        />
      </div>
      <ExpandInvocationButton
        invocationId={entry.invocationId}
        parentInvocationId={invocation?.id}
      />
    </>
  );
}
