import type { components } from '@restate/data-access/admin-api-spec';
import { KeyedServiceState } from '@restate/features/state-object-route';
import type { VirtualObjectInstanceIdentity } from '@restate/features/virtual-object-instance';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  type ContentPanelTabs,
} from '@restate/ui/content-panel';
import { formatNumber } from '@restate/util/intl';
import {
  VirtualObjectInbox,
  VirtualObjectInvocations,
} from './VirtualObjectInbox';
import { useMemo } from 'react';

type InboxResponse = components['schemas']['VirtualObjectInboxResponse'];
type InvocationsResponse =
  components['schemas']['VirtualObjectInvocationsResponse'];
export type VirtualObjectInstanceTab = 'exclusive' | 'recent' | 'state';

const TAB_QUERY_PARAM = 'tab';

function InboxTabLabel({
  count,
  isPending,
}: {
  count?: number;
  isPending: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      Inbox
      {count !== undefined ? (
        <span
          title={`${formatNumber(count)} inbox entries`}
          className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums"
        >
          {formatNumber(count, true)}
        </span>
      ) : isPending ? (
        <span className="inline-block h-3 w-5 animate-pulse rounded bg-zinc-200" />
      ) : null}
    </span>
  );
}

export function virtualObjectInstanceTabFromSearch(
  searchParams: URLSearchParams,
): VirtualObjectInstanceTab {
  const tab = searchParams.get(TAB_QUERY_PARAM);
  if (tab === 'state') return 'state';
  return tab === 'exclusive' ? 'exclusive' : 'recent';
}

export function VirtualObjectDetails({
  identity,
  tab,
  deploymentId,
  inboxData,
  inboxDataUpdatedAt,
  inboxError,
  isInboxPending,
  invocationsData,
  invocationsDataUpdatedAt,
  invocationsError,
  areInvocationsPending,
}: {
  identity: VirtualObjectInstanceIdentity;
  tab: VirtualObjectInstanceTab;
  deploymentId?: string;
  inboxData?: InboxResponse;
  inboxDataUpdatedAt?: number;
  inboxError: Error | null;
  isInboxPending: boolean;
  invocationsData?: InvocationsResponse;
  invocationsDataUpdatedAt?: number;
  invocationsError: Error | null;
  areInvocationsPending: boolean;
}) {
  const inboxCount =
    inboxData?.inboxCount ??
    (inboxData && !inboxData.truncated
      ? (inboxData.rows?.length ?? 0)
      : undefined);
  const tabs = useMemo<ContentPanelTabs>(
    () => ({
      items: [
        {
          id: 'exclusive',
          label: (
            <InboxTabLabel count={inboxCount} isPending={isInboxPending} />
          ),
        },
        { id: 'recent', label: 'Recent invocations' },
        { id: 'state', label: 'State' },
      ],
      defaultId: 'recent',
      queryParam: TAB_QUERY_PARAM,
    }),
    [inboxCount, isInboxPending],
  );

  return (
    <ContentPanel className="-mt-14" tabs={tabs}>
      <ContentPanelBody className="pb-32">
        <ContentPanelSection flush>
          {tab === 'state' ? (
            <KeyedServiceState
              identity={identity}
              deploymentId={deploymentId}
              serviceType="virtual_object"
            />
          ) : tab === 'recent' ? (
            <VirtualObjectInvocations
              data={invocationsData}
              dataUpdatedAt={invocationsDataUpdatedAt}
              error={invocationsError}
              isPending={areInvocationsPending}
            />
          ) : (
            <VirtualObjectInbox
              identity={identity}
              data={inboxData}
              dataUpdatedAt={inboxDataUpdatedAt}
              error={inboxError}
              isPending={isInboxPending}
            />
          )}
        </ContentPanelSection>
      </ContentPanelBody>
    </ContentPanel>
  );
}
