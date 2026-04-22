import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Value } from './Value';
import { CodecProvider } from '@restate/features/codec-options';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { useEditStateContext } from '@restate/features/edit-state';
import { usePopover } from '@restate/ui/popover';
import { useRestateContext } from '@restate/features/restate-context';

export function State({
  state = [],
  service,
  serviceKey,
  deploymentId,
  isLoading,
}: {
  state?: { name: string; value: string }[];
  service: string;
  serviceKey: string;
  deploymentId?: string;
  isLoading?: boolean;
}) {
  return (
    <>
      <div className="mt-2 grid grid-cols-[1fr_2fr] text-xs font-medium text-gray-400">
        <div className="pl-2">Key</div>
        <div className="pl-2">Value</div>
      </div>
      <div className="flex flex-col rounded-[calc(0.75rem-0.125rem)] border shadow-xs">
        {!isLoading &&
          state.map(({ name, value }) => (
            <StateKey
              name={name}
              value={value}
              key={name}
              service={service}
              serviceKey={serviceKey}
              deploymentId={deploymentId}
            />
          ))}
        {isLoading && (
          <div className="group grid grid-cols-[1fr_2fr] items-center gap-1 truncate bg-white px-2 py-0 py-2 text-0.5xs text-zinc-600 not-last:border-b first:rounded-t-[calc(0.75rem-0.125rem)] last:rounded-b-[calc(0.75rem-0.125rem)]">
            <div className="h-5 animate-pulse rounded-md bg-slate-200" />
            <div className="h-5 animate-pulse rounded-md bg-slate-200" />
          </div>
        )}
      </div>
    </>
  );
}

function StateKey({
  name,
  value,
  service,
  serviceKey,
  deploymentId,
}: {
  name: string;
  value: string;
  service: string;
  serviceKey: string;
  deploymentId?: string;
}) {
  const setEditState = useEditStateContext();
  const { close } = usePopover();
  const { EncodingWaterMark } = useRestateContext();
  const stateCodecOptions = {
    service: {
      value: {
        name: service,
      },
    },
    deploymentId: { value: deploymentId },
    key: serviceKey,
    command: {
      type: 'GetState' as const,
      name,
    },
  };

  return (
    <div className="group grid grid-cols-[1fr_2fr] items-center gap-1 truncate bg-white px-2 py-0 text-0.5xs text-zinc-600 not-last:border-b first:rounded-t-[calc(0.75rem-0.125rem)] last:rounded-b-[calc(0.75rem-0.125rem)]">
      <div className="relative flex h-full min-w-0 items-start border-r py-1 pr-1">
        <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>
      </div>
      <div className="relative truncate py-1">
        <CodecProvider options={stateCodecOptions}>
          <Value value={value} className="mono max-w-full text-xs" isBase64 />
        </CodecProvider>
        <div className="absolute top-1 right-1 flex items-center gap-2">
          <Button
            variant="icon"
            className="invisible backdrop-blur-lg group-hover:visible"
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
          {EncodingWaterMark && (
            <EncodingWaterMark value={value} mini className="" />
          )}
        </div>
      </div>
    </div>
  );
}
