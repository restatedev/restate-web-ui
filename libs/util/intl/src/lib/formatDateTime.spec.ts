import { formatCompactDateTime, formatCompactTime } from './formatDateTime';

describe('formatCompactTime', () => {
  it('formats a system-local time with seconds', () => {
    const value = new Date(2026, 7, 13, 13, 43, 15);

    expect(formatCompactTime(value)).toBe('13:43:15');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatCompactTime(new Date('invalid'))).toBe('');
  });
});

describe('formatCompactDateTime', () => {
  it('omits the year when it matches the reference year', () => {
    const value = new Date(2026, 7, 13, 13, 43, 15);
    const reference = new Date(2026, 7, 14);

    expect(formatCompactDateTime(value, reference)).toBe('Aug 13 at 13:43:15');
  });

  it('includes the year when it differs from the reference year', () => {
    const value = new Date(2025, 7, 13, 13, 43, 15);
    const reference = new Date(2026, 0, 1);

    expect(formatCompactDateTime(value, reference)).toBe(
      'Aug 13, 2025 at 13:43:15',
    );
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatCompactDateTime(new Date('invalid'))).toBe('');
  });
});
