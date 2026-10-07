import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { FilterItem } from '@restate/data-access/admin-api-spec';
import type { QueryClauseSchema } from '@restate/ui/query-builder';
import type { PropsWithChildren } from 'react';
import { InvocationBatchActions } from './InvocationBatchActions';

const batch = vi.hoisted(() => ({
  batchCancel: vi.fn(),
  batchPause: vi.fn(),
  batchResume: vi.fn(),
  batchRetryNow: vi.fn(),
  batchRestartAsNew: vi.fn(),
  batchKill: vi.fn(),
  batchPurge: vi.fn(),
}));
vi.mock('./BatchOperationsProvider', () => ({
  useBatchOperations: () => batch,
}));
vi.mock('@restate/features/restate-context', () => ({
  RestateMinimumVersion: ({ children }: PropsWithChildren) => children,
}));

const filters: FilterItem[] = [
  { field: 'status', type: 'STRING_LIST', operation: 'IN', value: ['running'] },
];
const schema: QueryClauseSchema<'STRING_LIST'>[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'STRING_LIST',
    operations: [{ value: 'IN', label: 'is' }],
  },
];
const originalGetAnimations = Element.prototype.getAnimations;
const originalScrollTo = Element.prototype.scrollTo;

beforeEach(() => {
  Element.prototype.getAnimations = () => [];
  Element.prototype.scrollTo = vi.fn();
  vi.stubGlobal('CSS', { ...globalThis.CSS, escape: (value: string) => value });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  Element.prototype.getAnimations = originalGetAnimations;
  Element.prototype.scrollTo = originalScrollTo;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('InvocationBatchActions', () => {
  it.each([{ invocationIds: [] }, { invocationIds: ['inv-1', 'inv-2'] }])(
    'uses the main list counts and schema with selection $invocationIds',
    async ({ invocationIds }) => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <InvocationBatchActions
            invocationIds={invocationIds}
            filters={filters}
            schema={schema}
            totalCount={1200}
            totalCountLabel="~1.2K"
          />
        </MemoryRouter>,
      );
      const trigger = screen.getByRole('button', { name: /^Actions/ });
      expect(trigger.textContent).toContain(
        invocationIds.length ? '2' : '~1.2K',
      );
      await user.click(trigger);
      expect(screen.getByRole('dialog', { name: /^Actions/ })).toBeTruthy();
      expect(
        screen.getByText(
          invocationIds.length ? 'on 2 selected items' : 'on all ~1.2K results',
        ),
      ).toBeTruthy();
      await user.click(screen.getByRole('menuitem', { name: /Cancel/ }));
      expect(batch.batchCancel).toHaveBeenCalledWith(
        invocationIds.length ? { invocationIds } : { filters },
        schema,
      );
    },
  );

  const operations = [
    { label: 'Cancel…', method: 'batchCancel' },
    { label: 'Pause…', method: 'batchPause' },
    { label: 'Resume…', method: 'batchResume' },
    { label: 'Retry now…', method: 'batchRetryNow' },
    { label: 'Restart as new…', method: 'batchRestartAsNew' },
    { label: 'Kill…', method: 'batchKill' },
    { label: 'Purge…', method: 'batchPurge' },
  ] as const;
  const serviceFilter: FilterItem = {
    field: 'target_service_name',
    type: 'STRING_LIST',
    operation: 'IN',
    value: ['HealthyService'],
  };
  const scopes = [
    { name: 'service', filters: [serviceFilter, ...filters] },
    {
      name: 'handler',
      filters: [
        serviceFilter,
        {
          field: 'target_handler_name',
          type: 'STRING_LIST',
          operation: 'IN',
          value: ['check'],
        },
        ...filters,
      ] satisfies FilterItem[],
    },
    {
      name: 'deployment',
      filters: [
        {
          field: 'deployment',
          type: 'STRING_LIST',
          operation: 'IN',
          value: ['dp-test'],
        },
        ...filters,
      ] satisfies FilterItem[],
    },
  ];

  it.each(
    scopes.flatMap((scope) =>
      operations.flatMap((operation) =>
        [[], ['inv-1', 'inv-2']].map((invocationIds) => ({
          ...scope,
          ...operation,
          invocationIds,
        })),
      ),
    ),
  )(
    '$label preserves $name scope with selected IDs $invocationIds',
    async ({ filters: scopedFilters, label, method, invocationIds }) => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <InvocationBatchActions
            invocationIds={invocationIds}
            filters={scopedFilters}
            schema={schema}
            totalCount={1200}
            totalCountLabel="~1.2K"
          />
        </MemoryRouter>,
      );

      await user.click(screen.getByRole('button', { name: /^Actions/ }));
      await user.click(screen.getByRole('menuitem', { name: label }));

      expect(batch[method]).toHaveBeenCalledExactlyOnceWith(
        invocationIds.length ? { invocationIds } : { filters: scopedFilters },
        schema,
      );
      for (const [otherMethod, operation] of Object.entries(batch)) {
        if (otherMethod !== method) {
          expect(operation).not.toHaveBeenCalled();
        }
      }
    },
  );
});
