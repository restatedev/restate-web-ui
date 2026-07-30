import { render, screen } from '@testing-library/react';
import { Scope } from './Scope';

describe('Scope', () => {
  it('renders the scope in a straight chip', () => {
    const { container } = render(<Scope value="scope-41" />);

    expect(screen.getByText('SCOPE')).toBeTruthy();
    expect(screen.getByText('scope-41')).toBeTruthy();
    expect(
      container.querySelector('[data-chip-root]')?.getAttribute('class'),
    ).toContain('rounded-l-(--chip-radius)');
    expect(
      container.querySelector('[data-chip-root]')?.getAttribute('class'),
    ).toContain('rounded-r-(--chip-radius)');
    expect(
      container.querySelector('[data-scope]')?.getAttribute('data-scope'),
    ).toBe('scope-41');
  });

  it('renders nothing without a scope', () => {
    const { container } = render(<Scope />);

    expect(container.firstChild).toBeNull();
  });
});
