import {
  useGetWorkflowRun,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import type { Invocation } from '@restate/data-access/admin-api-spec';
import {
  InvocationId,
  InvocationStatusHeader,
  Status,
} from '@restate/features/invocation-ui';
import {
  workflowScopeFromSearch,
  WorkflowRunTarget,
  type WorkflowRunIdentity,
} from '@restate/features/workflow-run';
import { Breadcrumbs } from '@restate/ui/breadcrumbs';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { IconName } from '@restate/ui/icons';
import { panelHref } from '@restate/util/panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { WorkflowDetails, workflowRunTabFromSearch } from './WorkflowDetails';

interface WorkflowRunSummaryProps {
  invocation?: Invocation;
}

function WorkflowRunSummary({ invocation }: WorkflowRunSummaryProps) {
  if (!invocation) return null;

  return (
    <div className="ml-auto hidden min-w-0 shrink items-center gap-2.5 pr-1 mix-blend-luminosity xl:flex">
      <div className="min-w-0 shrink overflow-hidden">
        <Status invocation={invocation} mini="md" />
      </div>
      <div className="h-4 w-px shrink-0 bg-zinc-300/70" />
      <InvocationId
        id={invocation.id}
        size="md"
        truncateInMiddle
        popover={false}
        className="w-fit max-w-[11rem] min-w-0"
      />
    </div>
  );
}

function Component() {
  const { service = '', workflowId = '' } = useParams<{
    service: string;
    workflowId: string;
  }>();
  const [searchParams] = useSearchParams();
  const scope = workflowScopeFromSearch(searchParams);
  const tab = workflowRunTabFromSearch(searchParams);
  const identity = useMemo<WorkflowRunIdentity>(
    () => ({
      service,
      id: workflowId,
      ...(scope !== undefined ? { scope } : {}),
    }),
    [scope, service, workflowId],
  );
  const {
    data: serviceMetadata,
    error: serviceError,
    isPending: isServicePending,
  } = useServiceDetails(service, {
    enabled: Boolean(service),
    refetchOnMount: true,
    staleTime: 0,
  });
  const {
    data,
    dataUpdatedAt,
    error: runError,
    isPending: isRunPending,
  } = useGetWorkflowRun(service, workflowId, scope, {
    enabled: Boolean(service) && Boolean(workflowId),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  const isWorkflow = serviceMetadata?.ty === 'Workflow';
  const isUnavailable = !isServicePending && (!serviceMetadata || !isWorkflow);
  const error = serviceError ?? runError;
  const runInvocation = data?.runInvocation;

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <div className="flex min-h-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
        <Breadcrumbs className="mt-8 px-5 md:mt-0" />
        <InvocationStatusHeader invocation={runInvocation} className="min-w-0">
          <WorkflowRunTarget
            identity={identity}
            serviceHref={panelHref({ service })}
            variant="header"
          />
          <WorkflowRunSummary invocation={runInvocation} />
        </InvocationStatusHeader>
        {serviceError ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.TriangleAlert}
              intent="danger"
              title="Couldn’t load this Workflow"
            >
              <ErrorBanner
                error={serviceError}
                className="w-full rounded-xl text-left"
              />
            </EmptyState>
          </div>
        ) : isUnavailable ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.Workflow}
              title="Workflow service not found"
              description="The service may have been removed or may no longer be a Workflow."
            />
          </div>
        ) : runError && !data ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.TriangleAlert}
              intent="danger"
              title="Couldn’t load this Workflow run"
            >
              <ErrorBanner
                error={runError}
                className="w-full rounded-xl text-left"
              />
            </EmptyState>
          </div>
        ) : (
          <WorkflowDetails
            identity={identity}
            tab={tab}
            deploymentId={serviceMetadata?.deployment_id}
            data={data}
            error={error}
            isPending={isRunPending}
          />
        )}
      </div>
    </SnapshotTimeProvider>
  );
}

export const workflowRun = { Component };
