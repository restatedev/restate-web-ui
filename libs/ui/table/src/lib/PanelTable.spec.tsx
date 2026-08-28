import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Cell } from './Row';
import { PanelTable } from './PanelTable';
import {
  PanelTableQuickOpenToolbar,
  panelTableQuickOpenToolbarClassNames,
} from './PanelTableQuickOpen';

class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
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
        toolbarWrapperClassName="custom-toolbar-wrapper"
        toolbarClassName="custom-toolbar"
        caption={<div>Table notice</div>}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Items tools' });
    const caption = screen.getByText('Table notice');

    expect(toolbar.parentElement?.className).toContain('sticky');
    expect(toolbar.parentElement?.className).toContain(
      'custom-toolbar-wrapper',
    );
    expect(toolbar.className).toContain('custom-toolbar');
    expect(
      toolbar.compareDocumentPosition(caption) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it.each([
    ['loading', { isLoading: true }],
    ['empty', {}],
    ['error', { error: new Error('Unavailable') }],
  ])('keeps its toolbar visible when the body is %s', (_, state) => {
    render(
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={[]}
        toolbar={<button type="button">Go to instance</button>}
        renderCell={(row: { id: string; name: string }) => (
          <Cell>{row.name}</Cell>
        )}
        {...state}
      />,
    );

    expect(screen.getByRole('button', { name: 'Go to instance' })).toBeTruthy();
  });

  it('lets a quick-open toolbar scroll with the table content', () => {
    const classNames = panelTableQuickOpenToolbarClassNames(0);
    render(
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={[{ id: 'one', name: 'One' }]}
        toolbar={<button type="button">Go to instance</button>}
        toolbarWrapperClassName={classNames.wrapper}
        toolbarClassName={classNames.toolbar}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Items tools' });
    expect(toolbar.parentElement?.className).toContain('relative');
    expect(toolbar.parentElement?.className).toContain('top-auto');
    expect(toolbar.parentElement?.className).not.toContain('sticky');
  });

  it('stacks notices above quick open without putting the table hit layer over it', () => {
    const classNames = panelTableQuickOpenToolbarClassNames(2);
    render(
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={[{ id: 'one', name: 'One' }]}
        toolbar={
          <PanelTableQuickOpenToolbar
            notice={[
              <div key="partial">Partial results</div>,
              <div key="filtered">Filtered results</div>,
            ]}
          >
            <button type="button">Go to item</button>
          </PanelTableQuickOpenToolbar>
        }
        toolbarWrapperClassName={classNames.wrapper}
        toolbarClassName={classNames.toolbar}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );

    const partial = screen.getByText('Partial results');
    const filtered = screen.getByText('Filtered results');
    const quickOpen = screen.getByRole('button', { name: 'Go to item' });
    const toolbarWrapper = screen.getByRole('toolbar', {
      name: 'Items tools',
    }).parentElement;

    expect(
      partial.compareDocumentPosition(filtered) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      filtered.compareDocumentPosition(quickOpen) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(toolbarWrapper?.className).toContain('relative');
    expect(toolbarWrapper?.className).toContain('top-auto');
    expect(toolbarWrapper?.className).toContain('z-30');
    expect(toolbarWrapper?.className).toContain('h-[7.25rem]');
  });
});
