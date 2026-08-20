import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { VirtualObjectStatsCard } from './VirtualObjectStatsCard';

describe('VirtualObjectStatsCard', () => {
  it('links the statistics hero row to the matching VQueues', () => {
    render(
      <MemoryRouter>
        <VirtualObjectStatsCard
          stats={{
            supported: true,
            averageInboxDuration: {
              min: 'PT0.072S',
              max: 'PT0.072S',
              vqueueCount: 1,
            },
            numInbox: 1,
          }}
          vqueuesHref="/ui/flow-control/vqueues?filter_scope=tenant-a"
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', {
      name: 'View VQueues for this Virtual Object instance',
    });
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeTruthy();
    expect(link.getAttribute('href')).toBe(
      '/ui/flow-control/vqueues?filter_scope=tenant-a',
    );
    expect(screen.getByText('VQueues').closest('a')).toBe(link);
    expect(link.querySelector('.lucide-chevron-right')).toBeTruthy();
    expect(screen.getByText('Average time inboxed').closest('a')).toBeNull();
    expect(screen.getByText('72ms').closest('a')).toBeNull();
  });
});
