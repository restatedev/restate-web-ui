import { ClearStateJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression } from '../Expression';
import { Failure } from '../Failure';

export function ClearState({
  entry,
  failed,
  invocation,
  error,
}: EntryProps<ClearStateJournalEntryType>) {
  return (
    <>
      <Expression prefix="clear" isFunction={false} name={entry.key ?? ''} />
      {error?.message && (
        <Failure message={error.message} restate_code={error.restate_code} />
      )}
    </>
  );
}
