import { InputJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { HandlerCaller, InputOutput } from '../Handler';
import { Headers } from '../Headers';

export function Input({
  entry,
  failed,
  invocation,
}: EntryProps<InputJournalEntryType>) {
  return (
    <div className="w-full min-w-0">
      <HandlerCaller
        name={invocation.target_handler_name}
        input={
          <>
            {entry.body && (
              <InputOutput
                name="parameterssdfdsf"
                popoverTitle="Parameters"
                popoverContent={entry.body}
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
    </div>
  );
}
