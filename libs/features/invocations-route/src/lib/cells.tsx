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
  Actions,
  getSearchParams,
  InvocationDeployment,
  InvocationId,
  JournalV2,
  Status,
  Target,
} from '@restate/features/invocation-route';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { useRestateContext } from '@restate/features/restate-context';
import { useLocation } from 'react-router';

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

function withCell(Component: ComponentType<CellProps>, id: ColumnKey) {
  return function ({ isVisible, ...props }: CellProps) {
    const key: keyof Invocation | undefined =
      id !== 'actions'
        ? id !== 'deployment'
          ? id
          : 'pinned_deployment_id'
        : undefined;
    return (
      <Cell className="align-top">
        {isVisible ? (
          <Component {...props} />
        ) : (
          <div className="min-h-6 text-transparent rounded-md bg-slate-200/70 w-fit max-w-full truncate">
            {key && props.invocation[key]}
          </div>
        )}
      </Cell>
    );
  };
}

function JournalCell({ invocation }: CellProps) {
  const { baseUrl } = useRestateContext();
  const location = useLocation();

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
          {invocation.journal_commands_size || invocation.journal_size}{' '}
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
      <PopoverContent className="max-w-2xl">
        <DropdownSection
          title={
            <div className="flex items-center ">
              <div className="mr-12">Journal</div>
              <Link
                variant="secondary-button"
                href={`${baseUrl}/invocations/${invocation.id}${getSearchParams(
                  location.search
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto px-1.5 py-0.5 text-xs font-normal font-sans rounded-md flex items-center gap-1"
              >
                Timeline
                <Icon name={IconName.ExternalLink} className="w-3 h-3" />
              </Link>
            </div>
          }
          className="rounded-2xl overflow-hidden bg-gray-50 "
        >
          <JournalV2
            invocationId={invocation.id}
            className="[&>*]:text-xs [&>*:first-child]:mb-2 [&>*:first-child]:h-9 [&>*:first-child>*:last-child]:h-9 [&>*:first-child_[data-target]>*]:h-9 [&>*]:rounded-[1rem] [&_.target]:rounded-r-[1rem] [&&&_.target>*:last-child>*]:rounded-r-[1rem]"
            withTimeline={false}
          />
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}

const CELLS: Record<ColumnKey, ComponentType<CellProps>> = {
  id: withCell(InvocationIdCell, 'id'),
  target: withCell(TargetCell, 'target'),
  status: withCell(Status, 'status'),
  target_service_ty: withCell(Type, 'target_service_ty'),
  invoked_by: withCell(InvokedBy, 'invoked_by'),
  created_at: withCell(
    withDate({ field: 'created_at', tooltipTitle: 'Created at' }),
    'created_at'
  ),
  modified_at: withCell(
    withDate({ field: 'modified_at', tooltipTitle: 'Modified at' }),
    'modified_at'
  ),
  scheduled_at: withCell(
    withDate({ field: 'scheduled_at', tooltipTitle: 'Scheduled at' }),
    'scheduled_at'
  ),
  running_at: withCell(
    withDate({ field: 'running_at', tooltipTitle: 'Running since' }),
    'running_at'
  ),
  idempotency_key: withCell(
    withField({ field: 'idempotency_key', className: 'font-mono' }),
    'idempotency_key'
  ),
  journal_size: withCell(JournalCell, 'journal_size'),
  retry_count: withCell(withField({ field: 'retry_count' }), 'retry_count'),
  deployment: withCell(InvocationDeployment, 'deployment'),
  target_service_key: withCell(
    withField({ field: 'target_service_key' }),
    'target_service_key'
  ),
  target_service_name: withCell(
    withField({ field: 'target_service_name' }),
    'target_handler_name'
  ),
  target_handler_name: withCell(
    withField({ field: 'target_handler_name' }),
    'target_handler_name'
  ),
  pinned_service_protocol_version: withCell(
    withField({ field: 'pinned_service_protocol_version' }),
    'pinned_service_protocol_version'
  ),
  actions: ({ invocation }) => (
    <Cell className="align-top [&&&]:overflow-visible">
      <Actions invocation={invocation} />
    </Cell>
  ),
};

export function InvocationCell({
  invocation,
  isVisible,
  column,
}: CellProps & { column: ColumnKey }) {
  const Cell = CELLS[column];
  return <Cell invocation={invocation} isVisible={isVisible} />;
}
