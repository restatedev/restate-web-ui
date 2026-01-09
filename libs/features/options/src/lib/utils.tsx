import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { ReactNode } from 'react';

export function OptionListItem({
  name,
  value,
}: {
  name: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_2fr] items-center gap-1 truncate bg-white px-2 py-0 text-0.5xs text-zinc-600 not-last:border-b first:rounded-t-[calc(0.75rem-0.125rem)] last:rounded-b-[calc(0.75rem-0.125rem)]">
      <div className="relative flex min-w-0 items-start border-r py-1 pr-1">
        {name}
      </div>
      <div className="flex min-w-0 py-1 pl-1">{value}</div>
    </div>
  );
}

export function OptionListItemWithTooltip({
  name,
  value,
}: {
  name: string;
  value: string;
}) {
  return (
    <OptionListItem
      name={<TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>}
      value={
        <TruncateWithTooltip copyText={value}>{value}</TruncateWithTooltip>
      }
    />
  );
}
