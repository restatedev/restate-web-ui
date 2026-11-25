import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import {
  Collection,
  type Key,
  type SortDescriptor,
} from 'react-aria-components';
import { Badge } from '@restate/ui-badge';
import { Button } from '@restate/ui-button';
import { Chip, ChipGroup, ChipSegment } from '@restate/ui-chip';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui-content-panel';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui-dropdown';
import { EmptyState } from '@restate/ui-empty-state';
import { ErrorBanner } from '@restate/ui-error';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { Ellipsis } from '@restate/ui-loading';
import { SplitButton } from '@restate/ui-split-button';
import {
  Cell,
  PanelTable,
  PanelTableQuickOpen,
  PanelTableQuickOpenCaption,
  Row,
  type PanelTableColumn,
} from '@restate/ui-table';
import {
  DateTooltip,
  RelativeDate,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncateMiddle,
  TruncateTooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui-tooltip';
import {
  formatBytes,
  formatDurations,
  formatNumber,
  formatPlurals,
} from '@restate/util-intl';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util-snapshot-time';
import { tv } from '@restate/util-styles';

const SNAPSHOT = Date.parse('2026-11-23T10:30:00Z');

function ago(minutes: number) {
  return new Date(SNAPSHOT - minutes * 60_000).toISOString();
}

type InvocationStatus =
  | 'running'
  | 'suspended'
  | 'backing-off'
  | 'paused'
  | 'succeeded'
  | 'failed';

interface InvocationRow {
  id: string;
  service: string;
  key?: string;
  handler: string;
  status: InvocationStatus;
  createdAt: string;
}

type InvocationColumn = 'id' | 'target' | 'status' | 'created_at';

const invocations: InvocationRow[] = [
  {
    id: 'inv_1gQNFQQ1HLWM7jo57gxCUiOlQ5nBYztfXV',
    service: 'Checkout',
    handler: 'process',
    status: 'running',
    createdAt: ago(2),
  },
  {
    id: 'inv_1k7Zr3Qv0mVf8bT2NxwcHsLd4uYpA9eJcD',
    service: 'Cart',
    key: 'cart-1042',
    handler: 'add',
    status: 'succeeded',
    createdAt: ago(7),
  },
  {
    id: 'inv_17bFJm4ZxwRk2uTq9CoYh0NsE5VgA8DlPe',
    service: 'Checkout',
    handler: 'process',
    status: 'suspended',
    createdAt: ago(18),
  },
  {
    id: 'inv_1Pq8wXn5LcJ0dRhYt3VzBf6KmU2oSaGeNi',
    service: 'Cart',
    key: 'cart-2210',
    handler: 'add',
    status: 'backing-off',
    createdAt: ago(42),
  },
  {
    id: 'inv_1cHt6YvB9sMf4kQzWe0RxLp3NdUjAgOa7T',
    service: 'Checkout',
    handler: 'process',
    status: 'failed',
    createdAt: ago(95),
  },
  {
    id: 'inv_1Ud2oKe8TyXg5vPjCn7ZsRb0MqLwHaFi3A',
    service: 'Cart',
    key: 'cart-1042',
    handler: 'add',
    status: 'paused',
    createdAt: ago(180),
  },
];

const invocationColumns: PanelTableColumn<InvocationColumn>[] = [
  { id: 'id', name: 'Id', isRowHeader: true, defaultWidth: 170, minWidth: 80 },
  { id: 'target', name: 'Target', minWidth: 200 },
  { id: 'status', name: 'Status', minWidth: 200 },
  { id: 'created_at', name: 'Created at', defaultWidth: 100, minWidth: 80 },
];

const idStyles = tv({
  slots: {
    base: 'relative mr-1 w-fit max-w-full min-w-0 rounded-md font-mono text-tertiary',
    container: 'inline-flex w-full items-center p-px align-middle',
    icon: 'mr-1.5 h-6 w-6 shrink-0 rounded-lg border bg-surface shadow-xs',
    link: "m-0.5 ml-0 rounded-full text-muted outline-offset-0 before:absolute before:inset-0 before:rounded-lg before:content-[''] hover:before:bg-tint-subtle pressed:before:bg-tint",
  },
});

function InvocationId({ id }: { id: string }) {
  const { base, container, icon, link } = idStyles();
  return (
    <div className={base()}>
      <div className={container()}>
        <div className={icon()}>
          <Icon
            name={IconName.Invocation}
            className="h-full w-full p-1 text-muted"
          />
        </div>
        <TruncateWithTooltip copyText={id} tooltipContent={id} alwaysShow>
          <span>
            <TruncateMiddle text={id} />
          </span>
        </TruncateWithTooltip>
        <Link
          href={`/invocations/${id}`}
          aria-label={id}
          variant="secondary"
          className={link()}
        >
          <Icon
            name={IconName.ChevronRight}
            className="h-4 w-4 shrink-0 text-current"
          />
        </Link>
      </div>
    </div>
  );
}

const targetStyles = tv({
  slots: {
    chip: 'max-w-full text-xs font-medium text-tertiary',
    service: 'min-w-0 pl-2 font-medium text-tertiary',
    key: 'min-w-0 pr-2.5 pl-2 font-mono text-[90%] text-muted',
    handler: 'min-w-0 pr-2 pl-1 font-medium text-muted italic',
    serviceIcon: 'h-3 w-3 shrink-0 text-subtle',
    icon: 'h-3.5 w-3.5 shrink-0 text-subtle',
    handlerIcon: '-mr-1 h-5 w-5 shrink-0 text-subtle',
  },
});

function InvocationTarget({
  service,
  serviceKey,
  handler,
}: {
  service: string;
  serviceKey?: string;
  handler: string;
}) {
  const {
    chip,
    service: serviceStyle,
    key,
    handler: handlerStyle,
    serviceIcon,
    icon,
    handlerIcon,
  } = targetStyles();
  const target = [service, serviceKey, handler].filter(Boolean).join('/');
  return (
    <span className="inline-flex w-full max-w-full min-w-0 flex-auto items-center align-middle">
      <TruncateWithTooltip
        tooltipContent={target}
        copyText={target}
        containerClassName="min-w-0 flex-auto"
        overflowVisible
      >
        <ChipGroup density="compact" className="w-full">
          <Chip
            left="straight"
            right="angled"
            size="lg"
            className={chip()}
            containerClassName="flex-[0_1_auto] [&>[data-chip-root]]:w-full"
          >
            <ChipSegment tone="raised" className={serviceStyle()}>
              <Icon name={IconName.Box} className={serviceIcon()} />
              <TruncateTooltipTrigger>{service}</TruncateTooltipTrigger>
            </ChipSegment>
          </Chip>
          {serviceKey && (
            <Chip
              left="angled"
              right="angled"
              size="lg"
              className={chip()}
              containerClassName="flex-[0_2_auto] [&>[data-chip-root]]:w-full"
            >
              <ChipSegment tone="subtle" className={key()}>
                <Icon name={IconName.VirtualObject} className={icon()} />
                <TruncateTooltipTrigger>{serviceKey}</TruncateTooltipTrigger>
              </ChipSegment>
            </Chip>
          )}
          <Chip
            left="angled"
            right="straight"
            size="lg"
            className={chip()}
            containerClassName="flex-[0_1_auto] [&>[data-chip-root]]:w-full"
          >
            <ChipSegment tone="muted" className={handlerStyle()}>
              <Icon name={IconName.Function} className={handlerIcon()} />
              <TruncateTooltipTrigger>{handler}()</TruncateTooltipTrigger>
            </ChipSegment>
          </Chip>
        </ChipGroup>
      </TruncateWithTooltip>
    </span>
  );
}

const statusStyles = tv({
  base: 'relative inline-flex max-w-full gap-2',
  variants: {
    status: {
      running: 'border-dashed',
      suspended: 'border-dashed border-neutral/60 bg-emphasis/40',
      'backing-off': 'border border-dashed border-warning',
      paused: 'border-dashed',
      succeeded: '',
      failed: '',
    },
  },
});

const STATUS_INTENT = {
  running: 'info',
  suspended: 'neutral',
  'backing-off': 'warning',
  paused: 'warning',
  succeeded: 'success',
  failed: 'danger',
} as const;

const STATUS_LABEL: Record<InvocationStatus, string> = {
  running: 'Running',
  suspended: 'Suspended',
  'backing-off': 'Backing-off',
  paused: 'Paused',
  succeeded: 'Succeeded',
  failed: 'Failed',
};

function InvocationStatus({ status }: { status: InvocationStatus }) {
  return (
    <div className="flex flex-row flex-wrap items-baseline gap-0.5">
      <Badge
        intent={STATUS_INTENT[status]}
        className={statusStyles({ status })}
      >
        <Ellipsis visible={status === 'running'}>
          {STATUS_LABEL[status]}
        </Ellipsis>
      </Badge>
    </div>
  );
}

function InvocationDate({ value }: { value: string }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { isPast, ...parts } = durationSinceLastSnapshot(value);
  return (
    <Badge className="w-full border-none bg-transparent pl-0">
      <span className="w-full truncate">
        <span className="font-normal text-muted">
          {isPast ? undefined : 'in '}
        </span>
        <DateTooltip date={new Date(value)} title="Created at">
          {formatDurations(parts)}
        </DateTooltip>
        <span className="text-2xs font-normal text-subtle">
          {isPast && ' ago'}
        </span>
      </span>
    </Badge>
  );
}

function renderInvocationCell(
  invocation: InvocationRow,
  column: InvocationColumn,
) {
  switch (column) {
    case 'id':
      return (
        <Cell className="align-top">
          <InvocationId id={invocation.id} />
        </Cell>
      );
    case 'target':
      return (
        <Cell className="pr-2 align-top">
          <InvocationTarget
            service={invocation.service}
            serviceKey={invocation.key}
            handler={invocation.handler}
          />
        </Cell>
      );
    case 'status':
      return (
        <Cell className="align-top">
          <InvocationStatus status={invocation.status} />
        </Cell>
      );
    case 'created_at':
      return (
        <Cell className="align-top">
          <InvocationDate value={invocation.createdAt} />
        </Cell>
      );
  }
}

function RefreshButton() {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          type="button"
          variant="icon"
          aria-label="Refresh invocations"
          size="sm"
        >
          <Icon name={IconName.Retry} className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent size="sm">Refresh invocations</TooltipContent>
    </Tooltip>
  );
}

const meta = {
  title: 'Data display/Table',
  component: PanelTable,
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '520px' } },
  },
  decorators: [
    (Story) => (
      <SnapshotTimeProvider lastSnapshot={SNAPSHOT}>
        <div className="[--cp-toolbar-top:0.75rem] [--cp-toolbar-tuck:0.75rem]">
          <ContentPanel>
            <ContentPanelToolbar>
              <RefreshButton />
            </ContentPanelToolbar>
            <ContentPanelBody className="pb-8">
              <ContentPanelSection flush>
                <Story />
              </ContentPanelSection>
            </ContentPanelBody>
          </ContentPanel>
        </div>
      </SnapshotTimeProvider>
    ),
  ],
  args: {
    'aria-label': 'Invocations',
    columns: invocationColumns,
    items: invocations,
    renderCell: (row, column) =>
      renderInvocationCell(row as InvocationRow, column.id as InvocationColumn),
  },
} satisfies Meta<typeof PanelTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: { isLoading: true, numOfRows: 6 },
};

export const Empty: Story = {
  args: {
    items: [],
    emptyPlaceholder: (
      <EmptyState
        icon={IconName.Invocation}
        title="No invocations found"
        description="Invocations will appear here as your services handle requests."
      />
    ),
  },
};

export const LoadingFailed: Story = {
  args: {
    items: [],
    emptyPlaceholder: (
      <EmptyState
        icon={IconName.TriangleAlert}
        intent="danger"
        title="Couldn’t load invocations"
      >
        <ErrorBanner
          error={
            new Error(
              'Failed to fetch http://localhost:9070/query/invocations: connection refused',
            )
          }
          className="w-full"
        />
      </EmptyState>
    ),
  },
};

export const QuickOpen: Story = {
  render: function Render(args) {
    const [invocationId, setInvocationId] = useState('');
    return (
      <PanelTable
        {...args}
        bodyHeadingHeight={0}
        caption={
          <PanelTableQuickOpenCaption>
            <PanelTableQuickOpen
              ariaLabel="Go to an invocation"
              label="Go to invocation"
              iconName={IconName.Invocation}
              inputLabel="Invocation ID"
              placeholder="Invocation ID"
              value={invocationId}
              onChange={setInvocationId}
              onOpen={() => undefined}
              isValid={Boolean(invocationId.trim())}
            />
          </PanelTableQuickOpenCaption>
        }
      />
    );
  },
};

type DeploymentColumn = 'deployment' | 'status' | 'services' | 'created_at';

interface DeploymentRow {
  id: string;
  endpoint: string;
  status: 'active' | 'drained';
  services: string[];
  createdAt: string;
}

const deployments: DeploymentRow[] = [
  {
    id: 'dp_14Hk9WtQbU3zN0cXyRfV5pA',
    endpoint: 'http://localhost:9080',
    status: 'active',
    services: ['Checkout', 'Cart'],
    createdAt: ago(60 * 26),
  },
  {
    id: 'dp_11Gq4RsMjY8vD2bLxWePt7C',
    endpoint: 'http://localhost:9081',
    status: 'active',
    services: ['Payments'],
    createdAt: ago(60 * 24 * 3),
  },
  {
    id: 'dp_13Bn7FdKcZ1xH6mTqUsAo9E',
    endpoint: 'http://localhost:9082',
    status: 'drained',
    services: ['Checkout'],
    createdAt: ago(60 * 24 * 12),
  },
];

const deploymentColumns: PanelTableColumn<DeploymentColumn>[] = [
  {
    id: 'deployment',
    name: 'Deployment',
    isRowHeader: true,
    allowsSorting: true,
    defaultWidth: '3.5fr',
    minWidth: 320,
  },
  {
    id: 'status',
    name: 'Status',
    allowsSorting: true,
    defaultWidth: 120,
    minWidth: 100,
    maxWidth: 140,
  },
  {
    id: 'services',
    name: 'Services',
    defaultWidth: 150,
    minWidth: 130,
    maxWidth: 170,
  },
  {
    id: 'created_at',
    name: 'Registered',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    defaultWidth: 150,
    minWidth: 130,
    maxWidth: 170,
  },
];

const deploymentStatusStyles = tv({
  base: 'relative inline-flex max-w-full shrink-0 gap-1.5 py-0.5!',
  variants: {
    status: {
      active: '',
      drained: 'bg-muted text-tertiary',
    },
  },
});

const deploymentDotStyles = tv({
  base: 'absolute h-2 w-2 rounded-full',
  variants: {
    status: {
      active: 'bg-success',
      drained: 'bg-neutral',
    },
    layer: {
      solid: '',
      pulse: 'animate-ping opacity-40',
    },
  },
  compoundVariants: [
    { status: 'drained', layer: 'pulse', className: 'hidden' },
  ],
});

function DeploymentStatus({ status }: { status: DeploymentRow['status'] }) {
  return (
    <Badge
      intent={status === 'active' ? 'success' : 'neutral'}
      className={deploymentStatusStyles({ status })}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span className={deploymentDotStyles({ status, layer: 'pulse' })} />
        <span className={deploymentDotStyles({ status, layer: 'solid' })} />
      </span>
      {status === 'active' ? 'Active' : 'Drained'}
    </Badge>
  );
}

function DeploymentServices({ services }: { services: string[] }) {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="relative inline-flex items-center gap-1 rounded-lg py-1 pr-1 pl-2 text-xs font-medium tabular-nums"
        >
          <Icon name={IconName.Box} size="sm" className="text-subtle" />
          {formatNumber(services.length, true)}{' '}
          <span className="opacity-80">
            {formatPlurals(services.length, {
              one: 'service',
              other: 'services',
            })}
          </span>
          <Icon
            name={IconName.ChevronsUpDown}
            size="sm"
            className="text-subtle"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover placement="bottom end">
        <DropdownSection title="Services">
          <DropdownMenu aria-label="Services in deployment">
            {services.map((service) => (
              <DropdownItem key={service} value={service}>
                {service}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}

const deploymentTableStyles = tv({
  slots: {
    row: 'cursor-pointer [content-visibility:auto]',
    identity: 'flex min-w-0 items-center gap-1.5 py-0.5',
    endpoint:
      'relative -m-1 flex min-w-0 flex-[0_1_auto] flex-row items-center gap-0.5 border border-transparent p-1 text-0.5xs font-medium text-tertiary',
    icon: 'mr-1.5 h-6 w-6 shrink-0 rounded-md border bg-surface shadow-xs',
    deploymentId:
      'block max-w-full min-w-0 truncate rounded-md border border-default bg-subtle/80 px-1.5 py-0.5 font-mono text-2xs font-normal text-subtle',
  },
});

function sortDeployments(
  rows: DeploymentRow[],
  descriptor: SortDescriptor | undefined,
) {
  if (!descriptor) return rows;
  const direction = descriptor.direction === 'descending' ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (descriptor.column === 'status') {
      return a.status.localeCompare(b.status) * direction;
    }
    if (descriptor.column === 'created_at') {
      return (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * direction;
    }
    return a.endpoint.localeCompare(b.endpoint) * direction;
  });
}

function DeploymentsTable() {
  const [selectedIds, setSelectedIds] = useState<Set<Key>>(new Set());
  const [sort, setSort] = useState<SortDescriptor | undefined>({
    column: 'created_at',
    direction: 'descending',
  });
  const { row, identity, endpoint, icon, deploymentId } =
    deploymentTableStyles();

  return (
    <PanelTable
      aria-label="Deployments"
      columns={deploymentColumns}
      items={sortDeployments(deployments, sort)}
      selectionMode="multiple"
      selectedKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      sortDescriptor={sort}
      onSortChange={setSort}
      onRowAction={() => undefined}
      rowClassName={row()}
      toolbar={
        selectedIds.size > 0 ? (
          <>
            <span className="text-sm font-medium text-danger-strong tabular-nums">
              {formatNumber(selectedIds.size)}{' '}
              {formatPlurals(selectedIds.size, {
                one: 'deployment',
                other: 'deployments',
              })}{' '}
              selected
            </span>
            <Button
              variant="secondary"
              className="ml-auto flex items-center gap-1.5 rounded-lg border-danger bg-surface/90 px-2.5 py-1 text-xs text-danger-strong shadow-none hover:border-danger-strong/40 hover:bg-danger-muted pressed:bg-danger-emphasis"
            >
              <Icon name={IconName.Trash} size="sm" />
              Delete…
            </Button>
          </>
        ) : undefined
      }
      toolbarWrapperClassName="h-11 -mb-10"
      toolbarClassName="mt-0.5 h-9 rounded-xl border border-danger/90 bg-danger-subtle/90 pr-1 pl-3 shadow-none supports-[-moz-appearance:none]:bg-danger-subtle"
      renderCell={(deployment, column) => {
        const item = deployment as DeploymentRow;
        if (column.id === 'deployment') {
          return (
            <Cell className="min-w-0 overflow-hidden">
              <div className={identity()}>
                <div className={endpoint()}>
                  <div className={icon()}>
                    <Icon
                      name={IconName.Http}
                      className="h-full w-full p-1 text-subtle"
                    />
                  </div>
                  <TruncateWithTooltip copyText={item.endpoint}>
                    {item.endpoint}
                  </TruncateWithTooltip>
                </div>
                <TruncateWithTooltip
                  copyText={item.id}
                  tooltipContent={item.id}
                  alwaysShow
                  containerClassName="max-w-64 min-w-0 flex-[0_1_auto]"
                >
                  <code className={deploymentId()}>ID {item.id}</code>
                </TruncateWithTooltip>
              </div>
            </Cell>
          );
        }
        if (column.id === 'status') {
          return (
            <Cell>
              <DeploymentStatus status={item.status} />
            </Cell>
          );
        }
        if (column.id === 'services') {
          return (
            <Cell className="[&&&]:overflow-visible">
              <DeploymentServices services={item.services} />
            </Cell>
          );
        }
        return (
          <Cell>
            <RelativeDate date={item.createdAt} title="Registered at" />
          </Cell>
        );
      }}
    />
  );
}

export const SelectableAndSortable: Story = {
  render: () => <DeploymentsTable />,
};

type StateColumn = 'object_key' | 'state_key' | 'value' | 'size' | 'actions';

interface StateEntry {
  name: string;
  value: string;
  size: number;
}

interface StateObject {
  id: string;
  key: string;
  state: StateEntry[];
}

const stateObjects: StateObject[] = [
  {
    id: 'cart-1042',
    key: 'cart-1042',
    state: [
      { name: 'items', value: '[{"sku":"SKU-1842","qty":2}]', size: 412 },
      { name: 'total', value: '4290', size: 6 },
      { name: 'status', value: '"open"', size: 8 },
    ],
  },
  {
    id: 'cart-2210',
    key: 'cart-2210',
    state: [
      { name: 'items', value: '[{"sku":"SKU-0071","qty":1}]', size: 398 },
      { name: 'total', value: '1950', size: 6 },
    ],
  },
  {
    id: 'cart-3087',
    key: 'cart-3087',
    state: [{ name: 'status', value: '"checked-out"', size: 16 }],
  },
];

const stateColumns: PanelTableColumn<StateColumn>[] = [
  {
    id: 'object_key',
    name: 'Virtual object instance',
    isRowHeader: true,
    defaultWidth: 220,
    minWidth: 180,
  },
  { id: 'state_key', name: 'State key', defaultWidth: 140, minWidth: 120 },
  { id: 'value', name: 'Value', minWidth: 240 },
  { id: 'size', name: 'Size', width: 96 },
  { id: 'actions', name: 'Actions', hideLabel: true, width: 72 },
];

const stateStyles = tv({
  slots: {
    objectKeyCell: '[&&&]:overflow-visible',
    objectKey: 'flex min-w-0 items-center gap-2',
    chevron:
      'h-5 w-5 shrink-0 rounded-md p-0.5 text-subtle group-data-[expanded=true]/row:rotate-90',
    chip: 'max-w-full text-xs font-medium text-tertiary',
    key: 'max-w-[28rem] pl-1.5 font-sans text-xs font-medium text-tertiary',
    keyIcon: 'h-3.5 w-3.5 shrink-0 text-subtle',
    stateKeyCell: 'bg-subtle/30',
    sizeText:
      'block max-w-full truncate font-mono text-xs whitespace-nowrap text-muted',
    collapsedPreview:
      'flex max-w-full min-w-0 items-baseline gap-1 overflow-hidden font-mono text-xs whitespace-nowrap text-muted',
    previewKey:
      'inline-block max-w-[18ch] min-w-0 truncate align-bottom font-medium text-tertiary',
    previewValue: 'inline-block max-w-[28ch] truncate align-bottom text-muted',
    punctuation: 'shrink-0 text-subtle',
    actionsCell: '[&&&]:overflow-visible',
    actions: 'flex min-w-0 items-center justify-end gap-1.5',
    editButton:
      'invisible absolute right-full z-2 translate-x-px rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit] group-focus-within:visible group-hover:visible',
    childObjectCell: 'bg-subtle/30',
    childRow: 'bg-surface hover:bg-subtle',
    childRowLast: '[&_td]:border-b! [&_td]:border-default',
    valueText: 'block truncate font-mono text-xs text-muted',
  },
});

function StateActions({ menus }: { menus: ReactNode }) {
  const { actionsCell, actions, editButton } = stateStyles();
  return (
    <Cell className={actionsCell()}>
      <div className={actions()}>
        <SplitButton
          mini
          menus={menus}
          splitClassName="rounded-r-lg px-1.5 py-1"
          onSelect={() => undefined}
        >
          <Button variant="secondary" className={editButton()}>
            Edit
          </Button>
        </SplitButton>
      </div>
    </Cell>
  );
}

function StateObjectCell({
  object,
  column,
}: {
  object: StateObject;
  column: PanelTableColumn<StateColumn>;
}) {
  const {
    objectKeyCell,
    objectKey,
    chevron,
    chip,
    key,
    keyIcon,
    collapsedPreview,
    previewKey,
    previewValue,
    punctuation,
  } = stateStyles();

  if (column.id === 'object_key') {
    return (
      <Cell className={objectKeyCell()}>
        <div className={objectKey()}>
          <Button slot="chevron" variant="icon" className={chevron()}>
            <Icon name={IconName.ChevronRight} className="h-full w-full" />
          </Button>
          <Chip left="straight" right="straight" size="lg" className={chip()}>
            <ChipSegment tone="subtle" className={key()}>
              <Icon name={IconName.VirtualObject} className={keyIcon()} />
              <TruncateTooltipTrigger>{object.key}</TruncateTooltipTrigger>
            </ChipSegment>
          </Chip>
        </div>
      </Cell>
    );
  }
  if (column.id === 'value') {
    return (
      <Cell>
        <span className={collapsedPreview()}>
          <span className={punctuation()}>{'{'}</span>
          {object.state.map((entry, index) => (
            <span key={entry.name} className="inline-flex items-baseline gap-1">
              {index > 0 && <span className={punctuation()}>,</span>}
              <span className={previewKey()}>{entry.name}</span>
              <span className={punctuation()}>:</span>
              <span className={previewValue()}>{entry.value}</span>
            </span>
          ))}
          <span className={punctuation()}>{'}'}</span>
        </span>
      </Cell>
    );
  }
  if (column.id === 'actions') {
    return (
      <StateActions
        menus={
          <>
            <DropdownItem value="edit">Edit…</DropdownItem>
            <DropdownItem destructive value="delete">
              Delete…
            </DropdownItem>
          </>
        }
      />
    );
  }
  return <Cell />;
}

function StateEntryCell({
  entry,
  column,
}: {
  entry: StateEntry;
  column: PanelTableColumn;
}) {
  const { stateKeyCell, sizeText, childObjectCell, valueText } = stateStyles();
  if (column.id === 'object_key') {
    return <Cell className={childObjectCell()} />;
  }
  if (column.id === 'state_key') {
    return (
      <Cell className={stateKeyCell()}>
        <span className="font-mono text-xs font-medium text-tertiary">
          {entry.name}
        </span>
      </Cell>
    );
  }
  if (column.id === 'value') {
    return (
      <Cell>
        <span className={valueText()}>{entry.value}</span>
      </Cell>
    );
  }
  if (column.id === 'size') {
    return (
      <Cell>
        <span className={sizeText()}>{formatBytes(entry.size)}</span>
      </Cell>
    );
  }
  if (column.id === 'actions') {
    return (
      <StateActions menus={<DropdownItem value="edit">Edit…</DropdownItem>} />
    );
  }
  return <Cell />;
}

function StateTable() {
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(
    () => new Set(['cart-1042']),
  );
  const { childRow, childRowLast } = stateStyles();

  return (
    <PanelTable
      aria-label="State"
      columns={stateColumns}
      items={stateObjects}
      treeColumn="object_key"
      expandedKeys={expandedKeys}
      onExpandedChange={(keys) => setExpandedKeys(new Set(keys))}
      onRowAction={(rowId) =>
        setExpandedKeys((previous) => {
          const next = new Set(previous);
          if (next.has(rowId)) {
            next.delete(rowId);
          } else {
            next.add(rowId);
          }
          return next;
        })
      }
      bodyDependencies={[expandedKeys]}
      rowDependencies={[expandedKeys]}
      renderCell={(object, column) => (
        <StateObjectCell
          object={object as StateObject}
          column={column as PanelTableColumn<StateColumn>}
        />
      )}
      renderChildRows={(object, columns) => {
        const { state } = object as StateObject;
        return (
          <Collection
            items={state.map((entry) => ({
              id: `${object.id}\x00${entry.name}`,
              ...entry,
            }))}
            dependencies={[columns]}
          >
            {(entry) => (
              <Row
                id={entry.id}
                columns={columns}
                hasLeadingCell
                className={childRow({
                  className:
                    entry.name === state.at(-1)?.name
                      ? childRowLast()
                      : undefined,
                })}
              >
                {(column) => <StateEntryCell entry={entry} column={column} />}
              </Row>
            )}
          </Collection>
        );
      }}
    />
  );
}

export const TreeRows: Story = {
  render: () => <StateTable />,
};
