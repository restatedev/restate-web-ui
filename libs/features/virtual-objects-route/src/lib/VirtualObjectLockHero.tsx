import type { components } from '@restate/data-access/admin-api-spec';
import { Actions } from '@restate/features/invocation-route';
import {
  Duration,
  getInvocationStatusIntent,
  InvocationId,
  Status,
} from '@restate/features/invocation-ui';
import { LimitKey } from '@restate/features/vqueue-ui';
import { Badge } from '@restate/ui/badge';
import { Card, CardHeader, CardLinkRow, CardRow } from '@restate/ui/card';
import { Icon, IconName } from '@restate/ui/icons';
import { useRestateContext } from '@restate/features/restate-context';
import { RelativeDate, TruncateWithTooltip } from '@restate/ui/tooltip';
import { panelHref } from '@restate/util/panel';

type VirtualObjectLockHolder = components['schemas']['VirtualObjectLockHolder'];

function LockHandler({ handler }: { handler: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
        <Icon name={IconName.Function} className="h-4.5 w-4.5 text-zinc-400" />
      </span>
      <span className="truncate text-xs text-zinc-600 italic">
        {handler}
        <span className="font-mono text-2xs text-zinc-400">()</span>
      </span>
    </span>
  );
}

function fallbackStatusLabel(lockHolder: VirtualObjectLockHolder) {
  const status = lockHolder.status ?? lockHolder.stage;
  return status
    ? status
        .replaceAll('-', ' ')
        .replace(/^./, (character) => character.toUpperCase())
    : undefined;
}

export function VirtualObjectLockHero({
  lockHolder,
}: {
  lockHolder?: VirtualObjectLockHolder;
}) {
  const { baseUrl } = useRestateContext();
  if (!lockHolder) return null;

  const fallbackStatus = fallbackStatusLabel(lockHolder);
  const status = lockHolder.status ?? lockHolder.stage;
  const intent = getInvocationStatusIntent(lockHolder.invocation, status);
  const invocation = lockHolder.invocation;
  const handler = invocation?.target_handler_name;
  const limitKey = lockHolder.limitKey ?? invocation?.limit_key;
  return (
    <Card intent={intent}>
      <CardHeader
        title="Lock"
        icon={IconName.Security}
        action={invocation && <Actions invocation={invocation} mini={false} />}
      >
        {lockHolder.acquiredAt && (
          <Duration
            prefix="held for"
            date={lockHolder.acquiredAt}
            tooltipTitle="Lock acquired at"
            className="min-w-0 px-0"
          />
        )}
      </CardHeader>
      {lockHolder.kind === 'invocation' ? (
        <CardLinkRow
          variant="hero"
          href={`${baseUrl}/invocations/${lockHolder.id}`}
          aria-label={`Open invocation ${lockHolder.id}`}
          className="flex-wrap gap-y-1"
          label={
            <InvocationId
              id={lockHolder.id}
              truncateInMiddle
              popover={false}
              link={false}
              className="w-fit max-w-full min-w-0 text-sm font-normal [&_svg]:text-zinc-400"
            />
          }
        >
          <div className="min-w-0">
            {invocation ? (
              <Status invocation={invocation} mini="md" timeline={false} />
            ) : fallbackStatus ? (
              <Badge>{fallbackStatus}</Badge>
            ) : null}
          </div>
        </CardLinkRow>
      ) : (
        <CardRow variant="hero" className="flex-wrap gap-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <Icon
              name={
                lockHolder.kind === 'state-mutation'
                  ? IconName.Database
                  : IconName.Security
              }
              className="h-4 w-4 shrink-0 text-zinc-400"
            />
            {lockHolder.kind === 'state-mutation' && (
              <span className="shrink-0 text-xs text-zinc-600">
                State mutation
              </span>
            )}
            <TruncateWithTooltip
              tooltipContent={lockHolder.id}
              copyText={lockHolder.id}
            >
              <code className="block max-w-72 truncate text-xs text-zinc-700">
                {lockHolder.id}
              </code>
            </TruncateWithTooltip>
          </div>
          <span className="min-w-2 flex-auto" />
          <div className="min-w-0">
            {invocation ? (
              <Status invocation={invocation} mini="md" timeline={false} />
            ) : fallbackStatus ? (
              <Badge>{fallbackStatus}</Badge>
            ) : null}
          </div>
        </CardRow>
      )}
      {/* TODO: Bring the VQueue ID row back when it is useful on Virtual Object lock cards.
      {(lockHolder.vqueueId ?? invocation?.vqueue_id) && (
        <CardRow label="VQueue ID">
          <VQueueId
            id={lockHolder.vqueueId ?? invocation?.vqueue_id}
            size="md"
            truncateInMiddle
            className="ml-1 w-fit max-w-full min-w-0 [&_svg]:text-zinc-400"
          />
        </CardRow>
      )} */}
      {handler &&
        (invocation?.target_service_name ? (
          <CardLinkRow
            href={panelHref({
              service: invocation.target_service_name,
              handler,
            })}
            aria-label={`Open handler ${handler}`}
            label="Handler"
          >
            <LockHandler handler={handler} />
          </CardLinkRow>
        ) : (
          <CardRow label="Handler">
            <LockHandler handler={handler} />
          </CardRow>
        ))}
      {invocation?.created_at && (
        <CardRow label="Created">
          <RelativeDate
            date={invocation.created_at}
            title="Invocation created at"
          />
        </CardRow>
      )}
      {limitKey && (
        <CardRow label="Limit key">
          <LimitKey value={limitKey} className="ml-1" />
        </CardRow>
      )}
    </Card>
  );
}
