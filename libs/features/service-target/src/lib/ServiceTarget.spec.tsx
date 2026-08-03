import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(scopeGroup?.children).toHaveLength(4);
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
      screen.queryByRole('link', { name: /virtual object instance/i }),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: /workflow run/i })).toBeNull();
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

  it('balances compact joined targets without shrinking a standalone chip', () => {
    const { container, rerender } = renderTarget(
      <ServiceTarget
        scope="tenant-a"
        service="Greeter"
        handler="greet"
        showHandler={false}
        serviceType="Service"
        density="compact"
      />,
    );

    expect(
      Array.from(container.querySelectorAll('[data-chip-root]')).every((chip) =>
        chip.getAttribute('class')?.includes('h-5.5'),
      ),
    ).toBe(true);

    rerender(
      <MemoryRouter>
        <ServiceTarget
          service="Greeter"
          handler="greet"
          showHandler={false}
          serviceType="Service"
          density="compact"
        />
      </MemoryRouter>,
    );

    expect(
      container.querySelector('[data-chip-root]')?.getAttribute('class'),
    ).toContain('h-6');
    expect(
      container.querySelector('[data-chip-root]')?.getAttribute('class'),
    ).not.toContain('h-5.5');
  });

  it('renders trailing compatibility content in its own chip', () => {
    renderTarget(
      <ServiceTarget service="Greeter" handler="greet" serviceType="Service">
        trailing
      </ServiceTarget>,
    );

    expect(screen.getByText('trailing')).toBeTruthy();
  });

  it('does not bubble linked target interactions to a clickable table row', () => {
    const onClick = vi.fn();
    const onPointerDown = vi.fn();
    const onPointerUp = vi.fn();
    const onKeyDown = vi.fn();
    renderTarget(
      <div
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <ServiceTarget
          service="Counter"
          serviceKey="user-1"
          handler="add"
          serviceType="VirtualObject"
        />
      </div>,
    );

    const identityLink = screen
      .getAllByRole('link', {
        name: 'Open virtual object instance Counter / user-1',
      })
      .at(0);
    expect(identityLink).toBeTruthy();
    if (!identityLink) {
      return;
    }
    identityLink.addEventListener('click', (event) => event.preventDefault());
    fireEvent.pointerDown(identityLink);
    fireEvent.pointerUp(identityLink);
    fireEvent.keyDown(identityLink, { key: 'Enter' });
    fireEvent.click(identityLink);

    expect(onClick).not.toHaveBeenCalled();
    expect(onPointerDown).not.toHaveBeenCalled();
    expect(onPointerUp).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
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
});
