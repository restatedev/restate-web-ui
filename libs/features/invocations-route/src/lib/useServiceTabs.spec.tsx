import { describe, expect, it } from 'vitest';
import { formatServiceTabBadge, formatServiceTabCount } from './useServiceTabs';

describe('formatServiceTabCount', () => {
  it('shows the service total without a status-match numerator', () => {
    expect(formatServiceTabCount({ count: 900 })).toBe('900');
  });

  it('keeps a usable estimated total visually consistent', () => {
    expect(formatServiceTabCount({ count: 10, accuracy: 'estimate' })).toBe(
      '10',
    );
  });

  it('omits a sampled zero or missing total', () => {
    expect(
      formatServiceTabCount({ count: 0, accuracy: 'estimate' }),
    ).toBeUndefined();
    expect(formatServiceTabCount({})).toBeUndefined();
  });

  it('preserves a proven exact zero', () => {
    expect(formatServiceTabCount({ count: 0 })).toBe('0');
  });
});

describe('formatServiceTabBadge', () => {
  it('shows only the total without a status filter', () => {
    expect(formatServiceTabBadge({ count: 900 })).toEqual({ count: '900' });
  });

  it('shows status matches over the total with a status filter', () => {
    expect(formatServiceTabBadge({ count: 900 }, { count: 10 })).toEqual({
      count: '10',
      total: '900',
    });
  });

  it('hides the badge when the status matches cannot be computed', () => {
    expect(
      formatServiceTabBadge({ count: 900 }, { count: undefined }),
    ).toBeUndefined();
    expect(
      formatServiceTabBadge(
        { count: 900, accuracy: 'estimate' },
        { count: 0, accuracy: 'estimate' },
      ),
    ).toBeUndefined();
  });

  it('keeps a proven exact zero match', () => {
    expect(formatServiceTabBadge({ count: 900 }, { count: 0 })).toEqual({
      count: '0',
      total: '900',
    });
  });

  it('shows a plain zero for an empty service', () => {
    expect(formatServiceTabBadge({ count: 0 }, { count: 0 })).toEqual({
      count: '0',
    });
  });

  it('hides the badge when the total is unknown', () => {
    expect(formatServiceTabBadge({}, { count: 10 })).toBeUndefined();
  });
});
