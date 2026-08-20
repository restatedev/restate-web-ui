import type { components } from '@restate/data-access/admin-api-spec';
import { KeyedServiceState } from '@restate/features/state-object-route';
import type { WorkflowRunIdentity } from '@restate/features/workflow-run';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  type ContentPanelTabs,
} from '@restate/ui/content-panel';
import { formatNumber } from '@restate/util/intl';
import { useMemo } from 'react';
import { WorkflowInteractionTooltip } from './WorkflowInteractionTooltip';
import { WorkflowInvocationsTable } from './WorkflowInvocationsTable';

type WorkflowRunDetailsResponse =
  components['schemas']['WorkflowRunDetailsResponse'];
export type WorkflowRunTab = 'recent' | 'state';

const TAB_QUERY_PARAM = 'tab';

export function workflowRunTabFromSearch(
  searchParams: URLSearchParams,
): WorkflowRunTab {
  const tab = searchParams.get(TAB_QUERY_PARAM);
  return tab === 'state' ? 'state' : 'recent';
}

export function workflowRunStateTabHref(searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams);
  params.set(TAB_QUERY_PARAM, 'state');
  return `?${params.toString()}`;
}

function InteractionsTabLabel({
  data,
  isPending,
}: {
  data?: WorkflowRunDetailsResponse;
  isPending: boolean;
}) {
  const count = data?.recentInvocations.length;
  const isTruncated = data?.recentInvocationsTruncated ?? false;
  return (
    <span className="flex items-center gap-1.5">
      <WorkflowInteractionTooltip variant="tab">
        Interactions
      </WorkflowInteractionTooltip>
      {count !== undefined ? (
        <span
          title={
            isTruncated
              ? `At least ${formatNumber(count)} retained interactions`
              : `${formatNumber(count)} retained interactions`
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
  const tabs = useMemo<ContentPanelTabs>(
    () => ({
      items: [
        {
          id: 'recent',
          label: <InteractionsTabLabel data={data} isPending={isPending} />,
        },
        { id: 'state', label: 'State' },
      ],
      defaultId: 'recent',
      queryParam: TAB_QUERY_PARAM,
    }),
    [data, isPending],
  );

  return (
    <ContentPanel className="-mt-14" tabs={tabs}>
      <ContentPanelBody className="pb-32">
        <ContentPanelSection flush>
          {tab === 'recent' ? (
            <WorkflowInvocationsTable
              ariaLabel="Workflow interactions"
              rows={data?.recentInvocations ?? []}
              isPending={isPending}
              error={error}
              truncated={data?.recentInvocationsTruncated}
              limit={data?.recentInvocationsLimit}
              emptyTitle="No interactions yet"
              emptyDescription="Interactions with this Workflow will appear here while they are retained."
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
