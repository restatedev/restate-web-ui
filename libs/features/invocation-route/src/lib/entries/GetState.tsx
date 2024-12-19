import { GetStateJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function GetState({
  entry,
  failed,
  invocation,
}: EntryProps<GetStateJournalEntryType>) {
  return (
    <Expression
      isFunction={false}
      name={entry.key ?? ''}
      prefix="get"
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
