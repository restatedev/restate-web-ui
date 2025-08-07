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
      <div className="flex flex-col shadow-xs border rounded-[calc(0.75rem-0.125rem)]">
        {headers.map(({ key: name, value }) => (
          <Header name={name} value={value} key={name} />
        ))}
      </div>
    </>
  );
}

function Header({ name, value }: { name: string; value: string }) {
  return (
    <div className="bg-white not-last:border-b first:rounded-t-[calc(0.75rem-0.125rem)] last:rounded-b-[calc(0.75rem-0.125rem)] gap-1 px-2 py-0 items-center text-code text-zinc-600 truncate grid grid-cols-[1fr_2fr]">
      <div className="items-start flex min-w-0 border-r py-1 pr-1 relative">
        <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>
      </div>
      <div className="min-w-0 flex py-1 pl-1">
        <TruncateWithTooltip copyText={value}>{value}</TruncateWithTooltip>
      </div>
    </div>
  );
}
