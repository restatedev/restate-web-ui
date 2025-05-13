import { Button, SubmitButton } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  ComplementaryFooter,
  useParamValue,
} from '@restate/ui/layout';
import { INVOCATION_QUERY_NAME } from './constants';
import {
  useGetInvocation,
  useGetInvocationJournal,
  useGetVirtualObjectQueue,
  useGetVirtualObjectState,
} from '@restate/data-access/admin-api';
import { Icon, IconName } from '@restate/ui/icons';
import { ServiceHandlerSection } from './ServiceHandlerSection';
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
import { Actions } from './Actions';
import { JournalSection } from './Journal';
import { useQueryClient } from '@tanstack/react-query';

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
    data,
    isPending,
    error: getInvocationError,
    dataUpdatedAt,
    errorUpdatedAt,
    refetch: refetchGetInvocation,
    isSuccess,
  } = useGetInvocation(String(invocationId), {
    enabled: Boolean(invocationId),
    refetchOnMount: true,
    staleTime: 0,
  });
  const { queryKey: journalQueryKey } = useGetInvocationJournal(
    String(invocationId),
    {
      enabled: false,
    }
  );

  const { queryKey: inboxQueryKey } = useGetVirtualObjectQueue(
    String(data?.target_service_name),
    String(data?.target_service_key),
    String(data?.id),
    {
      enabled: false,
    }
  );
  const { queryKey: stateQuery } = useGetVirtualObjectState(
    String(data?.target_service_name),
    String(data?.target_service_key),
    {
      enabled: false,
    }
  );

  const queryClient = useQueryClient();

  if (!invocationId) {
    return null;
  }

  return (
    <SnapshotTimeProvider
      lastSnapshot={getInvocationError ? errorUpdatedAt : dataUpdatedAt}
    >
      <ComplementaryFooter>
        <div className="flex gap-2 flex-col flex-auto">
          {getInvocationError && <ErrorBanner error={getInvocationError} />}

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
              name={IconName.Invocation}
              className="w-full h-full p-1.5 fill-blue-50 text-blue-400 drop-shadow-md"
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
                <div className="flex w-full items-center">Invocation</div>
                <div className="min-h-4 flex w-full items-center">
                  <Footnote
                    dataUpdatedAt={
                      getInvocationError ? errorUpdatedAt : dataUpdatedAt
                    }
                  />
                  <div className="ml-auto">
                    <Actions
                      invocation={data}
                      mini={false}
                      className="text-sm"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </h2>
      </div>

      <KeysIdsSection className="mt-5" invocation={data} />
      <ServiceHandlerSection className="mt-2" invocation={data} />
      <LifecycleSection className="mt-2" invocation={data} />
      <VirtualObjectSection className="mt-2" invocation={data} raised />
      <WorkflowKeySection className="mt-2" invocation={data} />
      <DeploymentSection className="mt-2" invocation={data} raised />
      <JournalSection className="mt-2" invocation={data} />
    </SnapshotTimeProvider>
  );
}
