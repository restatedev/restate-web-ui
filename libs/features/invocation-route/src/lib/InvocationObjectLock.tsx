import { useGetVirtualObjectLock } from '@restate/data-access/admin-api-hooks';
import type {
  components,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import { InvocationId } from '@restate/features/invocation-ui';
import { useRestateContext } from '@restate/features/restate-context';
import {
  VirtualObjectInstanceTarget,
  virtualObjectInstanceHref,
  virtualObjectInstanceIdentityFromLockName,
  type VirtualObjectInstanceIdentity,
} from '@restate/features/virtual-object-instance';
import { useState } from 'react';

type VirtualObjectLockHolder = components['schemas']['VirtualObjectLockHolder'];
type BlockedResource = VqueueSnapshot['status']['blockedResource'];

export function useInvocationObjectLock(resource: BlockedResource) {
  const [isOpen, setIsOpen] = useState(false);
  const identity =
    resource?.resource === 'lock'
      ? virtualObjectInstanceIdentityFromLockName(
          resource.lockName,
          resource.scope,
        )
      : undefined;
  const lock = useGetVirtualObjectLock(
    identity?.service ?? '',
    identity?.key ?? '',
    identity?.scope,
    {
      enabled: isOpen && Boolean(identity),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );

  return {
    identity,
    lockHolder: lock.data?.lockHolder,
    onOpenChange: setIsOpen,
  };
}

export function InvocationObjectLockTarget({
  identity,
}: {
  identity: VirtualObjectInstanceIdentity;
}) {
  const { baseUrl } = useRestateContext();
  return (
    <VirtualObjectInstanceTarget
      identity={identity}
      href={virtualObjectInstanceHref(baseUrl, identity)}
      containerClassName="w-full"
    />
  );
}

export function InvocationObjectLockHolderTarget({
  lockHolder,
}: {
  lockHolder: VirtualObjectLockHolder;
}) {
  if (lockHolder.kind === 'invocation') {
    return (
      <InvocationId
        id={lockHolder.id}
        size="md"
        truncateInMiddle
        popover={false}
        className="max-w-full"
      />
    );
  }
  return (
    <code className="block max-w-full truncate text-2xs text-zinc-600">
      {lockHolder.id}
    </code>
  );
}
