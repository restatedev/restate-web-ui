import { LayoutInfo, Rect, TableLayout } from 'react-aria-components';
import type { LayoutNode } from 'react-stately/useVirtualizerState';
import { afterFastScroll, isScrollingFast } from './scrollSpeed';

export class PanelTableLayout<T> extends TableLayout<T> {
  private pausedRect?: Rect;
  private isCatchUpScheduled = false;

  override shouldInvalidate(newRect: Rect, oldRect: Rect): boolean {
    return newRect.width !== oldRect.width;
  }

  override getVisibleLayoutInfos(rect: Rect): LayoutInfo[] {
    if (rect.height <= 1 || !Number.isFinite(rect.height)) {
      return super.getVisibleLayoutInfos(rect);
    }
    if (
      this.pausedRect &&
      this.pausedRect.x === rect.x &&
      this.pausedRect.width === rect.width &&
      isScrollingFast()
    ) {
      if (!this.isCatchUpScheduled) {
        this.isCatchUpScheduled = true;
        afterFastScroll(() => {
          this.isCatchUpScheduled = false;
          this.virtualizer?.invalidate({ itemSizeChanged: true });
        });
      }
      return super.getVisibleLayoutInfos(this.pausedRect.copy());
    }
    this.pausedRect = rect.copy();
    return super.getVisibleLayoutInfos(rect);
  }

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
