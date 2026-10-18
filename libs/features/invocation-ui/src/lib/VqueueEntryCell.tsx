import type { components } from '@restate/data-access-admin-api-spec';
import { Icon, IconName } from '@restate/ui-icons';
import { Cell } from '@restate/ui-table';
import {
  InvocationTableCell,
  isInvocationTableColumnKey,
} from './InvocationTableCell';

export type VqueueEntry = components['schemas']['VirtualObjectInboxEntry'];

export function isVqueueEntry<T extends object>(
  row: T | VqueueEntry,
): row is VqueueEntry {
  return 'kind' in row;
}

export function VqueueEntryIdentity({
  entry,
  iconName,
}: {
  entry: Pick<VqueueEntry, 'id' | 'kind'>;
  iconName?: IconName;
}) {
  const isStateMutation = entry.kind === 'state-mutation';

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
        <Icon
          name={
            iconName ?? (isStateMutation ? IconName.Database : IconName.History)
          }
          className="h-full w-full p-1 text-zinc-500"
        />
      </div>
      <div className="flex min-w-0 items-baseline gap-2">
        {!isStateMutation && (
          <span className="shrink-0 text-sm font-medium text-zinc-700">
            Other entry
          </span>
        )}
        <code className="truncate text-xs text-zinc-600">{entry.id}</code>
      </div>
    </div>
  );
}

export function VqueueEntryCell({
  entry,
  column,
}: {
  entry: VqueueEntry;
  column: string;
}) {
  if (column === 'id') {
    return (
      <Cell className="overflow-visible">
        <VqueueEntryIdentity entry={entry} />
      </Cell>
    );
  }
  if (isInvocationTableColumnKey(column)) {
    return (
      <InvocationTableCell
        column={column}
        row={{
          id: entry.id,
          vqueue_id: entry.vqueueId,
          stage: entry.stage,
          status: entry.status ?? entry.stage,
          created_at: entry.createdAt,
        }}
      />
    );
  }
  return <Cell />;
}
