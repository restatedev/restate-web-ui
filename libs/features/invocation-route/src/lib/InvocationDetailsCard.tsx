import type {
  Invocation,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import {
  getServiceTargetEntityLink,
  ServiceTarget,
} from '@restate/features/service-target';
import { LimitKey, VQueueIdDisplay } from '@restate/features/vqueue-ui';
import { Badge } from '@restate/ui/badge';
import { Card, CardHeader, CardLinkRow, CardRow } from '@restate/ui/card';
import { Copy } from '@restate/ui/copy';
import { Icon, IconName } from '@restate/ui/icons';
import type { ReactNode } from 'react';

function CopyValue({ value }: { value: string }) {
  return (
    <Badge size="sm" className="ml-1 min-w-0 py-0 pr-0 align-middle font-mono">
      <span className="truncate">{value}</span>
      <Copy
        copyText={value}
        className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
      />
    </Badge>
  );
}

function EntityChevron() {
  return (
    <Icon
      name={IconName.ChevronRight}
      className="-mr-1 h-3.5 w-3.5 text-zinc-400"
    />
  );
}

function DetailLabel({
  icon,
  iconClassName,
  children,
}: {
  icon: IconName;
  iconClassName?: string;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <Icon
          name={icon}
          className={['h-3.5 w-3.5', iconClassName].filter(Boolean).join(' ')}
        />
      </span>
      {children}
    </span>
  );
}

function RelatedEntityRow({
  label,
  icon,
  href,
  ariaLabel,
  children,
}: {
  label: string;
  icon: IconName;
  href: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <CardLinkRow
      href={href}
      aria-label={ariaLabel}
      label={<DetailLabel icon={icon}>{label}</DetailLabel>}
      variant="hero"
      showChevron={false}
    >
      {children}
    </CardLinkRow>
  );
}

export function InvocationDetailsCard({
  invocation,
  vqueueSnapshot,
}: {
  invocation?: Invocation;
  vqueueSnapshot?: VqueueSnapshot;
}) {
  const { baseUrl } = useRestateContext();
  if (!invocation) return null;

  const idempotencyId = invocation.idempotency_key;
  const traceId = invocation.trace_id;
  const createdRestateVersion = invocation.created_using_restate_version;
  const restateVersion =
    createdRestateVersion && !createdRestateVersion.startsWith('0.0.0')
      ? createdRestateVersion
      : undefined;
  const scope = invocation.scope;
  const vqueueId = vqueueSnapshot?.identity.vqueueId ?? invocation.vqueue_id;
  const limitKey = vqueueSnapshot?.identity.limitKey ?? invocation.limit_key;
  const service = invocation.target_service_name;
  const serviceKey = invocation.target_service_key;
  const handler = invocation.target_handler_name;
  const isVirtualObject =
    invocation.target_service_ty === 'virtual_object' &&
    typeof serviceKey === 'string';
  const isWorkflow =
    invocation.target_service_ty === 'workflow' &&
    typeof serviceKey === 'string';
  const entityLink =
    typeof serviceKey === 'string'
      ? getServiceTargetEntityLink({
          baseUrl,
          scope,
          service,
          serviceKey,
          serviceType: invocation.target_service_ty,
        })
      : undefined;

  if (
    !(
      isVirtualObject ||
      isWorkflow ||
      restateVersion ||
      idempotencyId ||
      vqueueId ||
      limitKey ||
      traceId
    )
  ) {
    return null;
  }

  return (
    <Card intent="none">
      <CardHeader title="Details" icon={IconName.Info} />
      {isVirtualObject && entityLink && (
        <RelatedEntityRow
          label="Virtual Object"
          icon={IconName.VirtualObject}
          href={entityLink.href}
          ariaLabel={entityLink.ariaLabel}
        >
          <ServiceTarget
            scope={scope}
            service={service}
            serviceKey={serviceKey}
            handler={handler}
            serviceType="VirtualObject"
            showHandler={false}
            links={false}
            className="min-w-0 flex-[0_1_auto]"
            endContent={<EntityChevron />}
          />
        </RelatedEntityRow>
      )}
      {isWorkflow && entityLink && (
        <RelatedEntityRow
          label="Workflow"
          icon={IconName.Workflow}
          href={entityLink.href}
          ariaLabel={entityLink.ariaLabel}
        >
          <ServiceTarget
            scope={scope}
            service={service}
            serviceKey={serviceKey}
            handler={handler}
            serviceType="Workflow"
            showHandler={false}
            links={false}
            className="min-w-0 flex-[0_1_auto]"
            endContent={<EntityChevron />}
          />
        </RelatedEntityRow>
      )}
      {vqueueId && (
        <CardLinkRow
          href={`${baseUrl}/flow-control/vqueues/${vqueueId}`}
          aria-label={`Open VQueue ${vqueueId}`}
          label={
            <DetailLabel icon={IconName.Layers} iconClassName="rotate-90">
              VQueue
            </DetailLabel>
          }
        >
          <VQueueIdDisplay
            id={vqueueId}
            truncateInMiddle
            className="max-w-48 min-w-0 text-xs"
          />
        </CardLinkRow>
      )}
      {limitKey && (
        <CardRow
          label={<DetailLabel icon={IconName.LimitKey}>Limit key</DetailLabel>}
        >
          <LimitKey value={limitKey} className="ml-1" />
        </CardRow>
      )}
      {idempotencyId && (
        <CardRow
          label={
            <DetailLabel icon={IconName.IdempotencyKey}>
              Idempotency key
            </DetailLabel>
          }
        >
          <CopyValue value={idempotencyId} />
        </CardRow>
      )}
      {traceId && (
        <CardRow
          label={<DetailLabel icon={IconName.Binoculars}>Trace ID</DetailLabel>}
        >
          <CopyValue value={traceId} />
        </CardRow>
      )}
      {restateVersion && (
        <CardRow
          label={
            <DetailLabel icon={IconName.Restate}>
              Created by Restate
            </DetailLabel>
          }
        >
          <CopyValue value={restateVersion} />
        </CardRow>
      )}
    </Card>
  );
}
