import type { components } from '@restate/data-access/admin-api-spec';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatCompactISODuration, formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import type { ReactNode } from 'react';
import { LimitCounterTarget } from './LimitCounterTarget';
import { LimitRuleTarget } from './LimitRuleTarget';
import { LimitValue } from './LimitValue';
import { getVqueueGateLabel } from './metrics';

type VqueueBlockedResource = components['schemas']['VqueueBlockedResource'];

const styles = tv({
  slots: {
    status:
      'relative inline-flex max-w-full min-w-0 shrink items-center gap-1.5 border-dashed py-0.5 pr-0.5',
    reason:
      'flex h-5 min-w-0 items-center gap-1 rounded-md border border-gray-200/80 bg-white px-1.5 py-0.5 text-2xs text-orange-700 shadow-none',
    alert: 'h-3 w-3 shrink-0 text-orange-600',
    label: 'truncate',
    chevrons: 'h-3 w-3 shrink-0 text-gray-500',
    popover: 'w-[min(34rem,calc(100vw-2rem))]',
    details: 'px-3 py-2.5',
    facts: 'divide-y divide-zinc-200/70',
    fact: 'grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 py-2 first:pt-0 last:pb-0',
    targetFact: 'flex flex-col items-stretch gap-2 py-2.5 first:pt-0 last:pb-0',
    factHeading: 'flex min-w-0 flex-wrap items-center gap-2',
    term: 'text-xs text-zinc-400',
    factLevel: 'text-xs font-medium text-zinc-600',
    factSeparator: 'text-xs text-zinc-300',
    factMeta: 'flex shrink-0 items-center gap-2',
    value: 'min-w-0 text-right text-xs text-zinc-700',
    targetValue: 'w-full min-w-0 text-left text-xs text-zinc-700',
    technical: 'font-mono text-2xs break-all',
    target: 'flex w-full min-w-0 justify-start',
    relationship: 'flex flex-col',
    relationshipSource: 'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1',
    relationshipSourceValue: 'relative flex min-w-0 items-center',
    relationshipJoiner: 'text-2xs text-zinc-400',
    relationshipTarget: 'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1',
    relationshipConnector:
      'absolute top-full left-0 flex h-9 w-6 min-w-0 shrink-0 items-center justify-start overflow-visible',
    relationshipConnectorSpacer: 'h-9',
    relationshipLine:
      'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-amber-200/80',
    relationshipVerb: 'relative -translate-y-0.5 rounded-md whitespace-nowrap',
    relationshipArrow:
      'absolute -bottom-0.5 left-1/2 h-3 w-3 -translate-x-1/2 bg-white text-amber-600',
    fallback: 'px-4 py-3 text-xs text-zinc-600',
  },
});

export interface BlockedStatusProps {
  reason?: string;
  resource?: VqueueBlockedResource;
  blockedDuration?: string;
  objectTarget?: ReactNode;
  lockHolderTarget?: ReactNode;
  counterHref?: string;
  ruleHref?: string;
  ruleLimit?: number;
  counterUsage?: number;
  onOpenChange?: (isOpen: boolean) => void;
  details?: ReactNode;
}

interface BlockedFact {
  label: string;
  value: ReactNode;
  technical?: boolean;
  fullWidth?: boolean;
  level?: string;
  meta?: ReactNode;
}

interface BlockedResourceModel {
  heading: string;
  facts: BlockedFact[];
  relationship?: BlockedRelationship;
}

interface BlockedRelationshipNode {
  label?: string;
  value: ReactNode;
  suffix?: ReactNode;
  meta?: ReactNode;
  metaConnector?: string;
}

interface BlockedRelationship {
  source: BlockedRelationshipNode;
  verb: string;
  target: BlockedRelationshipNode;
}

function formattedDuration(duration: string) {
  try {
    return formatCompactISODuration(duration);
  } catch {
    return duration;
  }
}

function RetryAt({ value }: { value: string }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  const timing = durationSinceLastSnapshot(date);
  const duration = formatDurations(timing);
  return (
    <DateTooltip date={date} title="Estimated retry at">
      <time dateTime={value}>
        {timing.isPast ? 'due now' : `in ${duration}`}
      </time>
    </DateTooltip>
  );
}

function blockedCounter(
  resource: VqueueBlockedResource,
  href: string | undefined,
  limit: number | undefined,
  usage: number | undefined,
  inline = false,
) {
  if (!resource.scope) return null;
  const [l1, l2] = resource.limitKey?.split('/') ?? [];
  const counter = (
    <LimitCounterTarget
      scope={resource.scope}
      l1={resource.blockedLevel === 'scope' ? undefined : l1}
      l2={resource.blockedLevel === 'level2' ? l2 : undefined}
      href={href}
      variant={inline ? 'default' : 'table'}
      showChevron={inline && Boolean(href)}
      usage={usage ?? limit}
      limit={limit}
    />
  );
  return inline ? (
    counter
  ) : (
    <span className={styles().target()}>{counter}</span>
  );
}

function blockedLevelLabel(level: VqueueBlockedResource['blockedLevel']) {
  switch (level) {
    case 'scope':
      return 'Scope';
    case 'level1':
      return 'L1';
    case 'level2':
      return 'L2';
  }
}

function resourceModel(
  resource: VqueueBlockedResource,
  objectTarget: ReactNode,
  lockHolderTarget: ReactNode,
  counterHref: string | undefined,
  ruleHref: string | undefined,
  ruleLimit: number | undefined,
  counterUsage: number | undefined,
): BlockedResourceModel | undefined {
  switch (resource.resource) {
    case 'lock': {
      const objectValue =
        objectTarget ??
        (resource.lockName ? (
          <code className={styles().technical()}>{resource.lockName}</code>
        ) : undefined);
      const relationship =
        objectValue && lockHolderTarget
          ? {
              source: {
                value: lockHolderTarget,
              },
              verb: 'has lock on',
              target: {
                value: objectValue,
              },
            }
          : undefined;
      return {
        heading: 'Virtual Object lock',
        relationship,
        facts: relationship
          ? []
          : [
              ...(objectValue
                ? [{ label: 'Object', value: objectValue, fullWidth: true }]
                : []),
              ...(!objectTarget && resource.scope
                ? [{ label: 'Scope', value: resource.scope, technical: true }]
                : []),
              ...(lockHolderTarget
                ? [
                    {
                      label: 'Lock holder',
                      value: lockHolderTarget,
                      fullWidth: true,
                    },
                  ]
                : []),
            ],
      };
    }
    case 'limit-key-concurrency': {
      const counter =
        resource.scope && resource.blockedLevel
          ? blockedCounter(resource, counterHref, ruleLimit, counterUsage, true)
          : undefined;
      const rule = resource.blockedRule ? (
        <LimitRuleTarget
          pattern={resource.blockedRule}
          href={ruleHref}
          showChevron={Boolean(ruleHref)}
        />
      ) : undefined;
      const relationship =
        rule && counter
          ? {
              source: {
                value: counter,
                suffix: 'is at its limit',
              },
              verb: 'limit set by',
              target: {
                value: rule,
                meta:
                  ruleLimit !== undefined ? (
                    <LimitValue value={ruleLimit} />
                  ) : undefined,
              },
            }
          : undefined;
      return {
        heading: 'concurrency limit',
        relationship,
        facts: relationship
          ? []
          : [
              ...(counter
                ? [
                    {
                      label: 'Counter',
                      value: counter,
                      fullWidth: true,
                    },
                  ]
                : []),
              ...(rule
                ? [
                    {
                      label: 'Rule',
                      value: rule,
                      fullWidth: true,
                      level: blockedLevelLabel(resource.blockedLevel),
                      meta:
                        ruleLimit !== undefined ? (
                          <LimitValue value={ruleLimit} />
                        ) : undefined,
                    },
                  ]
                : []),
            ],
      };
    }
    case 'invoker-throttling':
      if (!resource.estimatedRetryAt) return undefined;
      return {
        heading: 'invoker throttling',
        facts: [
          {
            label: 'Estimated retry',
            value: <RetryAt value={resource.estimatedRetryAt} />,
          },
        ],
      };
    default:
      return undefined;
  }
}

function RelationshipSource({
  node,
  verb,
}: {
  node: BlockedRelationshipNode;
  verb: string;
}) {
  const {
    relationshipSource,
    relationshipSourceValue,
    relationshipJoiner,
    relationshipConnector,
    relationshipLine,
    relationshipVerb,
    relationshipArrow,
    term,
    factMeta,
  } = styles();
  return (
    <div className={relationshipSource()}>
      {node.label && <span className={term()}>{node.label}</span>}
      <div className={relationshipSourceValue()}>
        {node.value}
        <div className={relationshipConnector()}>
          <span aria-hidden className={relationshipLine()} />
          <Badge variant="warning" size="xs" className={relationshipVerb()}>
            {verb}
          </Badge>
          <Icon
            aria-hidden
            name={IconName.ArrowDown}
            className={relationshipArrow()}
          />
        </div>
      </div>
      {node.suffix && (
        <span className={relationshipJoiner()}>{node.suffix}</span>
      )}
      {node.meta && (
        <>
          <span className={relationshipJoiner()}>
            {node.metaConnector ?? 'with'}
          </span>
          <span className={factMeta()}>{node.meta}</span>
        </>
      )}
    </div>
  );
}

function RelationshipDetails({
  relationship: relationshipData,
}: {
  relationship: BlockedRelationship;
}) {
  const {
    details,
    relationship,
    relationshipTarget,
    relationshipConnectorSpacer,
    relationshipJoiner,
    factMeta,
  } = styles();
  return (
    <div className={details()}>
      <div className={relationship()}>
        <RelationshipSource
          node={relationshipData.source}
          verb={relationshipData.verb}
        />
        <div aria-hidden className={relationshipConnectorSpacer()} />
        <div className={relationshipTarget()}>
          {relationshipData.target.value}
          {relationshipData.target.meta && (
            <>
              <span className={relationshipJoiner()}>
                {relationshipData.target.metaConnector ?? 'with'}
              </span>
              <span className={factMeta()}>{relationshipData.target.meta}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StructuredDetails({ model }: { model: BlockedResourceModel }) {
  const {
    details,
    facts,
    fact,
    targetFact,
    factHeading,
    term,
    factLevel,
    factSeparator,
    factMeta,
    value,
    targetValue,
    technical,
  } = styles();
  if (model.relationship) {
    return <RelationshipDetails relationship={model.relationship} />;
  }
  return (
    <div className={details()}>
      {model.facts.length > 0 && (
        <dl className={facts()}>
          {model.facts.map((item) => (
            <div
              key={item.label}
              className={item.fullWidth ? targetFact() : fact()}
            >
              <div className={factHeading()}>
                <dt className={term()}>{item.label}</dt>
                {(item.level || item.meta) && (
                  <span aria-hidden className={factSeparator()}>
                    ·
                  </span>
                )}
                {item.level && (
                  <span className={factLevel()}>{item.level}</span>
                )}
                {item.level && item.meta && (
                  <span aria-hidden className={factSeparator()}>
                    ·
                  </span>
                )}
                {item.meta && <span className={factMeta()}>{item.meta}</span>}
              </div>
              <dd
                className={(item.fullWidth ? targetValue : value)({
                  className: item.technical ? technical() : undefined,
                })}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function BlockedStatus({
  reason,
  resource,
  blockedDuration,
  objectTarget,
  lockHolderTarget,
  counterHref,
  ruleHref,
  ruleLimit,
  counterUsage,
  onOpenChange,
  details,
}: BlockedStatusProps) {
  const {
    status,
    reason: reasonStyle,
    alert,
    label,
    chevrons,
    popover,
    fallback,
  } = styles();
  const model = resource
    ? resourceModel(
        resource,
        objectTarget,
        lockHolderTarget,
        counterHref,
        ruleHref,
        ruleLimit,
        counterUsage,
      )
    : undefined;
  const displayReason =
    reason ??
    (resource?.resource ? getVqueueGateLabel(resource.resource) : 'resource');
  const formattedBlockedDuration = blockedDuration
    ? formattedDuration(blockedDuration)
    : undefined;
  const popoverTitle = model ? (
    <span className="flex min-w-0 items-baseline gap-1">
      <span className="shrink-0">Blocked on</span>
      <span className="truncate text-orange-700">{model.heading}</span>
      {formattedBlockedDuration && (
        <>
          <span className="shrink-0 font-normal text-zinc-400">for</span>
          <span className="shrink-0 text-zinc-700 tabular-nums">
            {formattedBlockedDuration}
          </span>
        </>
      )}
    </span>
  ) : undefined;
  const hasPopover = Boolean(
    model || (resource?.resource === undefined && details),
  );

  const reasonContent = (
    <>
      <Icon name={IconName.TriangleAlert} className={alert()} />
      <span className={label()}>on {displayReason}</span>
    </>
  );

  return (
    <Badge variant="warning" className={status()}>
      <span>Blocked</span>
      {hasPopover ? (
        <Popover onOpenChange={onOpenChange}>
          <PopoverTrigger>
            <Button variant="secondary" className={reasonStyle()}>
              {reasonContent}
              <Icon name={IconName.ChevronsUpDown} className={chevrons()} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={popover()}>
            <DropdownSection title={model ? popoverTitle : 'Blocked on'}>
              {model ? (
                <StructuredDetails model={model} />
              ) : (
                <div className={fallback()}>{details ?? displayReason}</div>
              )}
            </DropdownSection>
          </PopoverContent>
        </Popover>
      ) : (
        <span className={reasonStyle()}>{reasonContent}</span>
      )}
    </Badge>
  );
}
