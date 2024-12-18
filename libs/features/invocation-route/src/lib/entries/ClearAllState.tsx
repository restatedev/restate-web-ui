import { ClearAllStateJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';

export function ClearAllState({
  entry,
  failed,
  invocation,
}: EntryProps<ClearAllStateJournalEntryType>) {
  return <Expression name="clear" input={<InputOutput name="*" />} />;
}
