import { Invocation, ServiceType } from '@restate/data-access/admin-api';
import { Cell } from '@restate/ui/table';
import { DateTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { ColumnKey } from './columns';
import { ComponentType } from 'react';
import { Badge } from '@restate/ui/badge';
import { ServiceTypeExplainer } from '@restate/features/explainers';
import { CellProps } from './cells/types';
import { InvocationIdCell } from './cells/InvocationId';
import {
  formatDurations,
  formatNumber,
  formatPlurals,
} from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from 'tailwind-variants';
import {
  InvocationDeployment,
  InvocationId,
  Journal,
  Status,
  Target,
} from '@restate/features/invocation-route';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';

function withDate({
  tooltipTitle,
  field,
}: {
  tooltipTitle: string;
  field: Extract<
    keyof Invocation,
    'created_at' | 'modified_at' | 'scheduled_at' | 'running_at'
  >;
}) {
  return (props: { invocation: Invocation }) => {
    const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

    const value = props.invocation[field];
    if (typeof value !== 'string') {
      return null;
    }
    const { isPast, ...parts } = durationSinceLastSnapshot(value);
    const duration = formatDurations(parts);

    return (
      <Badge className="bg-transparent border-none pl-0 w-full">
        <span className="w-full truncate">
          <span className="font-normal text-zinc-500">{!isPast && 'in '}</span>
          <DateTooltip date={new Date(value)} title={tooltipTitle}>
            {duration}
          </DateTooltip>
          <span className="font-normal text-zinc-500">{isPast && ' ago'}</span>
        </span>
      </Badge>
    );
  };
}

const withFieldStyles = tv({
  base: 'bg-transparent border-none pl-0 w-full',
});
function withField({
  field,
  className,
}: {
  field: keyof Invocation;
  className?: string;
}) {
  return (props: { invocation: Invocation }) => {
    const value = props.invocation[field] ?? '';
    return (
      <Badge className={withFieldStyles({ className })}>
        <TruncateWithTooltip>
          {typeof value === 'number' ? formatNumber(value) : value}
        </TruncateWithTooltip>
      </Badge>
    );
  };
}

const SERVICE_TYPE_NAME: Record<Invocation['target_service_ty'], ServiceType> =
  {
    service: 'Service',
    virtual_object: 'VirtualObject',
    workflow: 'Workflow',
  };

function Type({ invocation }: CellProps) {
  const type = SERVICE_TYPE_NAME[invocation.target_service_ty];
  return (
    <Badge className="bg-zinc-100/80 max-w-full">
      <span className="truncate">{type}</span>
      <ServiceTypeExplainer
        type={type}
        variant="indicator-button"
        className="flex-row-reverse ml-1"
      />
    </Badge>
  );
}

function InvokedBy({ invocation }: CellProps) {
  if (invocation.invoked_by === 'ingress') {
    return <Badge className="border-none">Ingress</Badge>;
  } else if (invocation.invoked_by_target) {
    return (
      <div className="flex flex-col gap-0.5 items-start w-full">
        <Target target={invocation.invoked_by_target} />
        {invocation.invoked_by_id && (
          <InvocationId
            id={invocation.invoked_by_id}
            className="max-w-full w-[20ch] pl-1.5 pr-1 min-w-0 text-zinc-500"
            size="sm"
          />
        )}
      </div>
    );
  }
  return null;
}

function TargetCell({ invocation }: CellProps) {
  return <Target target={invocation.target} />;
}

function withCell(Component: ComponentType<CellProps>) {
  return (props: CellProps) => (
    <Cell className="align-top">
      <Component {...props} />
    </Cell>
  );
}

function JournalCell({ invocation }: CellProps) {
  if (!invocation.journal_size) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="secondary"
          className="px-1.5 py-0.5 flex rounded-md items-center gap-1 text-2xs"
        >
          {invocation.journal_size}{' '}
          {formatPlurals(invocation.journal_size, {
            one: 'entry',
            other: 'entries',
          })}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3 w-3 text-gray-500 shrink-0"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-sm">
        <DropdownSection title="Journal" className="p-3">
          <Journal invocation={invocation} />
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}

const CELLS: Record<ColumnKey, ComponentType<CellProps>> = {
  id: withCell(InvocationIdCell),
  target: withCell(TargetCell),
  status: withCell(Status),
  target_service_ty: withCell(Type),
  invoked_by: withCell(InvokedBy),
  created_at: withCell(
    withDate({ field: 'created_at', tooltipTitle: 'Created at' })
  ),
  modified_at: withCell(
    withDate({ field: 'modified_at', tooltipTitle: 'Modified at' })
  ),
  scheduled_at: withCell(
    withDate({ field: 'scheduled_at', tooltipTitle: 'Scheduled at' })
  ),
  running_at: withCell(
    withDate({ field: 'running_at', tooltipTitle: 'Running since' })
  ),
  idempotency_key: withCell(
    withField({ field: 'idempotency_key', className: 'font-mono' })
  ),
  journal_size: withCell(JournalCell),
  retry_count: withCell(withField({ field: 'retry_count' })),
  deployment: withCell(InvocationDeployment),
  target_service_key: withCell(withField({ field: 'target_service_key' })),
  target_service_name: withCell(withField({ field: 'target_service_name' })),
  target_handler_name: withCell(withField({ field: 'target_handler_name' })),
};

export function InvocationCell({
  invocation,
  column,
}: CellProps & { column: ColumnKey }) {
  const Cell = CELLS[column];
  return <Cell invocation={invocation} />;
}
