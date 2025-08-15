import { Button, SubmitButton } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  ComplementaryFooter,
  useParamValue,
} from '@restate/ui/layout';
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
import { Actions } from './Actions';
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
    {
      enabled: false,
    },
  );
  const { queryKey: stateQuery } = useGetVirtualObjectState(
    String(data?.target_service_name),
    String(data?.target_service_key),
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
      <ComplementaryFooter>
        <div className="flex flex-auto flex-col gap-2">
          {getInvocationError && <ErrorBanner error={getInvocationError} />}

          <div className="flex gap-2">
            <ComplementaryClose>
              <Button className="w-full flex-auto grow-0" variant="secondary">
                Close
              </Button>
            </ComplementaryClose>
            <SubmitButton
              className="w-full flex-auto grow-0"
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
      <Link
        variant="icon"
        className="absolute top-1 right-1 rounded-lg"
        href={`${baseUrl}/invocations/${invocationId}${getSearchParams(
          location.search,
          invocationId,
        )}`}
      >
        <Icon name={IconName.Maximize} className="h-4 w-4 text-gray-500" />
      </Link>
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
