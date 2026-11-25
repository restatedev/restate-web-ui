import { vi } from 'vitest';
import { readColumnWidths, saveColumnWidths } from './columnWidthsStorage';

const STORAGE_KEY = 'items-col-widths';

describe('column widths storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps widths of columns that were not part of the latest resize', () => {
    saveColumnWidths(STORAGE_KEY, new Map([['id', 240]]));
    const saved = saveColumnWidths(STORAGE_KEY, new Map([['created_at', 180]]));

    const expected = new Map([
      ['id', 240],
      ['created_at', 180],
    ]);
    expect(saved).toEqual(expected);
    expect(readColumnWidths(STORAGE_KEY)).toEqual(expected);
  });

  it('keeps columns named like object properties', () => {
    saveColumnWidths(
      STORAGE_KEY,
      new Map([
        ['constructor', 120],
        ['__proto__', 130],
      ]),
    );

    expect(readColumnWidths(STORAGE_KEY)).toEqual(
      new Map([
        ['constructor', 120],
        ['__proto__', 130],
      ]),
    );
    expect(readColumnWidths('other-col-widths').get('constructor')).toBe(
      undefined,
    );
  });

  it('drops invalid widths', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: 240, created_at: '180', target: -5, status: null }),
    );

    expect(readColumnWidths(STORAGE_KEY)).toEqual(new Map([['id', 240]]));
  });

  it('ignores malformed storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(readColumnWidths(STORAGE_KEY)).toEqual(new Map());

    localStorage.setItem(STORAGE_KEY, '[240]');
    expect(readColumnWidths(STORAGE_KEY)).toEqual(new Map());
  });

  it('keeps working when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });

    expect(readColumnWidths(STORAGE_KEY)).toEqual(new Map());
    expect(saveColumnWidths(STORAGE_KEY, new Map([['id', 240]]))).toEqual(
      new Map([['id', 240]]),
    );
  });
});
