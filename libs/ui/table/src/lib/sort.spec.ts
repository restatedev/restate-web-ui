import { getNextSortDescriptor } from './sort';

describe('getNextSortDescriptor', () => {
  it('cycles through the preferred direction, its opposite, and unsorted', () => {
    const descending = getNextSortDescriptor(
      undefined,
      'workload',
      'descending',
    );
    const ascending = getNextSortDescriptor(
      descending,
      'workload',
      'descending',
    );
    const unsorted = getNextSortDescriptor(ascending, 'workload', 'descending');

    expect(descending).toEqual({
      column: 'workload',
      direction: 'descending',
    });
    expect(ascending).toEqual({
      column: 'workload',
      direction: 'ascending',
    });
    expect(unsorted).toBeUndefined();
  });

  it('starts a newly selected column in its preferred direction', () => {
    expect(
      getNextSortDescriptor(
        { column: 'workload', direction: 'descending' },
        'name',
        'ascending',
      ),
    ).toEqual({ column: 'name', direction: 'ascending' });
  });

  it('only cycles through supported directions', () => {
    const descending = getNextSortDescriptor(
      undefined,
      'backlog',
      'descending',
      ['descending'],
    );

    expect(descending).toEqual({
      column: 'backlog',
      direction: 'descending',
    });
    expect(
      getNextSortDescriptor(descending, 'backlog', 'descending', [
        'descending',
      ]),
    ).toBeUndefined();
  });
});
