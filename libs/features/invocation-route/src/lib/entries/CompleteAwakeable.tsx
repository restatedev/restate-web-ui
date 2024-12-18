import { CompleteAwakeableJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { TruncateWithTooltip } from '@restate/ui/tooltip';

export function CompleteAwakeable({
  entry,
  failed,
  invocation,
}: EntryProps<CompleteAwakeableJournalEntryType>) {
  return (
    <Expression
      name={'awakeable'}
      prefix="await"
      input={
        <div className="basis-0 not-italic max-w-fit text-zinc-500 grow min-w-0 flex text-2xs items-center px-[0.3ch]">
          "<TruncateWithTooltip>{entry.id}</TruncateWithTooltip>"
        </div>
      }
      output={
        <>
          {typeof entry.value === 'string' && (
            <InputOutput
              name={entry.value}
              popoverTitle="Value"
              popoverContent={
                <Value value={entry.value} className="text-xs font-mono py-3" />
              }
            />
          )}
          {typeof entry.value === 'undefined' && !entry.failure && (
            <div className="text-zinc-400 font-semibold font-mono text-2xs">
              void
            </div>
          )}
          {entry.failure?.message && (
            <Failure
              message={entry.failure.message}
              restate_code={entry.failure.restate_code}
            />
          )}
        </>
      }
    />
  );
}
