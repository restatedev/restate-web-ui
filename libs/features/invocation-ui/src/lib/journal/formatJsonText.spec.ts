import { describe, expect, it } from 'vitest';
import { formatJsonText } from './formatJsonText';

describe('formatJsonText', () => {
  it('indents objects and arrays like JSON.stringify', () => {
    const value = {
      a: 1,
      b: [1, 'two', { c: null, d: [true, false] }],
      e: { f: {}, g: [] },
    };
    expect(formatJsonText(JSON.stringify(value))).toBe(
      JSON.stringify(value, null, 2),
    );
  });

  it('keeps number tokens exactly as written', () => {
    expect(
      formatJsonText('{"big":12345678901234567890,"float":1.0,"exp":1e3}'),
    ).toBe(
      '{\n  "big": 12345678901234567890,\n  "float": 1.0,\n  "exp": 1e3\n}',
    );
  });

  it('keeps duplicate keys and their order', () => {
    expect(formatJsonText('{"2":"b","1":"a","2":"c"}')).toBe(
      '{\n  "2": "b",\n  "1": "a",\n  "2": "c"\n}',
    );
  });

  it('leaves punctuation inside strings alone', () => {
    expect(formatJsonText('{"a":"{[,:]} \\" \\\\","b":""}')).toBe(
      '{\n  "a": "{[,:]} \\" \\\\",\n  "b": ""\n}',
    );
  });

  it('reformats already formatted text to the same result', () => {
    const formatted = JSON.stringify({ a: [1, { b: 2 }], c: {} }, null, 4);
    expect(formatJsonText(formatted)).toBe(
      JSON.stringify({ a: [1, { b: 2 }], c: {} }, null, 2),
    );
  });

  it('returns scalars and non-JSON text unchanged', () => {
    expect(formatJsonText('"913206d7"')).toBe('"913206d7"');
    expect(formatJsonText('42')).toBe('42');
    expect(formatJsonText('not json {')).toBe('not json {');
    expect(formatJsonText('')).toBe('');
  });
});
