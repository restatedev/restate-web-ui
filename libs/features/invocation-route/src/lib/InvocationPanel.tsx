import { Button } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  ComplementaryHeader,
  useParamValue,
} from '@restate/ui/layout';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { INVOCATION_QUERY_NAME } from './constants';
import {
  useGetInvocationJournalWithInvocationV2,
  useGetVirtualObjectQueue,
  useGetVirtualObjectState,
} from '@restate/data-access/admin-api-hooks';
import { Icon, IconName } from '@restate/ui/icons';
import { DeploymentSection } from './DeploymentSection';
import { KeysIdsSection } from './KeysIdsSection';
import { VirtualObjectSection } from './VirtualObjectSection';
import { WorkflowKeySection } from './WorkflowKeySection';
import { LifecycleSection } from './LifecycleSection';
import { ErrorBanner } from '@restate/ui/error';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import { useEffect, useState } from 'react';
import { formatDurations } from '@restate/util/intl';
import { Actions } from './actions';
import { JournalSection } from './JournalSection';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@restate/ui/link';
import { useRestateContext } from '@restate/features/restate-context';
import { useLocation } from 'react-router';
import { getSearchParams } from './InvocationId';
import { InvokedBySection } from './InvokedBySection';
import { RetentionSection } from './RetentionSection';

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

export function InvocationPanel() {
  return (
    <ComplementaryWithSearchParam paramName={INVOCATION_QUERY_NAME}>
      <InvocationPanelContent />
    </ComplementaryWithSearchParam>
  );
}

function InvocationPanelContent() {
  const invocationId = useParamValue();

  const {
    queryKey: journalQueryKey,
    data,
    isPending,
    error: getInvocationError,
    dataUpdatedAt,
    errorUpdatedAt,
    refetch: refetchGetInvocation,
  } = useGetInvocationJournalWithInvocationV2(String(invocationId), {
    enabled: Boolean(invocationId),
    refetchOnMount: true,
    staleTime: 0,
  });

  const { queryKey: inboxQueryKey } = useGetVirtualObjectQueue(
    String(data?.target_service_name),
    String(data?.target_service_key),
    String(data?.id),
    data?.scope,
    {
      enabled: false,
    },
  );
  const { queryKey: stateQuery } = useGetVirtualObjectState(
    String(data?.target_service_name),
    String(data?.target_service_key),
    data?.scope,
    {
      enabled: false,
    },
  );

  const queryClient = useQueryClient();
  const { baseUrl } = useRestateContext();
  const location = useLocation();

  if (!invocationId) {
    return null;
  }

  return (
    <SnapshotTimeProvider
      lastSnapshot={getInvocationError ? errorUpdatedAt : dataUpdatedAt}
    >
      <ComplementaryHeader>
        <Tooltip>
          <TooltipTrigger>
            <Link
              href={`${baseUrl}/invocations/${invocationId}${getSearchParams(
                location.search,
                invocationId,
              )}`}
              className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-center text-gray-800 no-underline shadow-xs hover:bg-gray-100 pressed:bg-gray-200"
            >
              <Icon
                name={IconName.Maximize}
                className="h-3.5 w-3.5 text-gray-500"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent size="sm">Open in full view</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="secondary"
              onClick={() => {
                refetchGetInvocation();
                queryClient.refetchQueries({
                  queryKey: inboxQueryKey,
                  exact: true,
                });
                queryClient.refetchQueries({
                  queryKey: journalQueryKey,
                  exact: true,
                });
                if (data?.target_service_ty === 'virtual_object') {
                  queryClient.refetchQueries({
                    queryKey: stateQuery,
                    exact: true,
                  });
                }
              }}
              disabled={isPending}
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
              name={IconName.Invocation}
              className="h-full w-full fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
            />
          </div>
          <div className="flex min-w-0 flex-auto flex-col items-start gap-1">
            {isPending ? (
              <>
                <div className="mt-1 h-5 w-[16ch] animate-pulse rounded-md bg-gray-200" />
                <div className="h-5 w-[8ch] animate-pulse rounded-md bg-gray-200" />
              </>
            ) : (
              <>
                <div className="flex w-full items-center">Invocation</div>
                <div className="flex min-h-4 w-full items-center">
                  <Footnote
                    dataUpdatedAt={
                      getInvocationError ? errorUpdatedAt : dataUpdatedAt
                    }
                  />
                </div>
              </>
            )}
          </div>
          {!isPending && (
            <div className="ml-auto flex shrink-0 items-center self-start">
              <Actions invocation={data} mini={false} className="text-0.5xs" />
            </div>
          )}
        </h2>
      </div>
      {getInvocationError && (
        <div className="mb-1">
          <ErrorBanner error={getInvocationError} />
        </div>
      )}

      <KeysIdsSection className="mt-5" invocation={data} />
      <LifecycleSection className="mt-2" invocation={data} />
      <VirtualObjectSection className="mt-2" invocation={data} raised />
      <WorkflowKeySection className="mt-2" invocation={data} />
      <DeploymentSection className="mt-2" invocation={data} raised />
      <InvokedBySection className="mt-2" invocation={data} />
      <RetentionSection className="mt-2" invocation={data} />
      <JournalSection className="mt-2" invocation={data} />
    </SnapshotTimeProvider>
  );
}
