import { ClearStateJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Failure } from '../Failure';
import { Value } from '../Value';

export function ClearState({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<ClearStateJournalEntryType>) {
  return (
    <>
      <Expression
        isFunction
        name="ctx.clear"
        input={
          <InputOutput
            name={JSON.stringify(entry.key ?? '')}
            popoverTitle="Key"
            popoverContent={
              <Value value={entry.key} className="text-xs font-mono py-3" />
            }
          />
        }
      />
      {error?.message && (
        <Failure
          message={error.message}
          restate_code={error.restate_code}
          isRetrying={isRetrying || wasRetrying}
        />
      )}
    </>
  );
}
