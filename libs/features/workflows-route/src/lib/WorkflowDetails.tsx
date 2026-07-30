import type { components } from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import { KeyedServiceState } from '@restate/features/state-object-route';
import type { WorkflowRunIdentity } from '@restate/features/workflow-run';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  type ContentPanelTabs,
} from '@restate/ui/content-panel';
import { Icon, IconName } from '@restate/ui/icons';
import { formatNumber } from '@restate/util/intl';
import { getSearchParams } from '@restate/util/panel';
import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { WorkflowInvocationsTable } from './WorkflowInvocationsTable';

type WorkflowRunDetailsResponse =
  components['schemas']['WorkflowRunDetailsResponse'];
export type WorkflowRunTab = 'shared' | 'state';

const TAB_QUERY_PARAM = 'tab';

export function workflowRunTabFromSearch(
  searchParams: URLSearchParams,
): WorkflowRunTab {
  const tab = searchParams.get(TAB_QUERY_PARAM);
  return tab === 'shared' ? tab : 'state';
}

function SharedTabLabel({
  data,
  isPending,
}: {
  data?: WorkflowRunDetailsResponse;
  isPending: boolean;
}) {
  const count = data?.sharedInvocations.length;
  const isTruncated = data?.sharedInvocationsTruncated ?? false;
  return (
    <span className="flex items-center gap-1.5">
      Shared
      {count !== undefined ? (
        <span
          title={
            isTruncated
              ? `At least ${formatNumber(count)} retained Shared invocations`
              : `${formatNumber(count)} retained Shared invocations`
          }
          className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums"
        >
          {formatNumber(count, true)}
          {isTruncated ? '+' : ''}
        </span>
      ) : isPending ? (
        <span className="inline-block h-3 w-5 animate-pulse rounded bg-zinc-200" />
      ) : null}
    </span>
  );
}

function InvocationTabLabel() {
  return (
    <span className="flex items-center gap-1.5">
      Invocation
      <Icon
        name={IconName.ChevronRight}
        className="h-3.5 w-3.5 text-zinc-400"
      />
    </span>
  );
}

export function WorkflowDetails({
  identity,
  tab,
  deploymentId,
  data,
  error,
  isPending,
}: {
  identity: WorkflowRunIdentity;
  tab: WorkflowRunTab;
  deploymentId?: string;
  data?: WorkflowRunDetailsResponse;
  error: Error | null;
  isPending: boolean;
}) {
  const { baseUrl } = useRestateContext();
  const location = useLocation();
  const runInvocationId = data?.runInvocation.id;
  const runInvocationHref = runInvocationId
    ? `${baseUrl}/invocations/${runInvocationId}${getSearchParams(location.search)}`
    : undefined;
  const tabs = useMemo<ContentPanelTabs>(
    () => ({
      items: [
        { id: 'state', label: 'State' },
        {
          id: 'shared',
          label: <SharedTabLabel data={data} isPending={isPending} />,
        },
        {
          id: 'run',
          label: <InvocationTabLabel />,
          menuLabel: 'Invocation',
          href: runInvocationHref,
          disabled: !runInvocationHref,
        },
      ],
      defaultId: 'state',
      queryParam: TAB_QUERY_PARAM,
    }),
    [data, isPending, runInvocationHref],
  );

  return (
    <ContentPanel className="-mt-14" tabs={tabs}>
      <ContentPanelBody className="pb-32">
        <ContentPanelSection flush>
          {tab === 'shared' ? (
            <WorkflowInvocationsTable
              ariaLabel="Shared Workflow invocations"
              rows={data?.sharedInvocations ?? []}
              isPending={isPending}
              error={error}
              truncated={data?.sharedInvocationsTruncated}
              limit={data?.sharedInvocationsLimit}
              emptyTitle="No Shared invocations found"
              emptyDescription="Calls to this Workflow's Shared handlers will appear here while they are retained."
            />
          ) : (
            <KeyedServiceState
              identity={{
                service: identity.service,
                key: identity.id,
                scope: identity.scope,
              }}
              deploymentId={deploymentId}
              serviceType="workflow"
            />
          )}
        </ContentPanelSection>
      </ContentPanelBody>
    </ContentPanel>
  );
}
