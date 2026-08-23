import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { StageBreakdownPopoverContent } from './StageBreakdownPopoverContent';

describe('StageBreakdownPopoverContent', () => {
  it('shows each child as a percentage of its parent stage', () => {
    render(
      <MemoryRouter>
        <StageBreakdownPopoverContent
          label="Inbox"
          count={100}
          items={[
            {
              name: 'pending',
              label: 'Pending',
              count: 90,
              fillLight: '#fff',
              stroke: '#000',
              href: '/invocations?status=pending',
            },
            {
              name: 'backing-off',
              label: 'Backing off',
              count: 10,
              fillLight: '#fff',
              stroke: '#000',
              href: '/invocations?status=backing-off',
            },
          ]}
          valuesAreSampled
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('100 invocations')).toBeTruthy();
    const pending = screen.getByRole('link', {
      name: 'Pending: ~90% of Inbox',
    });
    const backingOff = screen.getByRole('link', {
      name: 'Backing off: ~10% of Inbox',
    });
    expect(pending.textContent).toBe('Pending~90%');
    expect(backingOff.textContent).toBe('Backing off~10%');
  });
});
