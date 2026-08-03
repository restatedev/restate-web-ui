import type { Invocation } from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import {
  getServiceTargetEntityLink,
  ServiceTarget,
} from '@restate/features/service-target';
import { LimitKey } from '@restate/features/vqueue-ui';
import { Badge } from '@restate/ui/badge';
import { Card, CardHeader, CardLinkRow, CardRow } from '@restate/ui/card';
import { Copy } from '@restate/ui/copy';
import { IconName } from '@restate/ui/icons';
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

function RelatedEntityRow({
  label,
  href,
  ariaLabel,
  children,
}: {
  label: string;
  href: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <CardLinkRow
      href={href}
      aria-label={ariaLabel}
      label={label}
      variant="hero"
    >
      {children}
    </CardLinkRow>
  );
}

export function InvocationDetailsCard({
  invocation,
}: {
  invocation?: Invocation;
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
  const limitKey = invocation.limit_key;
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
          />
        </RelatedEntityRow>
      )}
      {isWorkflow && entityLink && (
        <RelatedEntityRow
          label="Workflow"
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
          />
        </RelatedEntityRow>
      )}
      {limitKey && (
        <CardRow label="Limit key">
          <LimitKey value={limitKey} className="ml-1" />
        </CardRow>
      )}
      {idempotencyId && (
        <CardRow label="Idempotency key">
          <CopyValue value={idempotencyId} />
        </CardRow>
      )}
      {traceId && (
        <CardRow label="Trace ID">
          <CopyValue value={traceId} />
        </CardRow>
      )}
      {restateVersion && (
        <CardRow label="Created by Restate">
          <CopyValue value={restateVersion} />
        </CardRow>
      )}
    </Card>
  );
}
