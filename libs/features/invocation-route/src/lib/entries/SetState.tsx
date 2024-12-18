import { SetStateJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Handler';
import { Value } from '../Value';

export function SetState({
  entry,
  failed,
  invocation,
}: EntryProps<SetStateJournalEntryType>) {
  return (
    <Expression
      isFunction={false}
      name={entry.key ?? ''}
      operationSymbol={'='}
      output={
        typeof entry.value === 'string' ? (
          <InputOutput
            name={entry.value}
            popoverTitle="Value"
            popoverContent={
              <Value value={entry.value} className="text-xs font-mono py-3" />
            }
          />
        ) : (
          <div className="text-zinc-400 font-semibold font-mono text-2xs">
            void
          </div>
        )
      }
    />
  );
}
