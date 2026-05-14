import { Button } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  ComplementaryHeader,
  useParamValue,
} from '@restate/ui/layout';
import { STATE_QUERY_NAME } from './constants';
import {
  useGetVirtualObjectQueue,
  useGetVirtualObjectState,
} from '@restate/data-access/admin-api-hooks';
import { Icon, IconName } from '@restate/ui/icons';
import { ErrorBanner } from '@restate/ui/error';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import { useEffect, useState } from 'react';
import { formatDurations, formatNumber } from '@restate/util/intl';
import { useQueryClient } from '@tanstack/react-query';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { State } from '@restate/features/invocation-route';
import { panelHref } from '@restate/util/panel';
import { Link } from '@restate/ui/link';
import { Badge } from '@restate/ui/badge';
import { Copy } from '@restate/ui/copy';

function Footnote({ dataUpdatedAt }: { dataUpdatedAt?: number }) {
  const [now, setNow] = useState(() => Date.now());
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    setNow(Date.now());

    if (dataUpdatedAt) {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 30_000);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [dataUpdatedAt]);

  if (!dataUpdatedAt) {
    return null;
  }
  const { isPast, ...parts } = durationSinceLastSnapshot(now);
  const duration = formatDurations(parts);
  return (
    <div className="w-full text-xs text-gray-500/80">
      Last updated{' '}
      <span className="font-medium text-gray-500">{duration} ago</span>
    </div>
  );
}

export function StatePanel() {
  return (
    <ComplementaryWithSearchParam paramName={STATE_QUERY_NAME}>
      <StatePanelContent />
    </ComplementaryWithSearchParam>
  );
}

function useStateParam(): {
  virtualObject?: string;
  key?: string;
  scope?: string;
} {
  const stateParam = useParamValue();

  try {
    return JSON.parse(stateParam);
  } catch (error) {
    return {};
  }
}

function StatePanelContent() {
  const { virtualObject, key, scope } = useStateParam();
  const {
    data,
    isFetching,
    error: getStateError,
    dataUpdatedAt,
    errorUpdatedAt,
    refetch: refetchState,
  } = useGetVirtualObjectState(String(virtualObject), String(key), scope, {
    enabled: Boolean(virtualObject && key),
    refetchOnMount: true,
    staleTime: 0,
  });

  const { queryKey: inboxQueryKey, data: queueData } = useGetVirtualObjectQueue(
    String(virtualObject),
    String(key),
    undefined,
    scope,
    {
      enabled: Boolean(virtualObject && key),
    },
  );

  const queryClient = useQueryClient();

  if (!virtualObject || !key) {
    return null;
  }

  return (
    <SnapshotTimeProvider
      lastSnapshot={getStateError ? errorUpdatedAt : dataUpdatedAt}
    >
      <ComplementaryHeader>
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="secondary"
              onClick={() => {
                refetchState();
                queryClient.refetchQueries({
                  queryKey: inboxQueryKey,
                  exact: true,
                });
              }}
              disabled={isFetching}
              className="flex h-7 w-7 items-center justify-center rounded-full p-0"
            >
              <Icon name={IconName.Retry} className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent size="sm">Refresh</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <ComplementaryClose>
              <Button
                variant="secondary"
                className="flex h-7 w-7 items-center justify-center rounded-full p-0"
              >
                <Icon name={IconName.X} className="h-3.5 w-3.5" />
              </Button>
            </ComplementaryClose>
          </TooltipTrigger>
          <TooltipContent size="sm">Close</TooltipContent>
        </Tooltip>
      </ComplementaryHeader>
      <div className="flex flex-col items-start">
        <h2 className="mb-3 flex w-full items-center gap-2 text-lg leading-6 font-medium text-gray-900">
          <div className="h-10 w-10 shrink-0 text-blue-400">
            <Icon
              name={IconName.Database}
              className="h-full w-full p-1.5 text-blue-400 drop-shadow-md"
            />
          </div>
          <div className="flex min-w-0 flex-auto flex-col items-start gap-1">
            {isFetching ? (
              <>
                <div className="mt-1 h-5 w-[16ch] animate-pulse rounded-md bg-slate-200" />
                <div className="h-5 w-[8ch] animate-pulse rounded-md bg-slate-200" />
              </>
            ) : (
              <>
                <div className="flex w-full items-center">State</div>
                <div className="flex min-h-4 w-full flex-col items-start gap-1">
                  <Footnote
                    dataUpdatedAt={
                      getStateError ? errorUpdatedAt : dataUpdatedAt
                    }
                  />
                </div>
              </>
            )}
          </div>
        </h2>
      </div>
      {getStateError && (
        <div className="mb-1">
          <ErrorBanner error={getStateError} />
        </div>
      )}
      <Section className="mt-5">
        <SectionTitle>{virtualObject}</SectionTitle>
        <SectionContent className="p-0">
          <div className="flex items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
              Key
            </span>
            <Badge
              size="sm"
              className="ml-[30%] min-w-0 py-0 pr-0 align-middle font-mono"
            >
              <div className="truncate">{key}</div>
              <Copy
                copyText={key}
                className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
              />
            </Badge>
          </div>
          {scope !== undefined && (
            <div className="flex items-center px-1.5 py-1 not-last:border-b">
              <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
                Scope
              </span>
              <Badge
                size="sm"
                className="ml-[30%] min-w-0 py-0 pr-0 align-middle font-mono"
              >
                <div className="truncate">{scope}</div>
                <Copy
                  copyText={scope}
                  className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
                />
              </Badge>
            </div>
          )}
        </SectionContent>
        {queueData?.head && (
          <>
            <SectionTitle className="mt-2">Queue</SectionTitle>
            <SectionContent raised={false}>
              <div>
                <div className="relative mt-12">
                  <div className="absolute right-0 bottom-2 left-0">
                    <div className="h-3 rounded-xs bg-zinc-200 [clip-path:polygon(0%_0%,100%_50%,0%_50%)]" />
                    <div className="absolute -top-1 right-2 flex translate-x-1/2 -translate-y-1/2 flex-col items-center">
                      <span className="font-mono text-xs font-medium text-zinc-400">
                        Head
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Link
                            href={panelHref({ invocation: String(queueData?.head ?? '') })}
                            aria-label={queueData?.head}
                            variant="secondary"
                            className="block h-6 w-6 rounded-lg border bg-white shadow-xs"
                          >
                            <Icon
                              name={IconName.Invocation}
                              className="h-full w-full animate-pulse p-1 text-zinc-500"
                            />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent size="sm">
                          The ongoing invocation at the head
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  {Number(queueData?.size) > 1 && (
                    <div className="absolute -top-8 left-0 flex -translate-y-1/2 flex-col items-center">
                      <div className="font-mono text-xs font-medium text-zinc-400">
                        {formatNumber(queueData?.size || 0)}
                      </div>
                    </div>
                  )}
                </div>
                {Number(queueData.size) > 1 && (
                  <div className="text-xs text-zinc-500/80">
                    There are {queueData.size} invocations in progress.
                  </div>
                )}
                {Number(queueData.size) === 1 && (
                  <div className="text-xs text-zinc-500/80">
                    There is 1 invocation in progress.
                  </div>
                )}
              </div>
            </SectionContent>
          </>
        )}
      </Section>

      <Section className="mt-2">
        <SectionTitle className="">State</SectionTitle>
        <SectionContent className="-mt-px p-0" raised={false}>
          <State
            state={data?.state}
            service={virtualObject}
            serviceKey={key}
            scope={scope}
            isLoading={isFetching}
          />
        </SectionContent>
      </Section>
    </SnapshotTimeProvider>
  );
}
