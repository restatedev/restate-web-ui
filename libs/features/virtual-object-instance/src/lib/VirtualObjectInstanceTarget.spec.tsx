import { render } from '@testing-library/react';
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
});
