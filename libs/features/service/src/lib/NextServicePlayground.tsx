import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@restate/ui-button';
import { DialogClose, DialogContent, QueryDialog } from '@restate/ui-dialog';
import { Icon, IconName } from '@restate/ui-icons';
import { ComplementaryClose, ComplementaryHeader } from '@restate/ui-layout';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui-tooltip';
import { Playground, useServiceContract } from '@restate/features-playground';
import {
  HANDLER_QUERY_PARAM,
  PANEL_QUERY_PARAM,
  PLAYGROUND_HANDLER_QUERY_PARAM,
  SERVICE_PLAYGROUND_QUERY_PARAM,
} from '@restate/util-panel';

function usePlaygroundSelection(handlerParam: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const onSelect = useCallback(
    (handler: string) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set(handlerParam, handler);
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [handlerParam, setSearchParams],
  );
  return {
    handler: searchParams.get(handlerParam),
    onSelect,
    setSearchParams,
  };
}

function HeaderButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: IconName;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="secondary"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="flex h-7 w-7 items-center justify-center rounded-full p-0"
        >
          <Icon name={icon} className="h-3.5 w-3.5 text-muted" />
        </Button>
      </TooltipTrigger>
      <TooltipContent size="sm">{label}</TooltipContent>
    </Tooltip>
  );
}

export function NextServicePlaygroundPanel({ service }: { service: string }) {
  const { handler, onSelect, setSearchParams } = usePlaygroundSelection(
    PLAYGROUND_HANDLER_QUERY_PARAM,
  );
  const { refetch, isFetching } = useServiceContract(service);

  return (
    <>
      <ComplementaryHeader>
        <HeaderButton
          label="Open as sheet"
          icon={IconName.Maximize}
          onClick={() =>
            setSearchParams(
              (previous) => {
                const next = new URLSearchParams(previous);
                next.delete(PANEL_QUERY_PARAM);
                return next;
              },
              { preventScrollReset: true },
            )
          }
        />
        <HeaderButton
          label="Refresh"
          icon={IconName.Retry}
          disabled={isFetching}
          onClick={() => void refetch()}
        />
        <ComplementaryClose>
          <HeaderButton label="Close" icon={IconName.X} />
        </ComplementaryClose>
      </ComplementaryHeader>
      <div className="-mx-2 flex min-h-full flex-col">
        <h2 className="px-4 pt-1 text-lg font-semibold text-primary">
          {service}
        </h2>
        <Playground
          service={service}
          handler={handler}
          onSelect={onSelect}
          showServiceHeader={false}
          showNavigation={false}
        />
      </div>
    </>
  );
}

export function NextServicePlaygroundSheet({ service }: { service: string }) {
  const { handler, onSelect, setSearchParams } = usePlaygroundSelection(
    PLAYGROUND_HANDLER_QUERY_PARAM,
  );

  return (
    <QueryDialog query={SERVICE_PLAYGROUND_QUERY_PARAM}>
      <DialogContent variant="sheet" className="p-0">
        <Playground
          service={service}
          handler={handler}
          onSelect={onSelect}
          headerActions={
            <>
              <HeaderButton
                label="Dock to the side"
                icon={IconName.Minimize}
                onClick={() =>
                  setSearchParams(
                    (previous) => {
                      const next = new URLSearchParams(previous);
                      next.set(
                        PANEL_QUERY_PARAM,
                        SERVICE_PLAYGROUND_QUERY_PARAM,
                      );
                      return next;
                    },
                    { preventScrollReset: true },
                  )
                }
              />
              <DialogClose>
                <HeaderButton label="Close" icon={IconName.X} />
              </DialogClose>
            </>
          }
        />
      </DialogContent>
    </QueryDialog>
  );
}

export function NextServicePlaygroundEmbed({
  service,
  className,
}: {
  service: string;
  className?: string;
}) {
  const { handler, onSelect } = usePlaygroundSelection(HANDLER_QUERY_PARAM);

  return (
    <div className={className}>
      <div className="mx-4 mt-px mb-4 h-[calc(100dvh-var(--cp-content-top,0px)-1rem-1px)] min-h-[32rem] overflow-hidden rounded-xl border border-default bg-surface shadow-xs">
        <Playground
          service={service}
          handler={handler}
          onSelect={onSelect}
          showServiceHeader={false}
        />
      </div>
    </div>
  );
}
