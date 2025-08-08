import { TruncateWithTooltip } from '@restate/ui/tooltip';

export function Headers({
  headers,
}: {
  headers: { key: string; value: string }[];
}) {
  return (
    <>
      <div className="mt-2 grid grid-cols-[1fr_2fr] text-xs font-medium text-gray-400">
        <div className="pl-2">Name</div>
        <div className="pl-2">Value</div>
      </div>
      <div className="flex flex-col rounded-[calc(0.75rem-0.125rem)] border shadow-xs">
        {headers.map(({ key: name, value }) => (
          <Header name={name} value={value} key={name} />
        ))}
      </div>
    </>
  );
}

function Header({ name, value }: { name: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_2fr] items-center gap-1 truncate bg-white px-2 py-0 text-0.5xs text-zinc-600 not-last:border-b first:rounded-t-[calc(0.75rem-0.125rem)] last:rounded-b-[calc(0.75rem-0.125rem)]">
      <div className="relative flex min-w-0 items-start border-r py-1 pr-1">
        <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>
      </div>
      <div className="flex min-w-0 py-1 pl-1">
        <TruncateWithTooltip copyText={value}>{value}</TruncateWithTooltip>
      </div>
    </div>
  );
}
