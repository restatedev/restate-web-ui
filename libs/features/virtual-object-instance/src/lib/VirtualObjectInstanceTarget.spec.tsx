import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { VirtualObjectInstanceTarget } from './VirtualObjectInstanceTarget';

describe('VirtualObjectInstanceTarget', () => {
  it('uses compact connected geometry outside headers', () => {
    const { container } = render(
      <MemoryRouter>
        <VirtualObjectInstanceTarget
          identity={{ service: 'Counter', key: 'user-1', scope: 'tenant-a' }}
          showService={false}
        />
      </MemoryRouter>,
    );

    const group = container.querySelector('[data-chip-group]');
    expect(group?.getAttribute('class')).toContain(
      '[&_[data-chip]]:[--chip-height:1.5rem]',
    );
    expect(group?.getAttribute('class')).toContain(
      '[&>[data-chip]:not(:first-child)]:-ml-0.5',
    );
  });

  it('retains larger header geometry', () => {
    const { container } = render(
      <MemoryRouter>
        <VirtualObjectInstanceTarget
          identity={{ service: 'Counter', key: 'user-1', scope: 'tenant-a' }}
          variant="header"
        />
      </MemoryRouter>,
    );

    const group = container.querySelector('[data-chip-group]');
    expect(group?.getAttribute('class')).toContain(
      '[&_[data-chip]]:[--chip-height:1.75rem]',
    );
    expect(group?.getAttribute('class')).not.toContain(
      '[&_[data-chip]]:[--chip-height:1.5rem]',
    );
  });

  it('links the service and instance independently', () => {
    const { container } = render(
      <MemoryRouter>
        <VirtualObjectInstanceTarget
          identity={{ service: 'Counter', key: 'user-1' }}
          serviceHref="/services/Counter"
          href="/objects/Counter/user-1"
        />
      </MemoryRouter>,
    );

    expect(
      screen
        .getByRole('link', { name: 'Open Counter service' })
        .getAttribute('href'),
    ).toBe('/services/Counter');
    expect(
      screen
        .getByRole('link', {
          name: 'Virtual object instance Counter / user-1',
        })
        .getAttribute('href'),
    ).toBe('/objects/Counter/user-1');
    expect(container.querySelectorAll('.lucide-chevron-right')).toHaveLength(2);
  });
});
