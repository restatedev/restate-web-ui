import {
  getAdaptiveVisibleTagCount,
  partitionVisibleTags,
} from './MultiCombobox';

describe('partitionVisibleTags', () => {
  it('keeps every tag visible when there is no limit', () => {
    const items = ['id', 'service', 'scope'];

    expect(partitionVisibleTags(items)).toEqual({
      visibleItems: items,
      hiddenItems: [],
    });
  });

  it('keeps the most recently added tags visible', () => {
    expect(partitionVisibleTags(['id', 'service', 'scope'], 1)).toEqual({
      visibleItems: ['scope'],
      hiddenItems: ['id', 'service'],
    });
  });
});

describe('getAdaptiveVisibleTagCount', () => {
  it('shows every tag when they fit without an overflow trigger', () => {
    expect(getAdaptiveVisibleTagCount([120, 140, 100], 372, 80, 6)).toBe(3);
  });

  it('shows as many recent tags as fit beside the overflow trigger', () => {
    expect(getAdaptiveVisibleTagCount([120, 140, 100], 332, 80, 6)).toBe(2);
    expect(getAdaptiveVisibleTagCount([120, 140, 100], 300, 80, 6)).toBe(1);
  });

  it('keeps the latest tag visible when space is constrained', () => {
    expect(getAdaptiveVisibleTagCount([240, 240], 200, 80, 6)).toBe(1);
  });

  it('collapses the whole set when using the all-or-nothing strategy', () => {
    expect(getAdaptiveVisibleTagCount([120, 140, 100], 332, 80, 6, 'all')).toBe(
      0,
    );
    expect(getAdaptiveVisibleTagCount([120, 140, 100], 372, 80, 6, 'all')).toBe(
      3,
    );
  });
});
