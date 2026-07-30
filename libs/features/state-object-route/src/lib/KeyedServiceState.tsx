import type { RestateCodecOptions } from '@restate/features/codec';
import { useEditStateContext } from '@restate/features/edit-state';
import { Button } from '@restate/ui/button';
import { ContentPanelToolbar } from '@restate/ui/content-panel';
import { DropdownItem } from '@restate/ui/dropdown';
import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { SplitButton } from '@restate/ui/split-button';
import { useMemo } from 'react';
import { StateEntriesTable } from './StateObjectTable';

type KeyedServiceType = 'virtual_object' | 'workflow';

export interface KeyedServiceStateIdentity {
  service: string;
  key: string;
  scope?: string;
}

export function KeyedServiceState({
  identity,
  deploymentId,
  serviceType,
}: {
  identity: KeyedServiceStateIdentity;
  deploymentId?: string;
  serviceType: KeyedServiceType;
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
  const resourceName =
    serviceType === 'workflow' ? 'Workflow' : 'Virtual Object';

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
            if (key === 'edit') openStateDialog(false);
            if (key === 'delete') openStateDialog(true);
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
        serviceType={serviceType}
        emptyPlaceholder={
          <EmptyState
            icon={IconName.Database}
            title="No state found"
            description={`State stored by this ${resourceName} will appear here.`}
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
