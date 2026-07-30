import { render, screen } from '@testing-library/react';
import { LimitKey } from './LimitKey';

describe('LimitKey', () => {
  it('renders a compact copyable limit key by default', () => {
    const { container } = render(<LimitKey value="team/customer-1" />);

    expect(screen.getByText('team/customer-1')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
    expect(
      container
        .querySelector('[data-limit-key]')
        ?.getAttribute('data-limit-key'),
    ).toBe('team/customer-1');
  });

  it('renders the table presentation without a separate copy button', () => {
    render(<LimitKey value="team/customer-1" variant="table" />);

    expect(screen.getByText('team/customer-1')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing without a limit key', () => {
    const { container } = render(<LimitKey />);

    expect(container.firstChild).toBeNull();
  });
});
