import { LayoutInfo, Rect, Size } from 'react-aria-components';
import { PanelTableLayout } from './PanelTableLayout';

class TestPanelTableLayout extends PanelTableLayout<unknown> {
  rowHeights = new Map<string, number>();

  protected override buildChild(
    node: Parameters<PanelTableLayout<unknown>['buildChild']>[0],
    x: number,
    y: number,
  ) {
    const height = this.rowHeights.get(String(node.key)) ?? 44;
    const rect = new Rect(x, y, 100, height);
    return {
      layoutInfo: new LayoutInfo('row', node.key, rect),
      validRect: rect,
      node,
    };
  }

  buildBodyFor(collection: unknown, viewport = new Rect(0, 1_000, 100, 100)) {
    this.virtualizer = {
      collection,
      size: new Size(100, 100),
    } as unknown as NonNullable<typeof this.virtualizer>;
    this.requestedRect = viewport;
    return this.buildBody(0);
  }

  buildCollectionFor(collection: unknown) {
    this.buildBodyFor(collection);
    const nodes = this.buildCollection();
    return { nodes, requestedRect: this.requestedRect };
  }
}

describe('PanelTableLayout', () => {
  it('estimates the body height from visible rows instead of collapsed rows', () => {
    const visibleRows = [
      { key: 'parent-one', type: 'item' },
      { key: 'parent-two', type: 'item' },
    ];
    const collection = {
      body: { key: 'body' },
      size: 6,
      getChildren: () => visibleRows,
    };
    const layout = new TestPanelTableLayout({ estimatedRowHeight: 44 });

    expect(layout.buildBodyFor(collection).layoutInfo.rect.height).toBe(88);
  });

  it.each([0, 1_000])(
    'includes measured row heights outside viewport at %i',
    (y) => {
      const rows = Array.from({ length: 12 }, (_, index) => ({
        key: String(index),
        type: 'item',
      }));
      const layout = new TestPanelTableLayout({ estimatedRowHeight: 44 });
      rows.forEach((row, index) => {
        layout.rowHeights.set(row.key, index === 4 || index === 5 ? 60 : 47);
      });
      const body = layout.buildBodyFor(
        { body: { key: 'body' }, size: rows.length, getChildren: () => rows },
        new Rect(0, y, 100, 100),
      );

      expect(body.layoutInfo.rect.height).toBe(590);
      expect(body.children?.at(-1)?.layoutInfo.rect.maxY).toBe(590);
    },
  );

  it('lays out the full collection before publishing its content size', () => {
    const rows = [{ key: 'one', type: 'item' }];
    const layout = new TestPanelTableLayout({ estimatedRowHeight: 44 });
    layout.rowHeights.set('one', 60);
    const { nodes, requestedRect } = layout.buildCollectionFor({
      body: { key: 'body' },
      columns: [],
      headerRows: [],
      size: 1,
      getChildren: () => rows,
    });

    expect(requestedRect.containsRect(new Rect(0, 0, 10_000, 10_000))).toBe(
      true,
    );
    expect(layout.getContentSize().height).toBe(60);
    expect(nodes.at(-1)?.layoutInfo.rect.maxY).toBe(60);
  });
});
