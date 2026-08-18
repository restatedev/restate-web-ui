import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ServiceTarget } from './ServiceTarget';
import { Target, parseTarget } from './Target';

const serviceCatalog = vi.hoisted(
  () => new Map<string, { ty: 'Service' | 'VirtualObject' | 'Workflow' }>(),
);

vi.mock('@restate/data-access/admin-api-hooks', () => ({
  useListServices: () => ({ data: serviceCatalog }),
}));

function renderTarget(component: React.ReactNode) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

describe('ServiceTarget', () => {
  beforeEach(() => {
    serviceCatalog.clear();
  });

  it('separates a scoped Virtual Object identity from its handler link', () => {
    const { container } = renderTarget(
      <ServiceTarget
        scope="tenant-a"
        service="Counter"
        serviceKey="user-1"
        handler="add"
        serviceType="VirtualObject"
        variant="header"
      />,
    );

    expect(screen.getByText('SCOPE')).toBeTruthy();
    expect(screen.getByText('tenant-a')).toBeTruthy();
    expect(screen.queryByText('/')).toBeNull();
    const identityLinks = screen.getAllByRole('link', {
      name: 'Open virtual object instance Counter / user-1',
    });
    expect(identityLinks).toHaveLength(2);
    identityLinks.forEach((link) =>
      expect(link.getAttribute('href')).toBe(
        '/virtual-objects/Counter/user-1?scope=tenant-a',
      ),
    );
    expect(
      screen
        .getByText('user-1')
        .closest('[data-chip-segment-inner]')
        ?.querySelector('svg'),
    ).toBeTruthy();
    expect(
      screen
        .getByText('Counter')
        .closest('[data-chip-segment-inner]')
        ?.getAttribute('class'),
    ).toContain('pl-2');
    expect(
      screen
        .getByText('Counter')
        .closest('[data-chip-segment-inner]')
        ?.querySelector('svg')
        ?.getAttribute('class'),
    ).toContain('h-3');
    expect(
      screen
        .getByText('user-1')
        .closest('[data-chip-segment-inner]')
        ?.getAttribute('class'),
    ).toContain('pl-2');
    expect(
      screen.getByText('user-1').closest('[data-chip]')?.getAttribute('class'),
    ).toContain('calc(100%-var(--chip-slope))_100%');
    const scopeGroup = container
      .querySelector('[data-scope]')
      ?.closest('[data-chip-group]');
    const targetRoot = container.querySelector('[data-service-target]');
    expect(targetRoot?.getAttribute('class')).toContain('min-w-0');
    expect(targetRoot?.firstElementChild?.getAttribute('class')).toContain(
      'min-w-0',
    );
    expect(targetRoot?.firstElementChild?.getAttribute('class')).toContain(
      'flex-auto',
    );
    expect(scopeGroup?.getAttribute('class')).toContain('mix-blend-normal!');
    expect(scopeGroup?.getAttribute('class')).toContain(
      '[&>[data-chip]]:mix-blend-luminosity',
    );
    expect(scopeGroup?.getAttribute('class')).toContain(
      '[&>[data-chip]:not(:first-child)]:-ml-px',
    );
    expect(scopeGroup?.children).toHaveLength(4);
    expect(scopeGroup?.getAttribute('class')).toContain(
      '[&_[data-chip]]:[--chip-height:1.75rem]',
    );
    expect(scopeGroup?.getAttribute('class')).not.toContain(
      '[&_[data-chip]]:[--chip-height:1.5rem]',
    );
    expect(
      container.querySelector('[data-scope]')?.getAttribute('class'),
    ).toContain('flex-[0_1_auto]');
    expect(
      screen.getByText('Counter').closest('[data-chip]')?.getAttribute('class'),
    ).toContain('flex-[0_1_auto]');
    expect(
      screen.getByText('user-1').closest('[data-chip]')?.getAttribute('class'),
    ).toContain('flex-[0_2_auto]');
    expect(
      screen
        .getByText('tenant-a')
        .closest('[data-chip-segment-inner]')
        ?.getAttribute('class'),
    ).toContain('max-w-none');
    const handlerLink = screen.getByRole('link', {
      name: 'Open Counter / add handler',
    });
    expect(handlerLink.getAttribute('href')).toBe(
      '?service=Counter&panel=service&handler=add',
    );
    expect(handlerLink.closest('[data-chip]')?.getAttribute('class')).toContain(
      'flex-[0_1_auto]',
    );
    expect(
      Array.from(container.querySelectorAll('[data-chip-segment-inner]')).some(
        (segment) =>
          /max-w-\[\d+rem\]/.test(segment.getAttribute('class') ?? ''),
      ),
    ).toBe(false);
    const handlerIcon = screen
      .getByText('add()')
      .closest('[data-chip-segment-inner]')
      ?.querySelector('svg');
    expect(handlerIcon?.getAttribute('class')).toContain('h-5');
    expect(handlerIcon?.getAttribute('class')).toContain('-mr-1');
    const keyChip = screen.getByText('user-1').closest('[data-chip]');
    const handlerChip = screen.getByText('add()').closest('[data-chip]');
    expect(
      screen
        .getByText('Counter')
        .closest('[data-chip]')
        ?.querySelector('.lucide-chevron-right'),
    ).toBeNull();
    expect(keyChip?.querySelector('.lucide-chevron-right')).toBeTruthy();
    expect(handlerChip?.querySelector('.lucide-chevron-right')).toBeTruthy();
    expect(container.querySelectorAll('.lucide-chevron-right')).toHaveLength(2);
    expect(container.querySelectorAll('[data-chip-group]')).toHaveLength(1);
  });

  it('connects service and handler chips when there is no service key', () => {
    const { container } = renderTarget(
      <ServiceTarget
        scope="tenant-a"
        service="Greeter"
        handler="greet"
        serviceType="Service"
      />,
    );

    const handlerLinks = screen.getAllByRole('link', {
      name: 'Open Greeter / greet handler',
    });
    expect(handlerLinks).toHaveLength(2);
    handlerLinks.forEach((link) =>
      expect(link.getAttribute('href')).toBe(
        '?service=Greeter&panel=service&handler=greet',
      ),
    );
    expect(container.querySelectorAll('[data-chip-group]')).toHaveLength(1);
    expect(
      container.querySelector('[data-chip-group]')?.getAttribute('class'),
    ).toContain('[&>[data-chip]:not(:first-child)]:-ml-0.5');
    expect(
      container.querySelector('[data-chip-group]')?.getAttribute('class'),
    ).toContain('[&_[data-chip]]:[--chip-slope:5px]');
    expect(
      screen.queryByRole('link', { name: /virtual object instance/i }),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: /workflow run/i })).toBeNull();
    expect(
      screen
        .getByText('Greeter')
        .closest('[data-chip]')
        ?.querySelector('.lucide-chevron-right'),
    ).toBeTruthy();
    expect(
      screen
        .getByText('greet()')
        .closest('[data-chip]')
        ?.querySelector('.lucide-chevron-right'),
    ).toBeTruthy();
    expect(container.querySelectorAll('.lucide-chevron-right')).toHaveLength(2);
  });

  it('configures every segment link independently', () => {
    renderTarget(
      <ServiceTarget
        scope="tenant-a"
        service="Counter"
        serviceKey="user-1"
        handler="add"
        serviceType="VirtualObject"
        links={{
          scope: { href: '/scopes/tenant-a', ariaLabel: 'Open target scope' },
          service: { href: '/services/Counter' },
          serviceKey: { href: '/objects/Counter/user-1' },
          handler: { href: '/handlers/Counter/add' },
        }}
      />,
    );

    expect(
      screen
        .getByRole('link', { name: 'Open target scope' })
        .getAttribute('href'),
    ).toBe('/scopes/tenant-a');
    expect(
      screen
        .getByRole('link', { name: 'Open service Counter' })
        .getAttribute('href'),
    ).toBe('/services/Counter');
    expect(
      screen
        .getByRole('link', { name: 'Open service key user-1' })
        .getAttribute('href'),
    ).toBe('/objects/Counter/user-1');
    expect(
      screen
        .getByRole('link', { name: 'Open Counter / add handler' })
        .getAttribute('href'),
    ).toBe('/handlers/Counter/add');
  });

  it('allows all segment links to be disabled', () => {
    renderTarget(
      <ServiceTarget
        scope="tenant-a"
        service="Counter"
        serviceKey="user-1"
        handler="add"
        serviceType="VirtualObject"
        links={false}
      />,
    );

    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('links a Workflow identity and preserves an empty scope in its URL', () => {
    renderTarget(
      <ServiceTarget
        scope=""
        service="Checkout"
        serviceKey="order-1"
        handler="run"
        serviceType="workflow"
      />,
    );

    expect(screen.queryByText('SCOPE')).toBeNull();
    expect(
      screen
        .getAllByRole('link', {
          name: 'Open workflow run Checkout / order-1',
        })
        .at(0)
        ?.getAttribute('href'),
    ).toBe('/workflows/Checkout/order-1?scope=');
  });

  it('renders a handler-free Workflow header identity', () => {
    const { container } = renderTarget(
      <ServiceTarget
        scope="tenant-a"
        service="Checkout"
        serviceKey="order-1"
        serviceType="Workflow"
        showHandler={false}
        variant="header"
      />,
    );

    expect(
      screen
        .getAllByRole('link', {
          name: 'Open workflow run Checkout / order-1',
        })
        .at(0)
        ?.getAttribute('href'),
    ).toBe('/workflows/Checkout/order-1?scope=tenant-a');
    expect(container.querySelectorAll('[data-chip]')).toHaveLength(3);
    expect(
      screen.getByText('order-1').closest('[data-chip]')?.getAttribute('class'),
    ).not.toContain('calc(100%-var(--chip-slope))_100%');
    expect(screen.queryByRole('link', { name: /handler/i })).toBeNull();
  });

  it('keeps non-header targets compact without shrinking a standalone chip', () => {
    const { container, rerender } = renderTarget(
      <ServiceTarget
        scope="tenant-a"
        service="Greeter"
        handler="greet"
        showHandler={false}
        serviceType="Service"
      />,
    );

    expect(
      container.querySelector('[data-chip-group]')?.getAttribute('class'),
    ).toContain('[&_[data-chip]]:[--chip-height:1.5rem]');

    rerender(
      <MemoryRouter>
        <ServiceTarget
          service="Greeter"
          handler="greet"
          showHandler={false}
          serviceType="Service"
        />
      </MemoryRouter>,
    );

    expect(
      container.querySelector('[data-chip-group]')?.getAttribute('class'),
    ).toContain('[&_[data-chip]]:[--chip-height:1.5rem]');
  });

  it('renders trailing compatibility content in its own chip', () => {
    renderTarget(
      <ServiceTarget service="Greeter" handler="greet" serviceType="Service">
        trailing
      </ServiceTarget>,
    );

    expect(screen.getByText('trailing')).toBeTruthy();
  });
});

describe('Target', () => {
  beforeEach(() => {
    serviceCatalog.clear();
  });

  it('parses a legacy target while preserving slashes in the service key', () => {
    expect(parseTarget('Counter/customer/eu/add')).toEqual({
      service: 'Counter',
      serviceKey: 'customer/eu',
      handler: 'add',
    });
  });

  it('matches the legacy props and resolves the keyed entity from the catalog', () => {
    serviceCatalog.set('Counter', { ty: 'VirtualObject' });
    const { container } = renderTarget(
      <Target
        target="Counter/customer/eu/add"
        showHandler={false}
        className="legacy-target"
      />,
    );

    expect(
      screen
        .getAllByRole('link', {
          name: 'Open virtual object instance Counter / customer/eu',
        })
        .at(0)
        ?.getAttribute('href'),
    ).toBe('/virtual-objects/Counter/customer%2Feu');
    expect(
      screen.queryByRole('link', { name: 'Open Counter / add handler' }),
    ).toBeNull();
    expect(
      container.querySelector('[data-service-target]')?.getAttribute('class'),
    ).toContain('legacy-target');
  });

  it('renders nothing for an empty legacy target', () => {
    const { container } = renderTarget(<Target />);
    expect(container.firstChild).toBeNull();
  });

  it('forwards compact density to a parsed legacy target', () => {
    const { container } = renderTarget(
      <Target target="Counter/customer-1/add" density="compact" />,
    );

    expect(
      container.querySelector('[data-chip-group]')?.getAttribute('class'),
    ).toContain('[&_[data-chip]]:[--chip-height:1.5rem]');
  });
});
