import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ATTEMPT_FIXTURES } from './attemptFixtures';
import { buildAttemptRecord } from './attemptRecord';
import { AttemptRecordView } from './AttemptRecordView';

vi.mock('@restate/data-access-admin-api-hooks', () => ({
  useServiceCatalog: () => ({ data: new Map() }),
}));

function renderFixture(id: string, view: 'attempts' | 'waterfall') {
  const item = ATTEMPT_FIXTURES.find((fixture) => fixture.id === id);
  if (!item) {
    throw new Error(id);
  }
  const record = buildAttemptRecord(item.rows, {
    now: Date.parse(item.now),
    createdAt: item.invocation.created_at,
    completedAt: item.invocation.completed_at,
    isCompleted: Boolean(item.invocation.completed_at),
  });
  return render(
    <MemoryRouter>
      <AttemptRecordView
        record={record}
        view={view}
        title={item.invocation.target}
      />
    </MemoryRouter>,
  );
}

describe('AttemptRecordView', () => {
  it('renders one group per attempt with what started and ended it', () => {
    const { container } = renderFixture('checkout', 'attempts');
    const groups = container.querySelectorAll('[data-attempt]');
    expect(groups).toHaveLength(2);
    const first = within(groups[0] as HTMLElement);
    const second = within(groups[1] as HTMLElement);
    expect(first.getByText('First attempt')).toBeTruthy();
    expect(first.getByText('Suspended')).toBeTruthy();
    expect(first.getByText(/silent while waiting/)).toBeTruthy();
    expect(
      second.getByText(/Woken by the result of call “reserve”/),
    ).toBeTruthy();
    expect(second.getByText('Returned')).toBeTruthy();
    expect(second.getByText('commit')).toBeTruthy();
    expect(first.queryByText('commit')).toBeNull();
    expect(container.querySelector('[data-gap="suspended"]')).toBeTruthy();
  });

  it('marks attempts that never started', () => {
    renderFixture('retries', 'attempts');
    expect(screen.getByText('Start not recorded')).toBeTruthy();
    expect(screen.getByText(/ended before the handler started/)).toBeTruthy();
  });

  it('renders the waterfall with the invocation root and one row per attempt', () => {
    const { container } = renderFixture('checkout', 'waterfall');
    expect(
      screen.getByRole('table', { name: 'Attempt waterfall' }),
    ).toBeTruthy();
    expect(container.querySelectorAll('[data-attempt-row]')).toHaveLength(2);
    expect(screen.getAllByText('Cart/alice/checkout').length).toBeGreaterThan(
      0,
    );
  });
});
