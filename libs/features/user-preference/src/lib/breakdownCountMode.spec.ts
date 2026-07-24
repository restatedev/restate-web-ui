import {
  getUserBreakdownCountMode,
  setUserBreakdownCountMode,
} from './breakdownCountMode';

describe('breakdown count mode preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to estimate', () => {
    expect(getUserBreakdownCountMode()).toBe('estimate');
  });

  it('persists the mode under the existing invocation key', () => {
    setUserBreakdownCountMode('exact');

    expect(localStorage.getItem('invocations-count-mode')).toBe('"exact"');
    expect(getUserBreakdownCountMode()).toBe('exact');
  });

  it('falls back to estimate for invalid stored values', () => {
    localStorage.setItem('invocations-count-mode', 'invalid');

    expect(getUserBreakdownCountMode()).toBe('estimate');
  });
});
