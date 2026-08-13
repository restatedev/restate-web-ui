import { render, screen } from '@testing-library/react';
import { VQueueEntryId } from './VQueueEntryId';

vi.mock('./InvocationId', () => ({
  InvocationId: ({ id }: { id: string }) => (
    <a href={`/invocations/${id}`}>{id}</a>
  ),
}));

describe('VQueueEntryId', () => {
  it('renders invocation entries with the linked invocation identity', () => {
    render(<VQueueEntryId id="inv_123" />);

    expect(
      screen.getByRole('link', { name: 'inv_123' }).getAttribute('href'),
    ).toBe('/invocations/inv_123');
  });

  it('renders state mutations as non-linked entry identities', () => {
    render(<VQueueEntryId id="mut_123" />);

    expect(screen.getByLabelText('State mutation mut_123')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
