import { InputJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Handler';
import { Headers } from '../Headers';
import { Value } from '../Value';

export function Input({
  entry,
  failed,
  invocation,
}: EntryProps<InputJournalEntryType>) {
  return (
    <Expression
      name={invocation.target_handler_name}
      input={
        <>
          {entry.body && (
            <InputOutput
              name="parameters"
              popoverTitle="Parameters"
              popoverContent={
                <Value value={entry.body} className="text-xs font-mono py-3" />
              }
            />
          )}
          {entry.body && entry.headers && ', '}
          {entry.headers && (
            <InputOutput
              name="headers"
              popoverTitle="Headers"
              className="px-0 bg-transparent border-none mx-2 [&&&]:mb-3"
              popoverContent={<Headers headers={entry.headers} />}
            />
          )}
        </>
      }
    />
  );
}
