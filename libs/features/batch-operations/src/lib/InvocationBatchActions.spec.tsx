import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { FilterItem } from '@restate/data-access/admin-api-spec';
import type { QueryClauseSchema } from '@restate/ui/query-builder';
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

beforeEach(() => {
  Element.prototype.getAnimations = () => [];
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
});
