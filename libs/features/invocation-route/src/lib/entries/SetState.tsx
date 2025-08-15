import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { InputOutput } from '../Expression';
import { Value } from '../Value';
import { useRestateContext } from '@restate/features/restate-context';

export function SetState({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'SetState'; category?: 'command' }>
>) {
  const { EncodingWaterMark } = useRestateContext();
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
              <Value value={entry.key} className="py-3 font-mono text-xs" />
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
                className="mx-0.5 py-3 font-mono text-xs"
                isBase64
              />
            }
            {...(EncodingWaterMark && {
              waterMark: <EncodingWaterMark value={entry.value} />,
            })}
          />
        </>
      }
      operationSymbol=""
    />
  );
}
