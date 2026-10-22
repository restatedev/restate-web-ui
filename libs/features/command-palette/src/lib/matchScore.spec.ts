import { matchScore } from './matchScore';

describe('matchScore', () => {
  it('returns 0 for an empty query', () => {
    expect(matchScore('  ', { label: 'Overview' })).toBe(0);
  });

  it('returns 0 when any token does not match', () => {
    expect(matchScore('held nope', { label: 'Held up invocations' })).toBe(0);
  });

  it('matches word prefixes in the label', () => {
    expect(matchScore('inv', { label: 'Held up invocations' })).toBeGreaterThan(
      0,
    );
  });

  it('matches camelCase words', () => {
    expect(matchScore('counter', { label: 'StatefulCounter' })).toBeGreaterThan(
      matchScore('ount', { label: 'StatefulCounter' }),
    );
  });

  it('matches keywords', () => {
    expect(
      matchScore('stuck', {
        label: 'Held up invocations',
        keywords: ['stuck', 'blocked'],
      }),
    ).toBeGreaterThan(0);
  });

  it('ranks an exact label above a prefix above a contained match', () => {
    const exact = matchScore('state', { label: 'State' });
    const prefix = matchScore('state', { label: 'StateBackedService' });
    const contained = matchScore('state', { label: 'MyStatefulThing' });
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(contained);
  });

  it('scores equally good matches the same, so callers keep their order', () => {
    expect(
      matchScore('invocations', {
        label: 'All',
        keywords: ['invocations'],
      }),
    ).toBe(
      matchScore('invocations', {
        label: 'Not completed',
        keywords: ['invocations'],
      }),
    );
  });

  it('requires every token to match', () => {
    expect(
      matchScore('cancel held', {
        label: 'Cancel all Held up invocations',
      }),
    ).toBeGreaterThan(0);
    expect(
      matchScore('cancel completed', {
        label: 'Cancel all Held up invocations',
      }),
    ).toBe(0);
  });

  it('matches a single character only at the start of a word', () => {
    expect(matchScore('a', { label: 'Admin API' })).toBeGreaterThan(0);
    expect(matchScore('a', { label: 'Greeter/add' })).toBeGreaterThan(0);
    expect(matchScore('a', { label: 'Overview' })).toBe(0);
    expect(
      matchScore('a', { label: 'Overview', keywords: ['dashboard'] }),
    ).toBe(0);
    expect(
      matchScore('d', { label: 'Overview', keywords: ['dashboard'] }),
    ).toBeGreaterThan(0);
  });

  it('matches two or more characters inside words', () => {
    expect(matchScore('vi', { label: 'Overview' })).toBeGreaterThan(0);
    expect(
      matchScore('sh', { label: 'Overview', keywords: ['dashboard'] }),
    ).toBeGreaterThan(0);
  });
});
