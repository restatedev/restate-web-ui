import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression } from '../Expression';
import { Failure } from '../Failure';

export function ClearAllState({
  entry,
  failed,
  invocation,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'ClearAllState'; category?: 'command' }>
>) {
  const error = entry.error;
  return (
    <>
      <Expression name="ctx.clearAll" />
      {error?.message && (
        <Failure
          message={error.message}
          restate_code={error.restateCode}
          isRetrying={entry.isRetrying}
        />
      )}
    </>
  );
}
