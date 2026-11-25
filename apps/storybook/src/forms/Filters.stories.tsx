import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, type ComponentProps, type PropsWithChildren } from 'react';
import { Form } from 'react-router';
import { userEvent, within } from 'storybook/test';
import { Button, SubmitButton } from '@restate/ui-button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui-content-panel';
import { EmptyState } from '@restate/ui-empty-state';
import {
  AddFilterTrigger,
  FilterBuilder,
  FilterChip,
  FilteredResultsCaption,
  FilterShortcutTrigger,
  QueryClause,
  useFilterBuilder,
  type QueryClauseSchema,
  type QueryClauseType,
} from '@restate/ui-filter-builder';
import { Icon, IconName } from '@restate/ui-icons';
import { SubmitShortcutKey } from '@restate/ui-keyboard';
import {
  Cell,
  PanelTable,
  PanelTableQuickOpen,
  PanelTableQuickOpenCaption,
  type PanelTableColumn,
} from '@restate/ui-table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui-tooltip';

const dateOperations = [
  { value: 'BEFORE' as const, label: 'before' },
  { value: 'AFTER' as const, label: 'after' },
  { value: 'BETWEEN' as const, label: 'between' },
];

const nullableStringOperations = [
  { value: 'IS NULL' as const, label: 'is null' },
  { value: 'IS NOT NULL' as const, label: 'is not null' },
  { value: 'EQUALS' as const, label: 'is' },
  { value: 'CONTAINS' as const, label: 'contains' },
  { value: 'NOT_CONTAINS' as const, label: 'not contains' },
];

const listOperations = [
  { value: 'IN' as const, label: 'is' },
  { value: 'NOT_IN' as const, label: 'is not' },
];

const schema = [
  {
    id: 'id',
    label: 'Invocation Id',
    operations: [{ value: 'EQUALS', label: 'is' }],
    type: 'STRING',
  },
  {
    id: 'status',
    label: 'Status',
    operations: listOperations,
    type: 'STRING_LIST',
    options: [
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'pending', label: 'Pending' },
      { value: 'running', label: 'Running' },
      { value: 'backing-off', label: 'Backing-off' },
      { value: 'suspended', label: 'Suspended' },
      { value: 'paused', label: 'Paused' },
      { value: 'killed', label: 'Killed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'succeeded', label: 'Succeeded' },
      { value: 'failed', label: 'Failed' },
    ],
  },
  {
    id: 'target_service_name',
    label: 'Service',
    operations: listOperations,
    type: 'STRING_LIST',
    options: [
      { value: 'Cart', label: 'Cart' },
      { value: 'Checkout', label: 'Checkout' },
    ],
  },
  {
    id: 'target_service_key',
    label: 'Service key',
    operations: [{ value: 'EQUALS', label: 'is' }],
    type: 'STRING',
  },
  {
    id: 'target_handler_name',
    label: 'Handler',
    operations: listOperations,
    type: 'STRING_LIST',
    options: [
      { value: 'add', label: 'add' },
      { value: 'process', label: 'process' },
    ],
  },
  {
    id: 'idempotency_key',
    label: 'Idempotency key',
    operations: [
      { value: 'EQUALS', label: 'is' },
      { value: 'IS NOT NULL', label: 'is not null' },
    ],
    type: 'STRING',
  },
  {
    id: 'created_at',
    label: 'Created',
    operations: dateOperations,
    type: 'DATE',
  },
  {
    id: 'scope',
    label: 'Scope',
    operations: nullableStringOperations,
    type: 'STRING',
  },
] satisfies QueryClauseSchema<QueryClauseType>[];

function schemaFor(id: string) {
  const clause = schema.find((item) => item.id === id);
  if (!clause) throw new Error(`Unknown filter: ${id}`);
  return clause as QueryClauseSchema<QueryClauseType>;
}

const defaultClauses = [
  new QueryClause(schemaFor('status'), {
    operation: 'IN',
    value: ['running', 'suspended'],
  }),
  new QueryClause(schemaFor('target_service_name'), {
    operation: 'IN',
    value: ['Checkout'],
  }),
];

const valueTypeClauses = [
  new QueryClause(schemaFor('status'), {
    operation: 'NOT_IN',
    value: ['succeeded', 'failed'],
  }),
  new QueryClause(schemaFor('target_handler_name'), {
    operation: 'IN',
    value: ['process'],
  }),
  new QueryClause(schemaFor('target_service_key'), {
    operation: 'EQUALS',
    value: 'cart-1042',
  }),
  new QueryClause(schemaFor('created_at'), {
    operation: 'BETWEEN',
    value: {
      start: new Date('2026-11-22T09:00:00Z'),
      end: new Date('2026-11-23T09:00:00Z'),
    },
  }),
  new QueryClause(schemaFor('scope'), { operation: 'IS NULL' }),
];

const noClauses: QueryClause<QueryClauseType>[] = [];

function FilterScope({
  clauses,
  children,
}: PropsWithChildren<{ clauses: QueryClause<QueryClauseType>[] }>) {
  const query = useFilterBuilder(clauses);
  return (
    <FilterBuilder query={query} schema={schema} multiple>
      {children}
    </FilterBuilder>
  );
}

const withFilterBuilder: Decorator = (Story, context) => (
  <FilterScope
    clauses={
      (context.parameters['filterClauses'] as
        | QueryClause<QueryClauseType>[]
        | undefined) ?? defaultClauses
    }
  >
    <Story />
  </FilterScope>
);

const columns: PanelTableColumn[] = [
  { id: 'id', name: 'Id', isRowHeader: true, defaultWidth: 170, minWidth: 80 },
  { id: 'target', name: 'Target', minWidth: 200 },
  { id: 'status', name: 'Status', minWidth: 200 },
  { id: 'created_at', name: 'Created at', defaultWidth: 100, minWidth: 80 },
];

function ListPage({
  hasFilters,
  children,
}: PropsWithChildren<{ hasFilters: boolean }>) {
  const items = useMemo<{ id: string }[]>(() => [], []);
  return (
    <div className="[--cp-toolbar-top:0.75rem] [--cp-toolbar-tuck:0.75rem]">
      <ContentPanel>
        <ContentPanelToolbar className="justify-end gap-2 px-1 pb-1">
          <Form
            className="min-w-0 flex-auto"
            onSubmit={(event) => event.preventDefault()}
          >
            {children}
          </Form>
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
        </ContentPanelToolbar>
        <ContentPanelBody className="pb-8">
          <ContentPanelSection flush>
            <PanelTable
              aria-label="Invocations"
              bodyHeadingHeight={0}
              columns={columns}
              items={items}
              caption={
                <PanelTableQuickOpenCaption
                  notice={
                    hasFilters ? (
                      <FilteredResultsCaption
                        noun="invocations"
                        className="m-0 h-9 w-full shrink-0 rounded-xl px-2.5"
                        onClear={() => undefined}
                      />
                    ) : undefined
                  }
                >
                  <PanelTableQuickOpen
                    ariaLabel="Go to an invocation"
                    label="Go to invocation"
                    iconName={IconName.Invocation}
                    inputLabel="Invocation ID"
                    placeholder="Invocation ID"
                    value=""
                    onChange={() => undefined}
                    onOpen={() => undefined}
                    isValid={false}
                  />
                </PanelTableQuickOpenCaption>
              }
              emptyPlaceholder={
                <EmptyState
                  icon={IconName.Invocation}
                  title="No invocations found"
                  description={
                    hasFilters
                      ? 'No invocations match the current filters. Try adjusting or clearing them.'
                      : 'Invocations will appear here as your services handle requests.'
                  }
                />
              }
              renderCell={() => <Cell />}
            />
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    </div>
  );
}

const listPage: Decorator = (Story, context) => (
  <ListPage
    hasFilters={
      (
        (context.parameters['filterClauses'] as unknown[] | undefined) ??
        defaultClauses
      ).length > 0
    }
  >
    <Story />
  </ListPage>
);

const lightTriggerProps = {
  variant: 'toolbar',
  renderOption: (item: QueryClause<QueryClauseType>) => (
    <div className="flex items-baseline gap-2">
      <span>{item.label}</span>
      <span className="font-mono text-xs opacity-60">
        {item.operations.map((operation) => operation.label).join(' / ')}
      </span>
    </div>
  ),
} satisfies Partial<ComponentProps<typeof AddFilterTrigger>>;

const meta = {
  title: 'Forms/Filters',
  component: AddFilterTrigger,
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '620px' } },
  },
  decorators: [withFilterBuilder],
  args: {
    placeholder: 'Filter invocations…',
    title: 'Invocation filters',
  },
  render: (args) => (
    <AddFilterTrigger {...args} {...lightTriggerProps}>
      {(props) => (
        <FilterChip
          {...props}
          appearance="light"
          showRemove
          popoverPlacement="bottom"
        />
      )}
    </AddFilterTrigger>
  ),
} satisfies Meta<typeof AddFilterTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

const onList: Story['decorators'] = [listPage];

export const Default: Story = { decorators: onList };

export const NoFilters: Story = {
  decorators: onList,
  parameters: { filterClauses: noClauses },
};

export const ValueTypes: Story = {
  decorators: onList,
  parameters: { filterClauses: valueTypeClauses },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole(
        'button',
        { name: '5 active filters' },
        { timeout: 5000 },
      ),
    );
  },
};

export const EditingAFilter: Story = {
  decorators: onList,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole('button', {
        name: 'Edit Status filter',
      }),
    );
  },
};

export const AddingAFilter: Story = {
  decorators: onList,
  parameters: { filterClauses: noClauses },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole('combobox', {
        name: 'Invocation filters',
      }),
    );
  },
};

const shortcuts = ['Running', 'In-flight', 'Held up', 'All'];

const darkPage: Decorator = (Story) => (
  <div className="flex justify-center">
    <div className="max-w-full rounded-xl border-inverse bg-linear-to-b from-inverse/90 to-inverse/80 px-0 py-0 text-inverse-secondary shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-edge/40%)] filter-[drop-shadow(0_8px_6px_--theme(--box-shadow-color-default/15%))_drop-shadow(0_4px_3px_--theme(--box-shadow-color-default/20%))] backdrop-blur-xl *:max-w-full md:max-w-[calc(100%-6rem)]">
      <Form
        className="relative flex w-[60rem] flex-col"
        onSubmit={(event) => event.preventDefault()}
      >
        <Story />
        <div className="absolute right-0 bottom-0 left-0 flex h-8 w-full overflow-hidden rounded-b-xl mask-[linear-gradient(to_right,transparent_0,black_6px,black_calc(100%-192px),transparent_calc(100%-100px))]">
          <div className="flex [scrollbar-width:thin] items-center gap-2 overflow-auto pb-0.5 pl-1.5">
            <div className="ml-1 flex h-full shrink-0 items-center text-xs text-inverse-muted">
              Quick Filters:
            </div>
            {shortcuts.map((label) => (
              <Button
                key={label}
                variant="icon"
                className="max-h-5 shrink-0 rounded-full border border-inverse-tint bg-transparent px-3 py-0.5 text-xs text-inverse-secondary hover:bg-inverse-tint-subtle pressed:bg-inverse-tint"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <SubmitButton className="absolute right-1 bottom-1 flex h-7 items-center gap-2 rounded-lg py-0 pr-0.5 pl-4 pointer-coarse:pr-4">
          Query
          <SubmitShortcutKey />
        </SubmitButton>
      </Form>
    </div>
  </div>
);

export const InvocationsToolbar: Story = {
  decorators: [darkPage],
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '460px' } },
  },
  render: () => (
    <AddFilterTrigger
      MenuTrigger={FilterShortcutTrigger}
      placeholder="Filter invocations…"
      title="Filters"
      className="w-full rounded-xl border-transparent pb-8 has-[input[data-focused=true]]:border-accent-strong has-[input[data-focused=true]]:ring-focus [&_input]:min-w-[25ch] [&_input]:placeholder:text-subtle [&_input+button]:right-24 [&_input::-webkit-search-cancel-button]:invert"
    >
      {FilterChip}
    </AddFilterTrigger>
  ),
};
