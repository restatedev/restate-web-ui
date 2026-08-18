import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { LimitCounterTarget } from './LimitCounterTarget';

describe('LimitCounterTarget', () => {
  it('renders a non-animated chevron inside the final segment when linked', () => {
    render(
      <MemoryRouter>
        <LimitCounterTarget
          scope="noisy"
          l1="batch"
          l2="acme"
          href="/flow-control/vqueues?counter=noisy%2Fbatch%2Facme"
          variant="table"
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', {
      name: 'Limit counter noisy/batch/acme',
    });
    const finalSegment = screen
      .getByText('acme')
      .closest('[data-chip-segment]');
    const chevron = link.querySelector('.lucide-chevron-right');

    expect(chevron?.closest('[data-chip-segment]')).toBe(finalSegment);
    expect(chevron?.getAttribute('class')).not.toContain('group-hover');
  });
});
