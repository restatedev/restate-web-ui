import { render, screen } from '@testing-library/react';
import { LimitKey } from './LimitKey';

describe('LimitKey', () => {
  it('renders hierarchical levels as adjacent segments in one copyable chip', () => {
    const { container } = render(<LimitKey value="team/customer-1" />);

    expect(screen.getByText('team')).toBeTruthy();
    expect(screen.getByText('customer-1')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
    expect(
      Array.from(container.querySelectorAll('[data-chip-segment]')).map(
        (segment) => segment.textContent,
      ),
    ).toEqual(['team', 'customer-1']);
    expect(container.querySelectorAll('[data-chip]')).toHaveLength(1);
    expect(container.querySelector('[data-limit-key-icon]')).toBeTruthy();
    expect(
      container
        .querySelector('[data-chip-segment-inner]')
        ?.getAttribute('class'),
    ).toContain('min-w-20');
    expect(
      container
        .querySelector('[data-limit-key]')
        ?.getAttribute('data-limit-key'),
    ).toBe('team/customer-1');
  });

  it('renders the table presentation without a separate copy button', () => {
    const { container } = render(
      <LimitKey value="team/customer-1" variant="table" />,
    );

    expect(container.querySelectorAll('[data-chip]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-chip-segment]')).toHaveLength(2);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders a single-level limit key as one chip', () => {
    const { container } = render(<LimitKey value="team" />);

    expect(container.querySelectorAll('[data-chip]')).toHaveLength(1);
    expect(screen.getByText('team')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('renders nothing without a limit key', () => {
    const { container } = render(<LimitKey />);

    expect(container.firstChild).toBeNull();
  });
});
