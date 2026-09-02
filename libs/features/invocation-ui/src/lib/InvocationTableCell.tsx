import {
  getInvocationStatusFromVqueue,
  getInvocationStatusLabel,
  type Invocation,
  type InvocationComputedStatus2,
  type InvocationSummaryStage,
} from '@restate/data-access/admin-api-spec';
import { Badge } from '@restate/ui/badge';
import { Chip, ChipSegment } from '@restate/ui/chip';
import { Icon, IconName } from '@restate/ui/icons';
import { Cell } from '@restate/ui/table';
import {
  DateTooltip,
  TruncateTooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import { useOnboarding } from '@restate/util/feature-flag';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { panelHref } from '@restate/util/panel';
import { LimitKey, VQueueId } from '@restate/features/vqueue-ui';
import { ServiceTarget, Target } from '@restate/features/service-target';
import { InvocationId } from './InvocationId';
import { InvocationStatusBadge, Status } from './Status';

export const INVOCATION_TABLE_COLUMN_CONFIG = {
  id: { name: 'Id', defaultWidth: 170 },
  vqueue_id: { name: 'VQueue ID', defaultWidth: 170 },
  target: { name: 'Target', minWidth: 200 },
  target_handler_name: { name: 'Handler', defaultWidth: 180 },
  limit_key: { name: 'Limit key', defaultWidth: 160 },
  status: { name: 'Status', minWidth: 200 },
  created_at: { name: 'Created at', defaultWidth: 100 },
} as const;

export type InvocationTableColumnKey =
  keyof typeof INVOCATION_TABLE_COLUMN_CONFIG;

export interface InvocationTableRow {
  id: string;
  vqueue_id?: string;
  target?: string;
  target_service_name?: string;
  target_service_key?: string;
  target_handler_name?: string;
  target_service_ty?: Invocation['target_service_ty'];
  scope?: string;
  limit_key?: string;
  stage?: string;
  status?: string;
  created_at?: string;
}

const invocationTableColumnKeys = new Set<string>(
  Object.keys(INVOCATION_TABLE_COLUMN_CONFIG),
);

export function isInvocationTableColumnKey(
  value: string,
): value is InvocationTableColumnKey {
  return invocationTableColumnKeys.has(value);
}

const invocationIdStyles = tv({
  base: 'mr-1 w-fit max-w-full min-w-0 rounded-md [--pulse-size:2px]',
  variants: {
    isOnboarding: { true: 'animate-pulseButton', false: '' },
  },
});

const invocationTableCellStyles = tv({
  base: 'align-top',
  variants: {
    isTarget: {
      true: 'pr-2',
      false: '',
    },
  },
});

function InvocationTableId({
  id,
  size = 'default',
}: {
  id: string;
  size?: 'sm' | 'md' | 'default';
}) {
  const isOnboarding = useOnboarding();
  return (
    <InvocationId
      id={id}
      className={invocationIdStyles({ isOnboarding })}
      isLive={isOnboarding}
      size={size}
      truncateInMiddle
      popover={false}
    />
  );
}

function fallbackStatusLabel(status: string) {
  const label = status.replaceAll('-', ' ');
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function canonicalInvocationStatus(
  row: InvocationTableRow,
): InvocationComputedStatus2 | undefined {
  const vqueueStatus = getInvocationStatusFromVqueue({
    stage: row.stage as InvocationSummaryStage | undefined,
    status: row.status,
  });
  if (vqueueStatus) return vqueueStatus;
  return row.status && getInvocationStatusLabel(row.status)
    ? (row.status as InvocationComputedStatus2)
    : undefined;
}

function InvocationTableStatus({
  row,
  invocation,
}: {
  row: InvocationTableRow;
  invocation?: Invocation;
}) {
  if (invocation) {
    return <Status invocation={invocation} />;
  }
  if (!row.status) {
    return null;
  }
  const status = canonicalInvocationStatus(row);
  if (status) {
    return <InvocationStatusBadge status={status} />;
  }
  return <Badge>{fallbackStatusLabel(row.status)}</Badge>;
}

export function InvocationHandler({
  service,
  handler,
}: {
  service?: string;
  handler?: string;
}) {
  if (!handler) return null;

  return (
    <span className="inline-flex max-w-full rounded-lg shadow-xs">
      <TruncateWithTooltip tooltipContent={handler} copyText={handler}>
        <Chip
          href={service ? panelHref({ service, handler }) : undefined}
          aria-label={service ? `Open ${service}/${handler}` : undefined}
          className="max-w-full bg-white text-zinc-600 italic shadow-none"
        >
          <ChipSegment className="max-w-[18rem] px-1.5">
            <Icon
              name={IconName.Function}
              className="-mr-0.5 h-4 w-4 shrink-0 text-zinc-400"
            />
            <TruncateTooltipTrigger>{handler}</TruncateTooltipTrigger>
            {service && (
              <Icon
                name={IconName.ChevronRight}
                className="h-3.5 w-3.5 shrink-0 text-zinc-400"
              />
            )}
          </ChipSegment>
        </Chip>
      </TruncateWithTooltip>
    </span>
  );
}

export function InvocationTableDate({
  value,
  tooltipTitle = 'Created at',
  pastPrefix,
}: {
  value?: string;
  tooltipTitle?: string;
  pastPrefix?: string;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  if (!value) {
    return null;
  }
  const { isPast, ...parts } = durationSinceLastSnapshot(value);
  const duration = formatDurations(parts);

  return (
    <Badge className="w-full border-none bg-transparent pl-0">
      <span className="w-full truncate">
        <span className="font-normal text-zinc-500">
          {isPast ? pastPrefix : 'in '}
        </span>
        <DateTooltip date={new Date(value)} title={tooltipTitle}>
          {duration}
        </DateTooltip>
        <span className="text-2xs font-normal text-zinc-500/80">
          {isPast && ' ago'}
        </span>
      </span>
    </Badge>
  );
}

function visibleCellContent(
  column: InvocationTableColumnKey,
  row: InvocationTableRow,
  invocation?: Invocation,
) {
  switch (column) {
    case 'id':
      return <InvocationTableId id={row.id} />;
    case 'vqueue_id':
      return row.vqueue_id ? (
        <VQueueId
          id={row.vqueue_id}
          popover={false}
          truncateInMiddle
          className="mr-1 w-fit max-w-full min-w-0 rounded-md"
        />
      ) : null;
    case 'target':
      return row.target_service_name && row.target_handler_name ? (
        <ServiceTarget
          scope={row.scope}
          service={row.target_service_name}
          serviceKey={row.target_service_key}
          handler={row.target_handler_name}
          serviceType={row.target_service_ty}
          className="w-full"
        />
      ) : row.target ? (
        <Target target={row.target} className="w-full" />
      ) : null;
    case 'target_handler_name':
      return (
        <InvocationHandler
          service={row.target_service_name}
          handler={row.target_handler_name}
        />
      );
    case 'limit_key':
      return <LimitKey value={row.limit_key} variant="table" />;
    case 'status':
      return <InvocationTableStatus row={row} invocation={invocation} />;
    case 'created_at':
      return <InvocationTableDate value={row.created_at} />;
  }
}

export function InvocationTableCell({
  column,
  row,
  invocation,
  isVisible = true,
  className,
}: {
  column: InvocationTableColumnKey;
  row: InvocationTableRow;
  invocation?: Invocation;
  isVisible?: boolean;
  className?: string;
}) {
  const value = row[column];
  return (
    <Cell
      className={invocationTableCellStyles({
        isTarget: column === 'target',
        className,
      })}
    >
      {isVisible ? (
        visibleCellContent(column, row, invocation)
      ) : (
        <div className="min-h-6 w-fit max-w-full truncate rounded-md bg-slate-200/70 text-transparent">
          {value}
        </div>
      )}
    </Cell>
  );
}
