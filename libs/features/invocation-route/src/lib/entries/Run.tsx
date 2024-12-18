import { RunJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { TruncateWithTooltip } from '@restate/ui/tooltip';

export function Run({
  entry,
  failed,
  invocation,
}: EntryProps<RunJournalEntryType>) {
  return (
    <Expression
      name={'run'}
      prefix="await"
      {...(entry.name && {
        input: (
          <div className="basis-0 not-italic text-zinc-500 grow min-w-0 flex text-2xs items-center px-[0.3ch]">
            "<TruncateWithTooltip>{entry.name}</TruncateWithTooltip>"
          </div>
        ),
      })}
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
