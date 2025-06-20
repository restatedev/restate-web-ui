import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { InputOutput } from '../Expression';
import { Value } from '../Value';

export function SetState({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'SetState'; category?: 'command' }>
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      inputParams={[
        {
          paramName: 'key',
          title: 'Key',
          placeholderLabel: 'key',
          shouldStringified: true,
        },
        { paramName: 'value', title: 'Value', placeholderLabel: 'value' },
      ]}
      input={
        <>
          <InputOutput
            name={JSON.stringify(entry.key)}
            popoverTitle="Key"
            popoverContent={
              <Value value={entry.key} className="text-xs font-mono py-3" />
            }
          />
          <div>,</div>
          <InputOutput
            name="value"
            popoverTitle="Value"
            isValueHidden
            popoverContent={
              <Value
                value={entry.value}
                className="text-xs font-mono py-3 mx-0.5"
              />
            }
          />
        </>
      }
      operationSymbol=""
    />
  );
}
