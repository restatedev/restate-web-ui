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

  it('renders the type nameplate', () => {
    render(
      <Header icon={IconName.VirtualObject} iconLabel="Virtual Object">
        Identity
      </Header>,
    );

    const nameplate = screen.getByRole('img', { name: 'Virtual Object' });
    expect(nameplate).toBeTruthy();
    expect(nameplate.className).toContain('bg-blue-50/90');
    expect(nameplate.textContent).toContain('Virtual Object');
  });

  it('renders a status-aware background', () => {
    render(<Header variant="warning">Backing off</Header>);

    expect(screen.getByRole('banner').className).toContain(
      'border-orange-300/60',
    );
    expect(screen.getByRole('banner').className).toContain('from-orange-100');
  });

  it('renders the trail ledge above the bar and drops the bar top margin', () => {
    const { container } = render(
      <Header trail={<nav aria-label="Breadcrumb">Trail</nav>}>
        Identity
      </Header>,
    );

    expect(container.querySelector('[data-header-trail]')).toBeTruthy();
    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent,
    ).toBe('Trail');
    const banner = screen.getByRole('banner');
    expect(banner.className).toContain('mt-0');
    expect(banner.className).not.toContain('mt-2');
  });

  it('omits the trail row when no trail is provided', () => {
    const { container } = render(<Header>Identity</Header>);

    expect(container.querySelector('[data-header-trail]')).toBeNull();
    expect(screen.getByRole('banner').className).toContain('mt-2');
  });
});
