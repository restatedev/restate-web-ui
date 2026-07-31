import { render, screen } from '@testing-library/react';
import { IconName } from '@restate/ui/icons';
import { describe, expect, it } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('renders the neutral header by default', () => {
    render(<Header>Identity</Header>);

    expect(screen.getByRole('banner').className).toContain(
      'border-gray-300/60',
    );
    expect(screen.getByText('Identity')).toBeTruthy();
  });

  it('renders a raised entity icon', () => {
    render(
      <Header icon={IconName.VirtualObject} iconLabel="Virtual Object instance">
        Identity
      </Header>,
    );

    expect(
      screen.getByRole('img', { name: 'Virtual Object instance' }),
    ).toBeTruthy();
    expect(screen.getByRole('banner').className).toContain('pl-[4.25rem]');
  });

  it('renders a status-aware background', () => {
    render(<Header variant="warning">Backing off</Header>);

    expect(screen.getByRole('banner').className).toContain(
      'border-orange-300/60',
    );
    expect(screen.getByRole('banner').className).toContain('from-orange-100');
  });
});
