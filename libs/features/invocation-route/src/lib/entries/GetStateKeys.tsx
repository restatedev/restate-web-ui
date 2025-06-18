import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { Ellipsis } from '@restate/ui/loading';
import { EntryExpression } from './EntryExpression';

export function GetStateKeys({
  entry,
  invocation,
}: EntryProps<
  Extract<
    JournalEntryV2,
    { type?: 'GetStateKeys' | 'GetEagerStateKeys'; category?: 'command' }
  >
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      outputParam="keys"
      outputParamPlaceholder="Keys"
    />
  );
}
