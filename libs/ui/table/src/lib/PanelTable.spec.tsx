import { render, screen } from '@testing-library/react';
import { Cell } from './Row';
import { PanelTable } from './PanelTable';

class ResizeObserverMock implements ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

describe('PanelTable', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock;
  });

  it('renders a sticky toolbar below the column header and before the caption', () => {
    render(
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={[{ id: 'one', name: 'One' }]}
        toolbar={<button type="button">Filter items</button>}
        caption={<div>Table notice</div>}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Items tools' });
    const caption = screen.getByText('Table notice');

    expect(toolbar.parentElement?.className).toContain('sticky');
    expect(
      toolbar.compareDocumentPosition(caption) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
