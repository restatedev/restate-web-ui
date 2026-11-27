import { render, screen } from '@testing-library/react';
import { Heading } from './Heading';

describe('Heading', () => {
  it('renders the heading level it is given', () => {
    render(
      <Heading level={3} size="sm" tone="tertiary">
        Services
      </Heading>,
    );
    const heading = screen.getByRole('heading', { level: 3, name: 'Services' });
    expect(heading.tagName).toBe('H3');
  });
});
