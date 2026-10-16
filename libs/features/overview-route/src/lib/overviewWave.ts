import type { RowDataAttributes } from '@restate/ui/table';
import { waveAnimationProps } from '@restate/ui/wave-animation';

export const OVERVIEW_WAVE_TARGET = 'overview-card';

export const OVERVIEW_ROW_WAVE: RowDataAttributes =
  waveAnimationProps(OVERVIEW_WAVE_TARGET);
