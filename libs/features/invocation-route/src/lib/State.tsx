import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Value } from './Value';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { useEditStateContext } from '@restate/features/edit-state';

export function State({
  state = [],
  service,
  serviceKey,
}: {
  state?: { name: string; value: string }[];
  service: string;
  serviceKey: string;
}) {
  return (
    <>
      <div className="mt-2 grid [grid-template-columns:1fr_2fr] text-xs font-medium text-gray-400">
        <div className="pl-2">Key</div>
        <div className="pl-2">Value</div>
      </div>
      <div className="flex flex-col shadow-sm border rounded-[calc(0.75rem-0.125rem)]">
        {state.map(({ name, value }) => (
          <StateKey
            name={name}
            value={value}
            key={name}
            service={service}
            serviceKey={serviceKey}
          />
        ))}
      </div>
    </>
  );
}

function StateKey({
  name,
  value,
  service,
  serviceKey,
}: {
  name: string;
  value: string;
  service: string;
  serviceKey: string;
}) {
  const setEditState = useEditStateContext();

  return (
    <div className="group bg-white [&:not(:last-child)]:border-b [&:first-child]:rounded-t-[calc(0.75rem-0.125rem)] [&:last-child]:rounded-b-[calc(0.75rem-0.125rem)] gap-1 px-2 py-0 items-center text-code text-zinc-600 truncate grid [grid-template-columns:1fr_2fr]">
      <div className="items-start flex min-w-0 border-r py-1 pr-1 relative h-full">
        <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>
      </div>
      <div className="truncate py-1 relative ">
        <Value
          value={value}
          className="mono text-xs [&_*]:mono [&_*]:text-xs"
        />
        <Button
          variant="icon"
          className="absolute top-1 right-0 invisible group-hover:visible"
          onClick={() =>
            setEditState({
              isEditing: true,
              service,
              objectKey: serviceKey,
              key: name,
            })
          }
        >
          <Icon
            name={IconName.Pencil}
            className="w-3 h-3 fill-current opacity-70"
          />
        </Button>
      </div>
    </div>
  );
}
