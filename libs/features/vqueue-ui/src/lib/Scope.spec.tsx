import { render, screen } from '@testing-library/react';
import { Scope } from './Scope';

describe('Scope', () => {
  it('renders the scope in a straight chip', () => {
    const { container } = render(<Scope value="scope-41" />);

    expect(screen.getByText('SCOPE')).toBeTruthy();
    expect(screen.getByText('scope-41')).toBeTruthy();
    expect(screen.getByText('SCOPE').getAttribute('class')).toContain(
      'items-center',
    );
    expect(screen.getByText('SCOPE').getAttribute('class')).not.toContain(
      'translate-y-px',
    );
    expect(
      container
        .querySelector('[data-chip-segment-inner]')
        ?.getAttribute('class'),
    ).toContain('pl-1');
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
    const { container, rerender } = render(<Scope />);

    expect(container.firstChild).toBeNull();

    rerender(<Scope value="" />);

    expect(container.firstChild).toBeNull();
  });

  it('interlocks a chip scope with the following target', () => {
    const { container } = render(
      <Scope value="scope-41" relationship="target" />,
    );

    expect(
      container.querySelector('[data-chip-root]')?.getAttribute('class'),
    ).toContain('rounded-r-[3px]');
    expect(container.querySelector('[data-scope-connector]')).toBeNull();
  });

  it('renders a compact accessible label', () => {
    render(<Scope value="scope-41" labelVariant="compact" />);

    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByText('Scope')).toBeTruthy();
    expect(screen.queryByText('SCOPE')).toBeNull();
  });

  it('allows a target to remove the standalone scope width cap', () => {
    const { container } = render(
      <Scope value="scope-41" segmentClassName="max-w-none" />,
    );

    expect(
      container
        .querySelector('[data-chip-segment-inner]')
        ?.getAttribute('class'),
    ).toContain('max-w-none');
    expect(
      container
        .querySelector('[data-chip-segment-inner]')
        ?.getAttribute('class'),
    ).not.toContain('max-w-[22rem]');
  });

  it('renders a visible copy action when requested', () => {
    const { container } = render(<Scope value="scope-41" showCopy />);

    expect(screen.getByRole('button')).toBeTruthy();
    expect(
      container.querySelector('[data-chip-segment-inner]')?.classList,
    ).toContain('pr-1');
  });

  it('renders the table presentation without a visible copy action', () => {
    const { container } = render(<Scope value="scope-41" variant="table" />);

    expect(
      container.querySelector('[data-scope]')?.getAttribute('class'),
    ).toContain('w-full');
    expect(screen.queryByRole('button')).toBeNull();
    expect(
      container.querySelector('[data-chip-segment-inner]')?.classList,
    ).not.toContain('pr-1');
  });

  it('associates an inline scope with the following target', () => {
    const { container } = render(
      <Scope value="scope-41" presentation="inline" relationship="target" />,
    );

    expect(container.querySelector('[data-chip]')).toBeNull();
    expect(
      container
        .querySelector('[data-scope]')
        ?.getAttribute('data-scope-relationship'),
    ).toBe('target');
    expect(container.querySelector('[data-scope-connector]')).toBeTruthy();
    expect(
      container.querySelector('[data-scope]')?.getAttribute('class'),
    ).toContain('shrink-0');
  });

  it('renders an inline scope without its label', () => {
    const { container } = render(
      <Scope
        value="scope-41"
        presentation="inline"
        relationship="target"
        showLabel={false}
      />,
    );

    expect(screen.getByText('scope-41')).toBeTruthy();
    expect(screen.queryByText('SCOPE')).toBeNull();
    expect(container.querySelector('[data-scope-connector]')).toBeTruthy();
  });
});
