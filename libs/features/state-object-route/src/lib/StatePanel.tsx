import { Button, SubmitButton } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  ComplementaryFooter,
  useParamValue,
} from '@restate/ui/layout';
import { STATE_QUERY_NAME } from './constants';
import {
  useGetVirtualObjectQueue,
  useGetVirtualObjectState,
} from '@restate/data-access/admin-api';
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
import {
  INVOCATION_QUERY_NAME,
  State,
  Target,
} from '@restate/features/invocation-route';
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
    <div className="w-full text-xs text-gray-500/80 ">
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

function useStateParam(): { virtualObject?: string; key?: string } {
  const stateParam = useParamValue();

  try {
    return JSON.parse(stateParam);
  } catch (error) {
    return {};
  }
}

function StatePanelContent() {
  const { virtualObject, key } = useStateParam();
  const {
    data,
    isPending,
    error: getStateError,
    dataUpdatedAt,
    errorUpdatedAt,
    refetch: refetchState,
  } = useGetVirtualObjectState(String(virtualObject), String(key), {
    enabled: Boolean(virtualObject && key),
    refetchOnMount: true,
    staleTime: 0,
  });

  const { queryKey: inboxQueryKey, data: queueData } = useGetVirtualObjectQueue(
    String(virtualObject),
    String(key),
    undefined,
    {
      enabled: Boolean(virtualObject && key),
    }
  );

  const queryClient = useQueryClient();

  if (!virtualObject || !key) {
    return null;
  }

  return (
    <SnapshotTimeProvider
      lastSnapshot={getStateError ? errorUpdatedAt : dataUpdatedAt}
    >
      <ComplementaryFooter>
        <div className="flex gap-2 flex-col flex-auto">
          {getStateError && <ErrorBanner error={getStateError} />}

          <div className="flex gap-2">
            <ComplementaryClose>
              <Button className="flex-auto grow-0 w-full" variant="secondary">
                Close
              </Button>
            </ComplementaryClose>
            <SubmitButton
              className="flex-auto grow-0 w-full"
              variant="primary"
              onClick={() => {
                refetchState();
                queryClient.refetchQueries({
                  queryKey: inboxQueryKey,
                  exact: true,
                });
              }}
              isPending={isPending}
            >
              Refresh
            </SubmitButton>
          </div>
        </div>
      </ComplementaryFooter>
      <div className="flex flex-col items-start">
        <h2 className="mb-3 text-lg font-medium leading-6 text-gray-900 flex gap-2 items-center w-full">
          <div className="h-10 w-10 shrink-0 text-blue-400">
            <Icon
              name={IconName.Database}
              className="w-full h-full p-1.5 text-blue-400 drop-shadow-md"
            />
          </div>
          <div className="flex flex-col items-start gap-1 min-w-0 flex-auto">
            {isPending ? (
              <>
                <div className="w-[16ch] h-5 animate-pulse rounded-md bg-gray-200 mt-1" />
                <div className="w-[8ch] h-5 animate-pulse rounded-md bg-gray-200" />
              </>
            ) : (
              <>
                <div className="flex w-full items-center">State</div>
                <div className="min-h-4 flex w-full items-start flex-col gap-1 ">
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
      <Section className="mt-5">
        <SectionTitle>{virtualObject}</SectionTitle>
        <SectionContent className="p-0">
          <div className="flex px-1.5 py-1 items-center [&:not(:last-child)]:border-b">
            <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Key
            </span>
            <Badge
              size="sm"
              className="font-mono py-0 pr-0 align-middle ml-[30%] min-w-0"
            >
              <div className="truncate">{key}</div>
              <Copy
                copyText={key}
                className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1 ml-1"
              />
            </Badge>
          </div>
        </SectionContent>
        {queueData?.head && (
          <>
            <SectionTitle className="mt-2">Queue</SectionTitle>
            <SectionContent raised={false}>
              <div>
                <div className="relative mt-12">
                  <div className="absolute left-0 right-0 bottom-2  ">
                    <div className=" [clip-path:polygon(0%_0%,100%_50%,0%_50%)] bg-zinc-200 rounded-sm h-3" />
                    <div className="-top-1 absolute right-2 -translate-y-1/2 translate-x-1/2 flex flex-col items-center">
                      <span className="text-xs font-medium text-zinc-400 font-mono">
                        Head
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Link
                            href={`?${INVOCATION_QUERY_NAME}=${queueData?.head}`}
                            aria-label={queueData?.head}
                            variant="secondary"
                            className="w-6 h-6 bg-white shadow-sm border rounded-lg block"
                          >
                            <Icon
                              name={IconName.Invocation}
                              className="w-full h-full text-zinc-500 p-1 animate-pulse"
                            />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent small>
                          The ongoing invocation at the head
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  {Number(queueData?.size) > 1 && (
                    <div className="absolute left-0 -top-8 -translate-y-1/2 flex flex-col items-center">
                      <div className="text-xs font-medium text-zinc-400 font-mono">
                        {formatNumber(queueData?.size || 0)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SectionContent>
          </>
        )}
      </Section>

      <Section className="mt-2">
        <SectionTitle className="">State</SectionTitle>
        <SectionContent className="-mt-px p-0" raised={false}>
          <State state={data?.state} service={virtualObject} serviceKey={key} />
        </SectionContent>
      </Section>
    </SnapshotTimeProvider>
  );
}
