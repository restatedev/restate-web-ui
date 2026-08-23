import { describe, expect, it } from 'vitest';
import { formatServiceTabCount } from './useServiceTabs';

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
