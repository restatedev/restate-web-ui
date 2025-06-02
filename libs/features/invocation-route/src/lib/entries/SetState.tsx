import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function SetState({
  entry,
  failed,
  invocation,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'SetState'; category?: 'command' }>
>) {
  const error = entry.error;
  return (
    <Expression
      isFunction={false}
      name={entry.key ?? ''}
      operationSymbol={'='}
      prefix="set"
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
          {typeof entry.value === 'undefined' && !error && (
            <div className="text-zinc-400 font-semibold font-mono text-2xs">
              void
            </div>
          )}
          {error?.message && (
            <Failure
              message={error.message}
              restate_code={error.restateCode}
              isRetrying={entry.isRetrying}
            />
          )}
        </>
      }
    />
  );
}
