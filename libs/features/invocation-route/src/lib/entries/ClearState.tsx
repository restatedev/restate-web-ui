import { ClearStateJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';

export function ClearState({
  entry,
  failed,
  invocation,
}: EntryProps<ClearStateJournalEntryType>) {
  return (
    <Expression name="clear" input={<InputOutput name={String(entry.key)} />} />
  );
}
