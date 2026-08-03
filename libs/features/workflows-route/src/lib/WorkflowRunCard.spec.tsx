import { render, screen } from '@testing-library/react';
import { WorkflowRunUnavailableBanner } from './WorkflowRunCard';

describe('WorkflowRunUnavailableBanner', () => {
  it('renders a full-width retention explanation', () => {
    render(<WorkflowRunUnavailableBanner />);

    const banner = screen.getByRole('status');
    expect(banner.getAttribute('class')).toContain('mx-5');
    expect(screen.getByText('Run invocation not found')).toBeTruthy();
    expect(
      screen.getByText(
        'It may have been removed after its retention period elapsed.',
      ),
    ).toBeTruthy();
  });
});
