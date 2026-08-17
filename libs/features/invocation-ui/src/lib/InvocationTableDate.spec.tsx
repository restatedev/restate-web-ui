import { render } from '@testing-library/react';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { InvocationTableDate } from './InvocationTableCell';

describe('InvocationTableDate', () => {
  it('qualifies a past date when a past prefix is provided', () => {
    const { container } = render(
      <SnapshotTimeProvider lastSnapshot={Date.parse('2026-08-17T12:00:02Z')}>
        <InvocationTableDate
          value="2026-08-17T12:00:00Z"
          tooltipTitle="Next transition"
          pastPrefix="Scheduled for "
        />
      </SnapshotTimeProvider>,
    );

    expect(container.textContent).toBe('Scheduled for 2s ago');
  });
});
