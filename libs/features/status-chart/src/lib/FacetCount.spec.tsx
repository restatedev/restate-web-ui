import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FacetCount } from './FacetCount';

describe('FacetCount', () => {
  it('shows matching and total exact counts', () => {
    render(<FacetCount count={25} total={100} />);

    expect(screen.getByText(/25/).textContent).toBe('25 / 100');
  });

  it('shows a contextual percentage for approximate counts', () => {
    render(<FacetCount count={25} total={100} approximate />);

    expect(screen.getByText('~25%')).toBeTruthy();
  });

  it('keeps the denominator visible when the exact counts are equal', () => {
    const { container } = render(<FacetCount count={100} total={100} />);

    expect(container.textContent).toBe('100 / 100');
  });
});
