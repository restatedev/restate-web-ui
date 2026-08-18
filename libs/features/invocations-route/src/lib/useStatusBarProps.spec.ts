import { describe, expect, it } from 'vitest';
import { getRepresentedStatuses } from './useStatusBarProps';

describe('getRepresentedStatuses', () => {
  it('uses the statuses carried by a contextual chart segment', () => {
    expect(
      getRepresentedStatuses(
        'ready-yielded-backing-off',
        ['ready', 'yielded', 'backing-off'],
        undefined,
      ),
    ).toEqual(['ready', 'yielded', 'backing-off']);
  });

  it('does not turn an unknown bucket into an empty Any filter', () => {
    expect(
      getRepresentedStatuses('unknown', undefined, undefined),
    ).toBeUndefined();
  });
});
