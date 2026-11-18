import { describe, expect, it } from 'vitest';
import { stateVersion } from './stateVersion.js';

function entry(name: string, value: string) {
  return { name, value: btoa(value) };
}

describe('stateVersion', () => {
  it.each([
    [
      'a single entry',
      [entry('name', 'bob')],
      'tDqA04Lj3_qJ-PgNPTecXDGZgpwy6jm2Ni2BYqJIthM',
    ],
    [
      'unsorted entries',
      [entry('b', 'bbb'), entry('a', 'aaa')],
      'RVM17P6x18Wp-JnzQ01BzmqCvhAunTOQI_az6Px3Zyk',
    ],
    ['an empty state', [], '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU'],
  ])('matches the server test vector for %s', (_, state, version) => {
    expect(stateVersion(state)).toBe(version);
  });

  it.each([
    [
      'uppercase before lowercase',
      [entry('Status', '"ok"'), entry('attempts', '3')],
      'o2iXWM-JtX1cREgPU6F0Kt0zYzCSF10qXQ0CpPIHJuY',
    ],
    [
      'case at the first difference',
      [entry('userName', '"a"'), entry('userid', '"b"')],
      '_ZyDj7JARgzZZrtJIgFJmK66UIDEB8mAUxPQ1DeU0YU',
    ],
    [
      'uppercase before underscore',
      [entry('user_id', '1'), entry('userId', '2')],
      'Dbc2Np9Gyqx3GM3twJk5JcR_bzc6n_TH8aP-f5pjq0I',
    ],
    [
      'ASCII before non-ASCII',
      [entry('café', '1'), entry('cafg', '2')],
      'yyQSUuLn_d4WSeqeuNKNY1HFP98xl3p6LDOVVkKFnPA',
    ],
    [
      'UTF-8 order, not UTF-16 order',
      [entry('\u{1F600}', '2'), entry('～', '1')],
      'r4loxkrq0JVGv5ZJHEK3385_JDrpen7wUMeLdzyYXPo',
    ],
  ])(
    'sorts keys by their UTF-8 bytes like the server: %s',
    (_, state, version) => {
      expect(stateVersion(state)).toBe(version);
      expect(stateVersion([...state].reverse())).toBe(version);
    },
  );
});
