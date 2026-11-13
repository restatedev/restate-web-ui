import { Fragment, useState } from 'react';
import type { Invocation } from '@restate/data-access-admin-api-spec';
import { useGetInvocationAncestors } from '@restate/data-access-admin-api-hooks';
import { useRestateContext } from '@restate/features-restate-context';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { Spinner } from '@restate/ui-loading';
import { HoverTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';

export const EXPAND_INVOCATIONS_PARAM = 'expand';
export const FOCUS_INVOCATION_PARAM = 'focus';

const MAX_VISIBLE_ANCESTORS = 3;

const styles = tv({
  slots: {
    base: 'flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1.5 text-xs text-muted',
    label: 'mr-1 shrink-0',
    link: 'inline-flex max-w-[36ch] min-w-0 items-center rounded-md border bg-raised px-1.5 py-0.5 font-mono text-2xs text-secondary no-underline shadow-xs hover:wash-tint pressed:wash-tint-strong',
    linkText: 'truncate',
    current:
      'max-w-[36ch] min-w-0 truncate px-1 font-mono text-2xs text-primary',
    unresolved:
      'max-w-[36ch] min-w-0 truncate px-1 font-mono text-2xs text-tertiary',
    separator: 'h-3 w-3 shrink-0 text-subtle',
    more: 'rounded-md border border-dashed px-1.5 py-0.5 font-mono text-2xs text-muted',
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
  const { base, label, link, linkText, current, unresolved, separator, more } =
    styles();

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

  return (
    <nav aria-label="Call chain" className={base({ className })}>
      <span className={label()}>Call chain</span>
      {!ancestors && <Spinner className="h-3 w-3" />}
      {unresolvedTarget && (
        <>
          <span className={unresolved()}>
            {getTargetLabel(unresolvedTarget)}
          </span>
          <Icon name={IconName.ChevronRight} className={separator()} />
        </>
      )}
      {chain.map((ancestor, index) => {
        if (hiddenCount > 0 && index > 0 && index <= hiddenCount) {
          return index === 1 ? (
            <Fragment key="more">
              <Button
                variant="icon"
                className={more()}
                onClick={() => setIsExpanded(true)}
                aria-label={`Show ${hiddenCount} more`}
              >
                +{hiddenCount}
              </Button>
              <Icon name={IconName.ChevronRight} className={separator()} />
            </Fragment>
          ) : null;
        }
        return (
          <Fragment key={ancestor.id}>
            <HoverTooltip content="Open its journal with this invocation expanded">
              <Link
                href={getAncestorHref(
                  baseUrl,
                  ancestor.id,
                  [
                    ...chain.slice(index + 1).map(({ id }) => id),
                    invocation.id,
                  ],
                  invocation.id,
                )}
                variant="secondary"
                className={link()}
              >
                <span className={linkText()}>
                  {getInvocationLabel(ancestor)}
                </span>
              </Link>
            </HoverTooltip>
            <Icon name={IconName.ChevronRight} className={separator()} />
          </Fragment>
        );
      })}
      <span aria-current="page" className={current()}>
        {getInvocationLabel(invocation)}
      </span>
    </nav>
  );
}
