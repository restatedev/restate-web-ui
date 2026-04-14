const WAVE_ANIMATION_ATTRIBUTE = 'data-wave-animation';

export function getWaveAnimationSelector(selector: string) {
  return `[${WAVE_ANIMATION_ATTRIBUTE}=${JSON.stringify(selector)}]`;
}

export function waveAnimationProps(selector: string) {
  return {
    [WAVE_ANIMATION_ATTRIBUTE]: selector,
  };
}
