import { humanTimeToMs } from '@restate/util-humantime';

const ISO_DURATION =
  /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i;

export function durationToMs(value: string) {
  const iso = value.trim().match(ISO_DURATION);
  if (!iso) {
    return humanTimeToMs(value);
  }
  const [, days = '0', hours = '0', minutes = '0', seconds = '0'] = iso;
  return Math.round(
    ((Number(days) * 24 + Number(hours)) * 60 + Number(minutes)) * 60_000 +
      Number(seconds) * 1000,
  );
}
