import { getAwakeableId } from './awakeableId.js';

const INVOCATION_ID = 'inv_1jzEBgFxSd3X4gpDmiFEkWwalqVwPYsFxh';

describe('getAwakeableId', () => {
  it.each([
    [INVOCATION_ID, 'sign_16dyu5ojHAOSzL-FqewvryjsHZH-fLyCMAAAAEQ'],
    [
      'inv_19SQeMM7Fr5D5GgIroaGxyOLE13ZoN0Lbv',
      'sign_18UM-QnmtIXNV50sLzdh96xXX4eOIXq-6AAAAEQ',
    ],
  ])(
    'matches the id Restate generated for %s and signal index 17',
    (invocationId, awakeableId) => {
      expect(getAwakeableId(invocationId, 17)).toBe(awakeableId);
    },
  );

  it('encodes the signal index as the trailing big-endian u32', () => {
    expect(getAwakeableId(INVOCATION_ID, 18)).toBe(
      'sign_16dyu5ojHAOSzL-FqewvryjsHZH-fLyCMAAAAEg',
    );
  });

  it.each([
    'inv_1jzEBgFxSd3X4gpDmiFEkWwalqVwPYsFx',
    'inv_2jzEBgFxSd3X4gpDmiFEkWwalqVwPYsFxh',
    'dp_1jzEBgFxSd3X4gpDmiFEkWwalqVwPYsFxh',
    'inv_1jzEBgFxSd3X4gpDmiFEkWwalqVwPYsF-h',
    'inv_1zzzzzzzzzzzX4gpDmiFEkWwalqVwPYsFxh',
  ])('returns undefined for the invalid invocation id %j', (invocationId) => {
    expect(getAwakeableId(invocationId, 17)).toBeUndefined();
  });

  it.each([-1, 1.5, 2 ** 32, Number.NaN])(
    'returns undefined for the invalid signal index %j',
    (signalIndex) => {
      expect(getAwakeableId(INVOCATION_ID, signalIndex)).toBeUndefined();
    },
  );
});
