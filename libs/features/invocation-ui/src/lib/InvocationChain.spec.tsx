import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Invocation } from '@restate/data-access-admin-api-spec';
import { InvocationChain } from './InvocationChain';

const { useGetInvocationAncestorsMock } = vi.hoisted(() => ({
  useGetInvocationAncestorsMock: vi.fn(),
}));

vi.mock('@restate/data-access-admin-api-hooks', () => ({
  useGetInvocationAncestors: useGetInvocationAncestorsMock,
}));

function invocation(
  id: string,
  service: string,
  handler: string,
  parent?: Invocation,
  key?: string,
) {
  return {
    id,
    target_service_name: service,
    target_handler_name: handler,
    target_service_key: key,
    invoked_by_id: parent?.id,
    invoked_by_target: parent
      ? [
          parent.target_service_name,
          parent.target_service_key,
          parent.target_handler_name,
        ]
          .filter((part) => part !== undefined)
          .join('/')
      : undefined,
  } as Invocation;
}

const root = invocation('inv_root', 'Orders', 'place');
const shipping = invocation('inv_ship', 'Shipping', 'ship', root);
const warehouse = invocation(
  'inv_pick',
  'Warehouse',
  'pick',
  shipping,
  'berlin',
);
const packing = invocation('inv_pack', 'Packing', 'pack', warehouse);
const push = invocation('inv_push', 'Notify', 'push', packing);

function renderChain(current: Invocation) {
  return render(
    <MemoryRouter>
      <InvocationChain invocation={current} />
    </MemoryRouter>,
  );
}

describe('InvocationChain', () => {
  beforeEach(() => {
    useGetInvocationAncestorsMock.mockReset();
  });

  it('renders nothing for an invocation nobody invoked', () => {
    useGetInvocationAncestorsMock.mockReturnValue({ data: undefined });
    renderChain(root);

    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('links the parent from the invocation while the rest of the chain loads', () => {
    useGetInvocationAncestorsMock.mockReturnValue({ data: undefined });
    renderChain(push);

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Packing.pack()']);
    const url = new URL(
      String(links[0]?.getAttribute('href')),
      'http://localhost',
    );
    expect(url.pathname).toBe('/invocations/inv_pack');
    expect(url.searchParams.get('expand')).toBe('inv_push');
    expect(
      screen.getByRole('navigation', { name: 'Call chain' }).textContent,
    ).toContain('Notify.push()');
  });

  it('links each ancestor to its journal with this invocation expanded', () => {
    useGetInvocationAncestorsMock.mockReturnValue({
      data: [packing, warehouse, shipping, root],
    });
    renderChain(push);

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      ['Orders.place()', 'Warehouse/berlin.pick()', 'Packing.pack()'],
    );

    const href = screen
      .getByRole('link', { name: 'Warehouse/berlin.pick()' })
      .getAttribute('href');
    const url = new URL(String(href), 'http://localhost');
    expect(url.pathname).toBe('/invocations/inv_pick');
    expect(url.searchParams.get('expand')).toBe('inv_pack,inv_push');
    expect(url.searchParams.get('focus')).toBe('inv_push');
  });

  it('expands the hidden middle of a long chain in place', () => {
    useGetInvocationAncestorsMock.mockReturnValue({
      data: [packing, warehouse, shipping, root],
    });
    renderChain(push);

    fireEvent.click(screen.getByRole('button', { name: 'Show 1 more' }));

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      [
        'Orders.place()',
        'Shipping.ship()',
        'Warehouse/berlin.pick()',
        'Packing.pack()',
      ],
    );
  });
});
