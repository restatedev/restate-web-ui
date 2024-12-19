import { OutputJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function Output({
  entry,
  failed,
  invocation,
  error,
}: EntryProps<OutputJournalEntryType>) {
  const entryError = entry.failure || error;

  return (
    <Expression
      isHandler
      name={invocation.target_handler_name}
      output={
        <>
          {typeof entry.body === 'string' && (
            <InputOutput
              name={entry.body}
              popoverTitle="Response"
              popoverContent={
                <Value value={entry.body} className="text-xs font-mono py-3" />
              }
            />
          )}
          {typeof entry.body === 'undefined' && !entryError && (
            <div className="text-zinc-400 font-semibold font-mono text-2xs">
              void
            </div>
          )}
          {entryError?.message && (
            <Failure
              message={entryError.message}
              restate_code={entryError.restate_code}
            />
          )}
        </>
      }
    />
  );
}
