import { render, screen } from '@testing-library/react';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { ScheduledStatus } from './ScheduledStatus';

describe('ScheduledStatus', () => {
  it('renders the scheduled state and time until execution', () => {
    render(
      <SnapshotTimeProvider lastSnapshot={Date.parse('2026-08-14T09:00:00Z')}>
        <ScheduledStatus scheduledAt="2026-08-14T09:04:33Z" />
      </SnapshotTimeProvider>,
    );

    expect(screen.getByText('Scheduled')).toBeTruthy();
    expect(screen.getByText('4m 33s')).toBeTruthy();
  });

  it('renders without timing when no scheduled date is available', () => {
    render(<ScheduledStatus />);

    expect(screen.getByText('Scheduled')).toBeTruthy();
    expect(screen.queryByText(/^in /)).toBeNull();
  });
});
