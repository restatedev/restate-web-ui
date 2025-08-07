import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Value } from './Value';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { useEditStateContext } from '@restate/features/edit-state';
import { usePopover } from '@restate/ui/popover';

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
      <div className="mt-2 grid grid-cols-[1fr_2fr] text-xs font-medium text-gray-400">
        <div className="pl-2">Key</div>
        <div className="pl-2">Value</div>
      </div>
      <div className="flex flex-col rounded-[calc(0.75rem-0.125rem)] border shadow-xs">
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
  const { close } = usePopover();

  return (
    <div className="group grid grid-cols-[1fr_2fr] items-center gap-1 truncate bg-white px-2 py-0 text-code text-zinc-600 not-last:border-b first:rounded-t-[calc(0.75rem-0.125rem)] last:rounded-b-[calc(0.75rem-0.125rem)]">
      <div className="relative flex h-full min-w-0 items-start border-r py-1 pr-1">
        <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>
      </div>
      <div className="relative truncate py-1">
        <Value value={value} className="mono text-xs" />
        <Button
          variant="icon"
          className="invisible absolute top-1 right-0 group-hover:visible"
          onClick={() => {
            close?.();
            setEditState({
              isEditing: true,
              isDeleting: false,
              service,
              objectKey: serviceKey,
              key: name,
            });
          }}
        >
          <Icon
            name={IconName.Pencil}
            className="h-3 w-3 fill-current opacity-70"
          />
        </Button>
      </div>
    </div>
  );
}
