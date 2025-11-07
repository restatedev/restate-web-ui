import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Copy } from '@restate/ui/copy';
import { InPortal } from '@restate/ui/portal';

export function Headers({
  headers,
  showCopyButton,
  portalId,
}: {
  headers: { key: string; value: string }[];
  showCopyButton?: boolean;
  portalId?: string;
}) {
  return (
    <>
      <div className="mt-px grid grid-cols-[1fr_2fr] rounded-t-[calc(0.75rem-0.125rem)] border bg-zinc-50 pt-1 pb-4 text-xs font-medium text-gray-400">
        <div className="pl-4">Name</div>
        <div className="pr-4 pl-2">Value</div>
      </div>
      <div className="-mb-4 flex -translate-y-4 flex-col rounded-[calc(0.75rem-0.125rem)] border shadow-xs">
        {headers.map(({ key: name, value }) => (
          <Header name={name} value={value} key={name} />
        ))}
      </div>
      {showCopyButton && (
        <InPortal id={String(portalId)}>
          <Copy
            copyText={JSON.stringify(headers ?? [])}
            className="ml-3 h-5.5 w-5.5 rounded-lg border bg-white p-1 text-gray-800 shadow-xs"
          />
        </InPortal>
      )}
    </>
  );
}

function Header({ name, value }: { name: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_2fr] items-center gap-1 truncate bg-white px-4 py-0 text-0.5xs text-zinc-600 not-last:border-b first:rounded-t-[calc(0.75rem-0.125rem)] last:rounded-b-[calc(0.75rem-0.125rem)]">
      <div className="relative flex min-w-0 items-start border-r py-1 pr-1">
        <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>
      </div>
      <div className="flex min-w-0 py-1 pl-1">
        <TruncateWithTooltip copyText={value}>{value}</TruncateWithTooltip>
      </div>
    </div>
  );
}
