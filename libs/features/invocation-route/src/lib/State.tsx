import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Value } from './Value';

export function State({
  state = [],
}: {
  state?: { name: string; value: string }[];
}) {
  return (
    <>
      <div className="mt-2 grid [grid-template-columns:1fr_2fr] text-xs font-medium text-gray-400">
        <div className="pl-2">Key</div>
        <div className="pl-2">Value</div>
      </div>
      <div className="flex flex-col shadow-sm border rounded-[calc(0.75rem-0.125rem)]">
        {state.map(({ name, value }) => (
          <StateKey name={name} value={value} key={name} />
        ))}
      </div>
    </>
  );
}

function StateKey({ name, value }: { name: string; value: string }) {
  return (
    <div className="bg-white [&:not(:last-child)]:border-b [&:first-child]:rounded-t-[calc(0.75rem-0.125rem)] [&:last-child]:rounded-b-[calc(0.75rem-0.125rem)] gap-1 px-2 py-0 items-center text-code text-zinc-600 truncate grid [grid-template-columns:1fr_2fr]">
      <div className="items-start flex min-w-0 border-r py-1 pr-1 relative h-full">
        <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>
      </div>
      <div className="truncate py-1">
        <Value value={value} />
      </div>
    </div>
  );
}
