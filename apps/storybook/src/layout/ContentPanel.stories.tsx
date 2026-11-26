import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type PropsWithChildren } from 'react';
import { Input as AriaInput, Label, SearchField } from 'react-aria-components';
import { Button } from '@restate/ui-button';
import { Chip, ChipSegment } from '@restate/ui-chip';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
  type ContentPanelTabs,
} from '@restate/ui-content-panel';
import { Header } from '@restate/ui-header';
import { Icon, IconName } from '@restate/ui-icons';
import { FocusShortcutKey } from '@restate/ui-keyboard';
import { ListPageHeader } from '@restate/ui-layout';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui-table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui-tooltip';

const meta = {
  title: 'Layout/ContentPanel',
  component: ContentPanel,
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false, height: '620px' } },
  },
} satisfies Meta<typeof ContentPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

interface Instance {
  id: string;
  inbox: number;
  lockAcquired: string;
}

const instances: Instance[] = [
  { id: 'cart-1042', inbox: 3, lockAcquired: '2 min ago' },
  { id: 'cart-1043', inbox: 0, lockAcquired: '14 min ago' },
  { id: 'cart-1051', inbox: 12, lockAcquired: '1 h ago' },
  { id: 'cart-1068', inbox: 1, lockAcquired: '3 h ago' },
  { id: 'cart-1072', inbox: 0, lockAcquired: 'yesterday' },
  { id: 'cart-1090', inbox: 5, lockAcquired: 'yesterday' },
];

const columns: PanelTableColumn[] = [
  {
    id: 'identity',
    name: 'Virtual Object instance',
    isRowHeader: true,
    minWidth: 320,
  },
  { id: 'inbox', name: 'Inbox', defaultWidth: 220, minWidth: 180 },
  { id: 'lockAcquired', name: 'Lock acquired', defaultWidth: 150 },
];

function InstancesTable() {
  return (
    <PanelTable
      aria-label="Virtual Object instances"
      columns={columns}
      items={instances}
      numOfRows={6}
      renderCell={(item, column) => {
        if (column.id === 'inbox') {
          return <Cell>{item.inbox}</Cell>;
        }
        if (column.id === 'lockAcquired') {
          return <Cell>{item.lockAcquired}</Cell>;
        }
        return (
          <Cell className="overflow-visible">
            <Chip
              left="straight"
              right="straight"
              size="lg"
              href={`/virtual-objects/Cart/${item.id}`}
              aria-label={`Virtual Object instance Cart/${item.id}`}
            >
              <ChipSegment tone="raised">
                <Icon name={IconName.VirtualObject} size="xs" />
                {item.id}
              </ChipSegment>
            </Chip>
          </Cell>
        );
      }}
    />
  );
}

function FilterField() {
  const [filter, setFilter] = useState('');
  return (
    <SearchField
      aria-label="Search Virtual Objects"
      value={filter}
      onChange={setFilter}
      enterKeyHint="search"
      className="group flex min-h-6.5 max-w-[38ch] min-w-0 flex-[1_1_38ch] items-center rounded-lg border border-default bg-surface/70 text-primary shadow-xs hover:bg-surface has-[input[data-focused=true]]:border-accent-strong has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-focus"
    >
      <Label className="sr-only">Search Virtual Objects</Label>
      <Icon name={IconName.Search} size="md" className="ml-1.5 text-subtle" />
      <AriaInput
        placeholder="Search Virtual Objects"
        className="h-6 min-h-6 w-full min-w-0 border-0 bg-transparent py-0.5 pr-1 pl-1 text-sm text-current shadow-none outline-none placeholder:text-subtle focus:border-0 focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      <FocusShortcutKey variant="light" className="mr-1 shrink-0" />
    </SearchField>
  );
}

function RefreshButton() {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          type="button"
          variant="icon"
          aria-label="Refresh Virtual Objects"
          size="sm"
        >
          <Icon name={IconName.Retry} className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent size="sm">Refresh Virtual Objects</TooltipContent>
    </Tooltip>
  );
}

function ListPage({ children }: PropsWithChildren) {
  return (
    <div className="relative flex h-screen min-h-0 flex-col [--cp-toolbar-top:0.75rem] [--cp-toolbar-tuck:0.75rem]">
      <ListPageHeader icon={IconName.VirtualObject} title="Virtual Objects">
        Browse the Virtual Object instances that have invocations in flight.
      </ListPageHeader>
      {children}
    </div>
  );
}

function serviceTabs(services: string[]): ContentPanelTabs {
  return {
    items: services.map((service) => ({
      id: service,
      label: (
        <span className="block max-w-[18ch]">
          <TruncateWithTooltip hideCopy tooltipContent={service}>
            {service}
          </TruncateWithTooltip>
        </span>
      ),
      menuLabel: service,
    })),
    defaultId: services[0],
    queryParam: 'service',
    maxVisible: 5,
  };
}

export const Default: Story = {
  render: () => (
    <ListPage>
      <ContentPanel tabs={serviceTabs(['Cart', 'Checkout', 'Inventory'])}>
        <ContentPanelToolbar className="justify-end gap-2 px-1 pb-1">
          <FilterField />
          <RefreshButton />
        </ContentPanelToolbar>
        <ContentPanelBody>
          <ContentPanelSection flush>
            <InstancesTable />
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    </ListPage>
  ),
};

export const MoreTabs: Story = {
  render: () => (
    <ListPage>
      <ContentPanel
        tabs={serviceTabs([
          'Cart',
          'Checkout',
          'Inventory',
          'Loyalty',
          'Notifications',
          'Payments',
          'Shipping',
        ])}
      >
        <ContentPanelToolbar className="justify-end gap-2 px-1 pb-1">
          <FilterField />
          <RefreshButton />
        </ContentPanelToolbar>
        <ContentPanelBody>
          <ContentPanelSection flush>
            <InstancesTable />
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    </ListPage>
  ),
};

export const WithoutTabs: Story = {
  render: () => (
    <ListPage>
      <ContentPanel>
        <ContentPanelToolbar className="items-center gap-2 px-3 pb-1">
          <FilterField />
          <RefreshButton />
        </ContentPanelToolbar>
        <ContentPanelBody>
          <ContentPanelSection flush>
            <InstancesTable />
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    </ListPage>
  ),
};

function Target() {
  return (
    <Chip left="straight" right="straight" size="lg">
      <ChipSegment tone="raised">
        <Icon name={IconName.VirtualObject} size="xs" />
        Cart / cart-1042
      </ChipSegment>
    </Chip>
  );
}

export const DetailsPage: Story = {
  render: () => (
    <div className="flex h-screen min-h-0 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
      <Header icon={IconName.VirtualObject} iconLabel="Virtual Object">
        <Target />
      </Header>
      <ContentPanel
        className="-mt-[calc(var(--cp-toolbar-tuck,0px)-1.5rem)]"
        tabs={{
          items: [
            { id: 'recent', label: 'Recent invocations' },
            { id: 'exclusive', label: 'Inbox' },
            { id: 'state', label: 'State' },
          ],
          defaultId: 'recent',
          queryParam: 'tab',
        }}
      >
        <ContentPanelToolbar className="justify-end gap-1 px-1 pb-1">
          <RefreshButton />
        </ContentPanelToolbar>
        <ContentPanelBody>
          <ContentPanelSection flush>
            <InstancesTable />
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    </div>
  ),
};
