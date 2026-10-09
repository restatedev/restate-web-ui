import { getUserColWidths, setUserColWidths } from './userPreferences';

const USER_COL_WIDTHS_KEY = 'invocations-user-col-widths';

describe('user column widths', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps widths of columns that were not part of the latest resize', () => {
    setUserColWidths(new Map([['id', 240]]));
    setUserColWidths(new Map([['created_at', 180]]));

    expect(getUserColWidths()).toEqual({ id: 240, created_at: 180 });
  });

  it('drops unknown columns and invalid widths', () => {
    localStorage.setItem(
      USER_COL_WIDTHS_KEY,
      JSON.stringify({
        id: 240,
        not_a_column: 100,
        created_at: '180',
        target: -5,
      }),
    );

    expect(getUserColWidths()).toEqual({ id: 240 });
  });

  it('ignores malformed storage', () => {
    localStorage.setItem(USER_COL_WIDTHS_KEY, '{not json');

    expect(getUserColWidths()).toEqual({});
  });
});
