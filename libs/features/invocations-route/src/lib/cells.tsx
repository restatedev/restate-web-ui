import { Invocation, ServiceType } from '@restate/data-access/admin-api';
import { Cell } from '@restate/ui/table';
import { DateTooltip } from '@restate/ui/tooltip';
import { ColumnKey } from './columns';
import { ComponentType } from 'react';
import { Badge } from '@restate/ui/badge';
import { ServiceTypeExplainer } from '@restate/features/explainers';
import { Status } from './cells/Status';
import { CellProps } from './cells/types';
import { InvocationIdCell } from './cells/InvocationId';
import { InvokedBy, Target } from './cells/Target';
import {
  formatDateTime,
  formatDurations,
  formatRelativeTime,
} from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';

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

function withCell(Component: ComponentType<CellProps>) {
  return (props: CellProps) => (
    <Cell className="align-top">
      <Component {...props} />
    </Cell>
  );
}

const CELLS: Record<ColumnKey, ComponentType<CellProps>> = {
  id: withCell(InvocationIdCell),
  target: withCell(Target),
  status: withCell(Status),
  type: withCell(Type),
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
};

export function InvocationCell({
  invocation,
  column,
}: CellProps & { column: ColumnKey }) {
  const Cell = CELLS[column];
  return <Cell invocation={invocation} />;
}
