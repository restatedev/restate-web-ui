import type { components } from '@restate/data-access/admin-api-spec';
import type { RestateCodecOptions } from '@restate/features/codec';
import { useEditStateContext } from '@restate/features/edit-state';
import { StateEntriesTable } from '@restate/features/state-object-route';
import type { VirtualObjectInstanceIdentity } from '@restate/features/virtual-object-instance';
import { Button } from '@restate/ui/button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
  type ContentPanelTabs,
} from '@restate/ui/content-panel';
import { DropdownItem } from '@restate/ui/dropdown';
import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { SplitButton } from '@restate/ui/split-button';
import { formatNumber } from '@restate/util/intl';
import {
  VirtualObjectInbox,
  type VirtualObjectInboxMode,
} from './VirtualObjectInbox';
import { useMemo } from 'react';

type InboxResponse = components['schemas']['VirtualObjectInboxResponse'];
export type VirtualObjectInstanceTab = VirtualObjectInboxMode | 'state';

const TAB_QUERY_PARAM = 'tab';

function LockAndInboxTabLabel({
  count,
  isPending,
}: {
  count?: number;
  isPending: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      Lock / inbox
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
  return tab === 'shared' || tab === 'state' ? tab : 'exclusive';
}

export function virtualObjectInboxModeForTab(
  tab: VirtualObjectInstanceTab,
): VirtualObjectInboxMode {
  return tab === 'shared' ? 'shared' : 'exclusive';
}

function VirtualObjectState({
  identity,
  deploymentId,
}: {
  identity: VirtualObjectInstanceIdentity;
  deploymentId?: string;
}) {
  const setEditState = useEditStateContext();
  const codecOptions = useMemo<RestateCodecOptions>(
    () => ({
      service: { value: { name: identity.service } },
      deploymentId: { value: deploymentId },
    }),
    [deploymentId, identity.service],
  );
  const openStateDialog = (isDeleting: boolean) =>
    setEditState({
      isEditing: true,
      isDeleting,
      service: identity.service,
      objectKey: identity.key,
      resolveCodecMetadata: true,
      scope: identity.scope,
    });

  return (
    <>
      <ContentPanelToolbar className="h-full min-h-0 justify-end gap-1.5 pr-1 pb-1 pl-2">
        <SplitButton
          mini={false}
          variant="secondary"
          className="self-end text-0.5xs"
          splitClassName="rounded-r-lg px-1.5 py-0.5"
          menus={
            <>
              <DropdownItem value="edit">Edit state…</DropdownItem>
              <DropdownItem destructive value="delete">
                Delete state…
              </DropdownItem>
            </>
          }
          onSelect={(key) => {
            if (key === 'edit') {
              openStateDialog(false);
            }
            if (key === 'delete') {
              openStateDialog(true);
            }
          }}
        >
          <Button
            variant="secondary"
            className="relative left-px flex items-center gap-1.5 rounded-l-lg rounded-r-none p-0.5 px-2 text-0.5xs"
            onClick={() => openStateDialog(false)}
          >
            <Icon name={IconName.Pencil} className="h-3 w-3" />
            Edit
          </Button>
        </SplitButton>
      </ContentPanelToolbar>
      <StateEntriesTable
        codecOptions={codecOptions}
        serviceName={identity.service}
        serviceKey={identity.key}
        scope={identity.scope}
        serviceType="virtual_object"
        emptyPlaceholder={
          <EmptyState
            icon={IconName.Database}
            title="No state found"
            description="State stored by this Virtual Object will appear here."
          />
        }
        onEditValue={(stateKey) =>
          setEditState({
            isEditing: true,
            isDeleting: false,
            key: stateKey,
            service: identity.service,
            objectKey: identity.key,
            resolveCodecMetadata: true,
            scope: identity.scope,
          })
        }
      />
    </>
  );
}

export function VirtualObjectDetails({
  identity,
  tab,
  deploymentId,
  inboxData,
  inboxDataUpdatedAt,
  inboxError,
  isInboxPending,
}: {
  identity: VirtualObjectInstanceIdentity;
  tab: VirtualObjectInstanceTab;
  deploymentId?: string;
  inboxData?: InboxResponse;
  inboxDataUpdatedAt?: number;
  inboxError: Error | null;
  isInboxPending: boolean;
}) {
  const inboxMode = virtualObjectInboxModeForTab(tab);
  const inboxCount =
    inboxData?.inboxCount ??
    (inboxMode === 'exclusive' && inboxData && !inboxData.truncated
      ? (inboxData.rows?.length ?? 0)
      : undefined);
  const tabs = useMemo<ContentPanelTabs>(
    () => ({
      items: [
        {
          id: 'exclusive',
          label: (
            <LockAndInboxTabLabel
              count={inboxCount}
              isPending={isInboxPending}
            />
          ),
        },
        { id: 'shared', label: 'Shared' },
        { id: 'state', label: 'State' },
      ],
      defaultId: 'exclusive',
      queryParam: TAB_QUERY_PARAM,
    }),
    [inboxCount, isInboxPending],
  );

  return (
    <ContentPanel className="-mt-14" tabs={tabs}>
      <ContentPanelBody className="pb-32">
        <ContentPanelSection flush>
          {tab === 'state' ? (
            <VirtualObjectState
              identity={identity}
              deploymentId={deploymentId}
            />
          ) : (
            <VirtualObjectInbox
              mode={inboxMode}
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
