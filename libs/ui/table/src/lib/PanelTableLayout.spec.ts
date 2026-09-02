import { Rect, Size } from 'react-aria-components';
import { PanelTableLayout } from './PanelTableLayout';

class TestPanelTableLayout extends PanelTableLayout<unknown> {
  buildBodyFor(collection: unknown) {
    this.virtualizer = {
      collection,
      size: new Size(100, 100),
    } as unknown as NonNullable<typeof this.virtualizer>;
    this.requestedRect = new Rect(0, 1_000, 100, 100);
    return this.buildBody(0);
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
});
