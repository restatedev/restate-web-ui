import { render, screen } from '@testing-library/react';
import { ReadyStatus } from './ReadyStatus';

describe('ReadyStatus', () => {
  it('renders the ready state with the shared dashed treatment', () => {
    render(<ReadyStatus />);

    expect(screen.getByText('Ready').className).toContain('border-dashed');
  });
});
