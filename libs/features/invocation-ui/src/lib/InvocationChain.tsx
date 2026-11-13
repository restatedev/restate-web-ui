import { Fragment, useState } from 'react';
import type { Invocation } from '@restate/data-access-admin-api-spec';
import { useGetInvocationAncestors } from '@restate/data-access-admin-api-hooks';
import { useRestateContext } from '@restate/features-restate-context';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { HoverTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';

export const EXPAND_INVOCATIONS_PARAM = 'expand';
export const FOCUS_INVOCATION_PARAM = 'focus';

const MAX_VISIBLE_ANCESTORS = 3;

const styles = tv({
  slots: {
    base: 'flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1.5 text-xs text-muted',
    current:
      'max-w-[36ch] min-w-0 truncate px-1 font-mono text-2xs text-primary',
    separator: 'h-3 w-3 shrink-0 text-subtle',
  },
});

const chipStyles = tv({
  base: 'inline-flex max-w-[36ch] min-w-0 items-center rounded-md border px-1.5 py-0.5 font-mono text-2xs',
  variants: {
    kind: {
      link: 'bg-raised text-secondary no-underline shadow-xs hover:wash-tint pressed:wash-tint-strong',
      more: 'border-dashed text-muted',
      unresolved: 'border-dashed text-tertiary',
      placeholder: 'w-24 animate-pulse border-transparent bg-emphasis/70',
    },
  },
});

function formatTarget(service: string, handler: string, key?: string) {
  return `${service}${key === undefined ? '' : `/${key}`}.${handler}()`;
}

function getInvocationLabel(invocation: Invocation) {
  return formatTarget(
    invocation.target_service_name,
    invocation.target_handler_name,
    invocation.target_service_key,
  );
}

function getTargetLabel(target: string) {
  const [service = '', ...rest] = target.split('/');
  const handler = rest.pop() ?? '';
  return formatTarget(
    service,
    handler,
    rest.length > 0 ? rest.join('/') : undefined,
  );
}

function getAncestorHref(
  baseUrl: string,
  ancestorId: string,
  expandIds: string[],
  focusId: string,
) {
  const searchParams = new URLSearchParams({
    [EXPAND_INVOCATIONS_PARAM]: expandIds.join(','),
    [FOCUS_INVOCATION_PARAM]: focusId,
  });
  return `${baseUrl}/invocations/${ancestorId}?${searchParams.toString()}`;
}

function ChainLink({ href, label }: { href: string; label: string }) {
  return (
    <HoverTooltip content="Open its journal with this invocation expanded">
      <Link
        href={href}
        variant="secondary"
        className={chipStyles({ kind: 'link' })}
      >
        <span className="truncate">{label}</span>
      </Link>
    </HoverTooltip>
  );
}

function Placeholder() {
  return (
    <span aria-hidden className={chipStyles({ kind: 'placeholder' })}>
      &nbsp;
    </span>
  );
}

export function InvocationChain({
  invocation,
  className,
}: {
  invocation: Invocation;
  className?: string;
}) {
  const { baseUrl } = useRestateContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: ancestors } = useGetInvocationAncestors(
    invocation.invoked_by_id,
  );
  const { base, current, separator } = styles();

  if (!invocation.invoked_by_id) {
    return null;
  }

  const chain = ancestors ? [...ancestors].reverse() : [];
  const oldest = chain[0] ?? invocation;
  const unresolvedTarget = oldest.invoked_by_id
    ? oldest.invoked_by_target
    : undefined;
  const hiddenCount =
    !isExpanded && chain.length > MAX_VISIBLE_ANCESTORS
      ? chain.length - MAX_VISIBLE_ANCESTORS
      : 0;
  const chevron = <Icon name={IconName.ChevronRight} className={separator()} />;

  return (
    <nav aria-label="Invoked by" className={base({ className })}>
      {!ancestors ? (
        <>
          <Placeholder />
          {chevron}
          {invocation.invoked_by_target ? (
            <ChainLink
              href={getAncestorHref(
                baseUrl,
                invocation.invoked_by_id,
                [invocation.id],
                invocation.id,
              )}
              label={getTargetLabel(invocation.invoked_by_target)}
            />
          ) : (
            <Placeholder />
          )}
          {chevron}
        </>
      ) : (
        <>
          {unresolvedTarget && (
            <>
              <span className={chipStyles({ kind: 'unresolved' })}>
                <span className="truncate">
                  {getTargetLabel(unresolvedTarget)}
                </span>
              </span>
              {chevron}
            </>
          )}
          {chain.map((ancestor, index) => {
            if (hiddenCount > 0 && index > 0 && index <= hiddenCount) {
              return index === 1 ? (
                <Fragment key="more">
                  <Button
                    variant="icon"
                    className={chipStyles({ kind: 'more' })}
                    onClick={() => setIsExpanded(true)}
                    aria-label={`Show ${hiddenCount} more`}
                  >
                    +{hiddenCount}
                  </Button>
                  {chevron}
                </Fragment>
              ) : null;
            }
            return (
              <Fragment key={ancestor.id}>
                <ChainLink
                  href={getAncestorHref(
                    baseUrl,
                    ancestor.id,
                    [
                      ...chain.slice(index + 1).map(({ id }) => id),
                      invocation.id,
                    ],
                    invocation.id,
                  )}
                  label={getInvocationLabel(ancestor)}
                />
                {chevron}
              </Fragment>
            );
          })}
        </>
      )}
      <span aria-current="page" className={current()}>
        {getInvocationLabel(invocation)}
      </span>
    </nav>
  );
}
