import type * as monaco from 'monaco-editor';
import { countArrayItems, getFolds } from './foldedArrayLengths';

function createModel(lines: string[]) {
  const line = (lineNumber: number) => lines[lineNumber - 1] ?? '';

  return {
    getLineContent: line,
    getLineFirstNonWhitespaceColumn: (lineNumber: number) =>
      line(lineNumber).search(/\S/) + 1,
    getLineLastNonWhitespaceColumn: (lineNumber: number) => {
      const length = line(lineNumber).trimEnd().length;
      return length === 0 ? 0 : length + 1;
    },
    getValueInRange: (range: monaco.IRange) => {
      const text = lines
        .slice(range.startLineNumber - 1, range.endLineNumber)
        .join('\n');
      const end =
        text.length - line(range.endLineNumber).length + range.endColumn - 1;
      return text.slice(range.startColumn - 1, end);
    },
  };
}

function countFoldedArray(lines: string[]) {
  return countArrayItems(createModel(lines), {
    startLineNumber: 1,
    endLineNumber: lines.length,
  });
}

describe('countArrayItems', () => {
  it('counts the items of a folded array', () => {
    expect(countFoldedArray(['"a": [', '  1,', '  2,', '  3', '],'])).toBe(3);
  });

  it('counts a single item', () => {
    expect(countFoldedArray(['"a": [', '  { "b": 1 }', ']'])).toBe(1);
  });

  it('counts an empty array', () => {
    expect(countFoldedArray(['"a": [', ']'])).toBe(0);
  });

  it('counts only top-level items of nested arrays and objects', () => {
    expect(countFoldedArray(['[', '  [1, 2],', '  { "x": [3, 4] }', ']'])).toBe(
      2,
    );
  });

  it('ignores commas and brackets inside strings', () => {
    expect(
      countFoldedArray(['"a": [', '  "x,y",', '  "]",', '  "\\"["', ']']),
    ).toBe(3);
  });

  it('ignores trailing whitespace after the opening bracket', () => {
    expect(countFoldedArray(['"a": [  ', '  1', ']'])).toBe(1);
  });

  it('returns undefined for folded objects', () => {
    expect(countFoldedArray(['"a": {', '  "b": [1, 2]', '}'])).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    expect(countFoldedArray(['"a": [', '  1,', ']'])).toBeUndefined();
  });

  it('returns undefined when the fold does not end at a closing bracket', () => {
    expect(countFoldedArray(['"a": [', '  1', '  "b": 2'])).toBeUndefined();
  });
});

describe('getFolds', () => {
  function getFoldsFor(ranges: [number, number][]) {
    return getFolds({
      getVisibleRanges: () =>
        ranges.map(([startLineNumber, endLineNumber]) => ({
          startLineNumber,
          endLineNumber,
        })) as monaco.Range[],
    });
  }

  it('returns no folds when nothing is hidden', () => {
    expect(getFoldsFor([[1, 20]])).toEqual([]);
  });

  it('returns a fold for each gap between visible ranges', () => {
    expect(
      getFoldsFor([
        [1, 2],
        [10, 13],
        [17, 19],
      ]),
    ).toEqual([
      { startLineNumber: 2, endLineNumber: 10 },
      { startLineNumber: 13, endLineNumber: 17 },
    ]);
  });

  it('ignores adjacent visible ranges', () => {
    expect(
      getFoldsFor([
        [1, 5],
        [6, 9],
      ]),
    ).toEqual([]);
  });
});
