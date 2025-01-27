import { CallJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Headers } from '../Headers';
import { Value } from '../Value';
import { Target } from '../Target';
import { InvocationId } from '../InvocationId';
import { Failure } from '../Failure';
import { Ellipsis } from '@restate/ui/loading';

export function Call({
  entry,
  failed,
  invocation,
  error,
}: EntryProps<CallJournalEntryType>) {
  const entryError = entry.failure || error;

  return (
    <div className="flex flex-col gap-1.5 py-1.5 items-start pr-1.5 max-w-full relative">
      <div className="absolute w-2.5 border-l border-b  border-black/20 border-dashed left-3.5 top-6 h-5  rounded-b rounded-br-none" />
      <div className="absolute w-2.5 border-l border-b  border-black/20 border-dashed left-8 top-12 h-5  rounded-b rounded-br-none" />
      <Target
        target={entry.invoked_target}
        className="[font-size:inherit] [&_a_svg]:w-3 [&_a_svg]:h-3"
        showHandler={false}
      />
      <div className="pl-7 max-w-full flex items-center">
        <Expression
          isHandler
          name={entry.invoked_target.split('/').at(-1) ?? ''}
          input={
            <>
              {entry.parameters && (
                <InputOutput
                  name="parameters"
                  popoverTitle="Parameters"
                  popoverContent={
                    <Value
                      value={entry.parameters}
                      className="text-xs font-mono py-3"
                    />
                  }
                />
              )}
              {entry.parameters && entry.headers && ', '}
              {entry.headers && entry.headers.length > 0 && (
                <InputOutput
                  name="headers"
                  popoverTitle=""
                  className="px-0 bg-transparent border-none mx-2 [&&&]:mb-3"
                  popoverContent={<Headers headers={entry.headers} />}
                />
              )}
            </>
          }
          output={
            <>
              {typeof entry.value === 'string' && (
                <InputOutput
                  name={entry.value}
                  popoverTitle="Response"
                  popoverContent={
                    <Value
                      value={entry.value}
                      className="text-xs font-mono py-3"
                    />
                  }
                />
              )}
              {typeof entry.value === 'undefined' &&
                !entryError &&
                entry.completed && (
                  <div className="text-zinc-400 font-semibold font-mono text-2xs">
                    void
                  </div>
                )}
              {!entry.completed && <Ellipsis />}
              {entryError?.message && (
                <Failure
                  message={entryError.message}
                  restate_code={entryError.restate_code}
                />
              )}
            </>
          }
        />
      </div>
      <InvocationId
        id={entry.invoked_id}
        className="max-w-full pl-10 mt-0.5"
        size="sm"
      />
    </div>
  );
}
