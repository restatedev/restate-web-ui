import { ClearStateJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression } from '../Expression';
import { TruncateWithTooltip } from '@restate/ui/tooltip';

export function ClearState({
  entry,
  failed,
  invocation,
}: EntryProps<ClearStateJournalEntryType>) {
  return (
    <Expression
      name="clear"
      input={
        <div className="basis-0 not-italic max-w-fit text-zinc-500 grow min-w-0 flex text-2xs items-center px-[0.3ch]">
          "<TruncateWithTooltip>{entry.key}</TruncateWithTooltip>"
        </div>
      }
    />
  );
}
