import { LayoutInfo, Rect, TableLayout } from 'react-aria-components';
import type { LayoutNode } from 'react-stately/useVirtualizerState';

export class PanelTableLayout<T> extends TableLayout<T> {
  protected override buildCollection(): LayoutNode[] {
    this.requestedRect = new Rect(0, 0, Infinity, Infinity);
    return super.buildCollection();
  }

  protected override buildBody(y: number): LayoutNode {
    const collection = this.collection;
    if (!this.virtualizer) return super.buildBody(y);

    const visibleRows = Array.from(
      collection.getChildren?.(collection.body.key) ?? [],
    );
    const rect = new Rect(this.padding, y, 0, 0);
    const layoutInfo = new LayoutInfo('rowgroup', collection.body.key, rect);
    const startY = y;
    let width = 0;
    const children: LayoutNode[] = [];

    for (const node of visibleRows) {
      const layoutNode = this.buildChild(node, this.padding, y, layoutInfo.key);
      layoutNode.layoutInfo.parentKey = layoutInfo.key;
      layoutNode.index = children.length;
      y = layoutNode.layoutInfo.rect.maxY + this.gap;
      width = Math.max(width, layoutNode.layoutInfo.rect.width);
      children.push(layoutNode);
    }

    if (children.length > 0) {
      y -= this.gap;
    }
    rect.width = width;
    rect.height = y - startY;

    return {
      layoutInfo,
      children,
      validRect: layoutInfo.rect.intersection(this.requestedRect),
      node: collection.body,
    };
  }
}
