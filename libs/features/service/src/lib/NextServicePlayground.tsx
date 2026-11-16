import {
  lazy,
  Suspense,
  useCallback,
  type ComponentProps,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router';
import { useServiceOpenApi } from '@restate/data-access-admin-api-hooks';
import { Button } from '@restate/ui-button';
import { DialogClose, DialogContent, QueryDialog } from '@restate/ui-dialog';
import { ErrorBoundary } from '@restate/ui-error';
import { Icon, IconName } from '@restate/ui-icons';
import { ComplementaryClose, ComplementaryHeader } from '@restate/ui-layout';
import { Spinner } from '@restate/ui-loading';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui-tooltip';
import {
  clearPlaygroundHandler,
  HANDLER_QUERY_PARAM,
  PANEL_QUERY_PARAM,
  PLAYGROUND_HANDLER_QUERY_PARAM,
  SERVICE_PLAYGROUND_QUERY_PARAM,
} from '@restate/util-panel';

const LazyPlayground = lazy(() =>
  import('@restate/features-playground').then((module) => ({
    default: module.Playground,
  })),
);

function PlaygroundStatus({
  headerActions,
  children,
}: PropsWithChildren<{ headerActions?: ReactNode }>) {
  return (
    <div className="flex flex-auto flex-col">
      {headerActions && (
        <div className="flex justify-end gap-2 px-4 pt-4">{headerActions}</div>
      )}
      <div className="flex flex-auto items-center justify-center gap-2 p-8 text-sm text-muted">
        {children}
      </div>
    </div>
  );
}

function Playground(props: ComponentProps<typeof LazyPlayground>) {
  return (
    <ErrorBoundary
      key={props.service}
      fallback={
        <PlaygroundStatus headerActions={props.headerActions}>
          The playground couldn’t be displayed. Reload the page to try again.
        </PlaygroundStatus>
      }
    >
      <Suspense
        fallback={
          <PlaygroundStatus headerActions={props.headerActions}>
            <Spinner className="h-4 w-4" />
            Loading playground…
          </PlaygroundStatus>
        }
      >
        <LazyPlayground {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

function usePlaygroundSelection(
  handlerParam: string,
  { handlersOnly = false }: { handlersOnly?: boolean } = {},
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const onSelect = useCallback(
    (handler: string, isHandler: boolean) => {
      if (handlersOnly && !isHandler) {
        return;
      }
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set(handlerParam, handler);
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [handlerParam, handlersOnly, setSearchParams],
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
  const { refetch, isFetching } = useServiceOpenApi(service);

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
        <Playground
          service={service}
          handler={handler}
          onSelect={onSelect}
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
    <QueryDialog
      query={SERVICE_PLAYGROUND_QUERY_PARAM}
      onCloseQueryParam={clearPlaygroundHandler}
    >
      <DialogContent
        variant="sheet"
        className="h-[76vh] p-0 lg:w-[min(60rem,88vw)]"
      >
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
  const { handler, onSelect } = usePlaygroundSelection(HANDLER_QUERY_PARAM, {
    handlersOnly: true,
  });

  return (
    <div className={className}>
      <div className="mx-4 mt-px mb-4 flex overflow-clip rounded-xl border border-default bg-surface shadow-xs">
        <Playground
          service={service}
          handler={handler}
          onSelect={onSelect}
          scroll="page"
        />
      </div>
    </div>
  );
}
