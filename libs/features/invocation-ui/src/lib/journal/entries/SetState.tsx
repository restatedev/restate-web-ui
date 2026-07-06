import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { InputOutput } from '../Expression';
import { Value } from '../Value';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

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
      input={
        <>
          <InputOutput
            name={JSON.stringify(entry.key)}
            popoverTitle="Key"
            popoverContent={
              <Value
                value={entry.key}
                className="font-mono text-xs"
                showCopyButton
                portalId="expression-value"
              />
            }
          />
          <div>,</div>
          <LazyJournalEntryPayload.Value
            invocationId={invocation?.id}
            entry={entry}
            title="Value"
            isBase64
          />
        </>
      }
      operationSymbol=""
    />
  );
}
