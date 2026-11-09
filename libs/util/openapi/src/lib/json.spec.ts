import { formatJson } from './json.js';

describe('formatJson', () => {
  it('indents ordinary JSON like JSON.stringify', () => {
    const text = '{"a":[1,2,{"b":null}],"c":{},"d":[],"e":"x"}';

    expect(formatJson(text)).toBe(JSON.stringify(JSON.parse(text), null, 2));
  });

  it('keeps numbers, key order and duplicate keys as written', () => {
    expect(
      formatJson('{"b":1, "2":1234567890123456789,"b":10.50,"c":1e400}'),
    ).toBe(
      '{\n  "b": 1,\n  "2": 1234567890123456789,\n  "b": 10.50,\n  "c": 1e400\n}',
    );
  });

  it('leaves strings untouched', () => {
    expect(formatJson('["a, {b}: [c]", "q\\"uote"]')).toBe(
      '[\n  "a, {b}: [c]",\n  "q\\"uote"\n]',
    );
  });

  it('drops whitespace around scalars and empty containers', () => {
    expect(formatJson(' 1.0 ')).toBe('1.0');
    expect(formatJson('{ "a" : [ ] }')).toBe('{\n  "a": []\n}');
  });

  it('returns nothing for text that is not JSON', () => {
    expect(formatJson('not json')).toBeUndefined();
    expect(formatJson('{"a":')).toBeUndefined();
  });
});
