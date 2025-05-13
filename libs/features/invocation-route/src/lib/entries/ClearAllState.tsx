import { ClearAllStateJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression } from '../Expression';
import { Failure } from '../Failure';

export function ClearAllState({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<ClearAllStateJournalEntryType>) {
  return (
    <>
      <Expression name="ctx.clearAll" />
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
