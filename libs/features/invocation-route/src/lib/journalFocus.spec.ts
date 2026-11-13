import {
  getFocusInvocationId,
  getFocusViewport,
  getInitialInvocationIds,
} from './journalFocus';

describe('getInitialInvocationIds', () => {
  it('puts the opened invocation first and drops duplicates and blanks', () => {
    expect(
      getInitialInvocationIds(
        'inv_root',
        new URLSearchParams('expand=inv_a,,inv_root,inv_a,inv_b'),
      ),
    ).toEqual(['inv_root', 'inv_a', 'inv_b']);
  });

  it('expands at most as many invocations as a chain link can carry', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `inv_${i}`);
    expect(
      getInitialInvocationIds(
        'inv_root',
        new URLSearchParams(`expand=${ids.join(',')}`),
      ),
    ).toHaveLength(11);
  });

  it('expands nothing without the param', () => {
    expect(getInitialInvocationIds('inv_root', new URLSearchParams())).toEqual([
      'inv_root',
    ]);
  });
});

describe('getFocusInvocationId', () => {
  it('reads the focus param and ignores an empty one', () => {
    expect(getFocusInvocationId(new URLSearchParams('focus=inv_a'))).toBe(
      'inv_a',
    );
    expect(getFocusInvocationId(new URLSearchParams('focus='))).toBeUndefined();
  });
});

describe('getFocusViewport', () => {
  it('zooms to the focused span with a little padding inside the range', () => {
    expect(
      getFocusViewport({
        start: 1_000,
        end: 2_000,
        rangeStart: 0,
        rangeEnd: 60_000,
      }),
    ).toEqual({ start: 900, end: 2_100 });
  });

  it('keeps the window inside the range', () => {
    expect(
      getFocusViewport({
        start: 0,
        end: 1_000,
        rangeStart: 0,
        rangeEnd: 1_050 + 60_000,
      }),
    ).toEqual({ start: 0, end: 1_100 });
  });

  it('leaves the view alone when the focused span is most of the range', () => {
    expect(
      getFocusViewport({ start: 0, end: 900, rangeStart: 0, rangeEnd: 1_000 }),
    ).toBeUndefined();
  });

  it('needs a finished focused invocation', () => {
    expect(
      getFocusViewport({
        start: 0,
        end: undefined,
        rangeStart: 0,
        rangeEnd: 1_000,
      }),
    ).toBeUndefined();
  });
});
