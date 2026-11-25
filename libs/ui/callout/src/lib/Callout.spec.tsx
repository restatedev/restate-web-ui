import { render, screen } from '@testing-library/react';
import { Callout } from './Callout';

describe('Callout', () => {
  it('shows the title before the message', () => {
    render(
      <Callout intent="warning" title="Outdated SDK">
        Upgrade the SDK.
      </Callout>,
    );
    expect(screen.getByText('Outdated SDK:', { exact: false })).toBeTruthy();
    expect(screen.getByText('Upgrade the SDK.')).toBeTruthy();
  });

  it('shows a spinner in place of the icon while pending', () => {
    const { container } = render(<Callout isPending>Checking…</Callout>);
    expect(container.querySelectorAll('svg.animate-spin')).toHaveLength(1);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });
});
