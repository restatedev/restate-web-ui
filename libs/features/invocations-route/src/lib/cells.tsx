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
import { tv } from '@restate/util/styles';
import {
  Actions,
  getSearchParams,
  InvocationDeployment,
  InvocationId,
  JournalV2,
  Retention,
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
import { useListSubscriptions } from '@restate/data-access/admin-api-hooks';

function withDate({
  tooltipTitle,
  field,
}: {
  tooltipTitle: string;
  field: Extract<
    keyof Invocation,
    | 'created_at'
    | 'modified_at'
    | 'scheduled_at'
    | 'running_at'
    | 'completion_expiration'
    | 'journal_expiration'
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
      <Badge className="w-full border-none bg-transparent pl-0">
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

function withRetention({
  field,
}: {
  field: Extract<
    keyof Invocation,
    'completion_retention' | 'journal_retention'
  >;
}) {
  return (props: { invocation: Invocation }) => {
    if (field === 'completion_retention') {
      return <Retention invocation={props.invocation} type="completion" />;
    } else {
      return <Retention invocation={props.invocation} type="journal" />;
    }
  };
}

const withFieldStyles = tv({
  base: 'w-full border-none bg-transparent pl-0',
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
    <Badge className="max-w-full bg-zinc-100/80">
      <span className="truncate">{type}</span>
      <ServiceTypeExplainer
        type={type}
        variant="indicator-button"
        className="ml-1 flex-row-reverse"
      />
    </Badge>
  );
}

function InvokedBy({ invocation }: CellProps) {
  const { data } = useListSubscriptions();
  if (invocation.invoked_by === 'ingress') {
    return <Badge className="border-none">Ingress</Badge>;
  } else if (invocation.invoked_by === 'restart_as_new') {
    return (
      <div className="flex w-full items-center gap-0.5">
        <Badge className="border-none">Restarted by</Badge>
        {invocation.restarted_from && (
          <InvocationId
            id={invocation.restarted_from}
            className="w-[20ch] max-w-full min-w-0 pr-1 pl-1.5 text-zinc-500"
          />
        )}
      </div>
    );
  } else if (invocation.invoked_by === 'subscription') {
    return (
      <div className="flex w-full flex-col items-center gap-0.5">
        <div className="flex w-full items-center gap-0.5">
          <Badge className="border-none">Subscription</Badge>
          <span className="text-normal inline-block flex-auto truncate font-mono text-2xs text-gray-500">
            {invocation.invoked_by_subscription_id && (
              <TruncateWithTooltip>
                {invocation.invoked_by_subscription_id}
              </TruncateWithTooltip>
            )}
          </span>
        </div>
        <Badge
          size="xs"
          className="mr-1 ml-1 max-w-full truncate bg-white font-mono"
        >
          <TruncateWithTooltip copyText={invocation.invoked_by_subscription_id}>
            {
              data?.subscriptions.find(
                (subscription) =>
                  subscription.id === invocation.invoked_by_subscription_id,
              )?.source
            }
          </TruncateWithTooltip>
        </Badge>
      </div>
    );
  } else if (invocation.invoked_by_target) {
    return (
      <div className="flex w-full flex-col items-start gap-0.5">
        <Target target={invocation.invoked_by_target} />
        {invocation.invoked_by_id && (
          <InvocationId
            id={invocation.invoked_by_id}
            className="w-[20ch] max-w-full min-w-0 pr-1 pl-1.5 text-zinc-500"
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
          <div className="min-h-6 w-fit max-w-full truncate rounded-md bg-slate-200/70 text-transparent">
            {key && props.invocation[key]}
          </div>
        )}
      </Cell>
    );
  };
}

function RestartedFromCell({ invocation }: CellProps) {
  if (!invocation.restarted_from) {
    return null;
  }
  return <InvocationId id={invocation.restarted_from} />;
}

function JournalCell({ invocation }: CellProps) {
  const { baseUrl } = useRestateContext();
  const location = useLocation();

  if (!invocation.journal_size) {
    if (invocation.completed_at) {
      return (
        <Retention
          invocation={invocation}
          type="journal"
          prefixForCompletion="retention "
        />
      );
    } else {
      return null;
    }
  }

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="secondary"
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs"
        >
          {invocation.journal_commands_size || invocation.journal_size}{' '}
          {formatPlurals(invocation.journal_size, {
            one: 'entry',
            other: 'entries',
          })}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3 w-3 shrink-0 text-gray-500"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-2xl">
        <DropdownSection
          title={
            <div className="flex items-center">
              <div className="mr-12">
                Journal{' '}
                <Retention
                  invocation={invocation}
                  type="journal"
                  prefixForCompletion="retention "
                  prefixForInProgress="retained "
                />
              </div>
              <Link
                variant="secondary-button"
                href={`${baseUrl}/invocations/${invocation.id}${getSearchParams(
                  location.search,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 font-sans text-xs font-normal"
              >
                Timeline
                <Icon name={IconName.ExternalLink} className="h-3 w-3" />
              </Link>
            </div>
          }
          className="overflow-hidden rounded-2xl bg-gray-50"
        >
          <JournalV2
            invocationId={invocation.id}
            className="*:rounded-2xl *:text-xs [&_.target]:rounded-r-2xl [&&&_.target>*:last-child>*]:rounded-r-2xl [&>*:first-child]:mb-2 [&>*:first-child]:h-9 [&>*:first-child_[data-target]>*]:h-9 [&>*:first-child>*:last-child]:h-9"
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
    'created_at',
  ),
  modified_at: withCell(
    withDate({ field: 'modified_at', tooltipTitle: 'Modified at' }),
    'modified_at',
  ),
  scheduled_at: withCell(
    withDate({ field: 'scheduled_at', tooltipTitle: 'Scheduled at' }),
    'scheduled_at',
  ),
  running_at: withCell(
    withDate({ field: 'running_at', tooltipTitle: 'Running since' }),
    'running_at',
  ),
  idempotency_key: withCell(
    withField({ field: 'idempotency_key', className: 'font-mono' }),
    'idempotency_key',
  ),
  journal_size: withCell(JournalCell, 'journal_size'),
  retry_count: withCell(withField({ field: 'retry_count' }), 'retry_count'),
  deployment: withCell(InvocationDeployment, 'deployment'),
  target_service_key: withCell(
    withField({ field: 'target_service_key' }),
    'target_service_key',
  ),
  target_service_name: withCell(
    withField({ field: 'target_service_name' }),
    'target_handler_name',
  ),
  target_handler_name: withCell(
    withField({ field: 'target_handler_name' }),
    'target_handler_name',
  ),
  pinned_service_protocol_version: withCell(
    withField({ field: 'pinned_service_protocol_version' }),
    'pinned_service_protocol_version',
  ),
  actions: ({ invocation }) => (
    <Cell className="align-top [&&&]:overflow-visible">
      <Actions invocation={invocation} />
    </Cell>
  ),
  completion_retention: withCell(
    withRetention({
      field: 'completion_retention',
    }),
    'completion_retention',
  ),
  journal_retention: withCell(
    withRetention({
      field: 'journal_retention',
    }),
    'journal_retention',
  ),
  restarted_from: withCell(RestartedFromCell, 'restarted_from'),
};

export function InvocationCell({
  invocation,
  isVisible,
  column,
}: CellProps & { column: ColumnKey }) {
  const Cell = CELLS[column];
  return <Cell invocation={invocation} isVisible={isVisible} />;
}
