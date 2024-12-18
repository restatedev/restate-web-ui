import { OutputJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function Output({
  entry,
  failed,
  invocation,
}: EntryProps<OutputJournalEntryType>) {
  return (
    <Expression
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
          {typeof entry.body === 'undefined' && !entry.failure && (
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
