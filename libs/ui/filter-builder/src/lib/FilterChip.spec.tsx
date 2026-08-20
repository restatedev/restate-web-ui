import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import {
  QueryClause,
  type QueryClauseSchema,
  type QueryClauseType,
} from '@restate/ui/query-builder';
import { FilterChip, type FilterChipProps } from './FilterChip';

const schema = {
  id: 'service',
  label: 'Service',
  operations: [{ value: 'EQUALS', label: 'is' }],
  type: 'STRING',
} satisfies QueryClauseSchema<QueryClauseType>;

function renderChip(props: Partial<FilterChipProps> = {}) {
  const clause = new QueryClause(schema, {
    operation: 'EQUALS',
    value: 'Checkout',
  });
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <FilterChip item={clause} appearance="light" showRemove {...props} />
      ),
    },
  ]);
  return render(<RouterProvider router={router} />);
}

describe('FilterChip light', () => {
  it('renders the clause as field, operation and value segments', () => {
    renderChip({ onRemove: vi.fn() });

    expect(screen.getByText('Service')).toBeTruthy();
    expect(screen.getByText('is')).toBeTruthy();
    expect(screen.getByText('Checkout')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Edit Service filter' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Remove Service filter' }),
    ).toBeTruthy();
  });

  it('opens the editor from the chip overlay', async () => {
    const user = userEvent.setup();
    renderChip();

    await user.click(
      screen.getByRole('button', { name: 'Edit Service filter' }),
    );

    expect(await screen.findByRole('textbox')).toBeTruthy();
  });

  it('removes the filter without opening the editor', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderChip({ onRemove });

    await user.click(
      screen.getByRole('button', { name: 'Remove Service filter' }),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
