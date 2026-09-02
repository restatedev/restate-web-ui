import { LayoutInfo, Rect, TableLayout } from 'react-aria-components';
import type { LayoutNode } from 'react-stately/useVirtualizerState';

export class PanelTableLayout<T> extends TableLayout<T> {
  protected override buildBody(y: number): LayoutNode {
    const collection = this.collection;
    const virtualizer = this.virtualizer;
    if (!virtualizer) return super.buildBody(y);

    const visibleRows = Array.from(
      collection.getChildren?.(collection.body.key) ?? [],
    );
    const visibleRowCount = visibleRows.reduce(
      (count, node) => count + Number(node.type === 'item'),
      0,
    );
    const rect = new Rect(this.padding, y, 0, 0);
    const layoutInfo = new LayoutInfo('rowgroup', collection.body.key, rect);
    const startY = y;
    let skipped = 0;
    let width = 0;
    const children: LayoutNode[] = [];
    const rowHeight = this.getEstimatedRowHeight() + this.gap;

    for (const node of visibleRows) {
      if (y + rowHeight < this.requestedRect.y && !this.isValid(node, y)) {
        y += rowHeight;
        skipped++;
        continue;
      }

      const layoutNode = this.buildChild(node, this.padding, y, layoutInfo.key);
      layoutNode.layoutInfo.parentKey = layoutInfo.key;
      layoutNode.index = children.length;
      y = layoutNode.layoutInfo.rect.maxY + this.gap;
      width = Math.max(width, layoutNode.layoutInfo.rect.width);
      children.push(layoutNode);

      if (y > this.requestedRect.maxY) {
        const rowsAfterRect = visibleRowCount - (children.length + skipped);
        const lastNode = visibleRows.at(-1);
        y += rowsAfterRect * rowHeight;

        if (
          lastNode?.type === 'loader' &&
          children.at(-1)?.layoutInfo.type !== 'loader'
        ) {
          const loader = this.buildChild(
            lastNode,
            this.padding,
            y,
            layoutInfo.key,
          );
          loader.layoutInfo.parentKey = layoutInfo.key;
          loader.index = visibleRowCount;
          width = Math.max(width, loader.layoutInfo.rect.width);
          children.push(loader);
          y = loader.layoutInfo.rect.maxY;
        }
        break;
      }
    }

    if (visibleRowCount === 0) {
      y = virtualizer.size.height;
    } else {
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
