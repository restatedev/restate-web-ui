import type { components } from '@restate/data-access/admin-api-spec';
import type { EntryProps } from './types';

type JournalGroupEntry = components['schemas']['JournalGroupEntryV2'];

const GROUP_LABELS = {
  Attempt: 'attempt',
  FirstCompleted: 'first completed',
  AllCompleted: 'all completed',
  FirstSucceededOrAllFailed: 'first succeeded or all failed',
  AllSucceededOrFirstFailed: 'all succeeded or first failed',
  Unknown: 'unknown',
} satisfies Record<JournalGroupEntry['type'], string>;

export function Group({ entry }: EntryProps<JournalGroupEntry>) {
  return (
    <div className="flex h-full items-center gap-1 rounded-sm bg-zinc-100 px-2 text-0.5xs font-semibold text-zinc-500 uppercase ring-1 ring-zinc-200">
      {GROUP_LABELS[entry.type]}
    </div>
  );
}
