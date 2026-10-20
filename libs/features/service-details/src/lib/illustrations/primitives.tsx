import { tv } from '@restate/util-styles';
import type { PropsWithChildren } from 'react';

export type IllustrationSurface = 'gray' | 'white';

const surfaceStyles = tv({
  base: 'text-2xs',
  variants: {
    surface: {
      gray: '[--illustration-bg:var(--background-color-muted)]',
      white: '[--illustration-bg:var(--background-color-surface)]',
    },
  },
  defaultVariants: { surface: 'gray' },
});

export function IllustrationSurfaceRoot({
  surface,
  className,
  children,
}: PropsWithChildren<{ surface?: IllustrationSurface; className?: string }>) {
  return (
    <div className={surfaceStyles({ surface, className })}>{children}</div>
  );
}

export const explanationItemStyles = tv({
  base: 'font-normal text-inverse-secondary',
  variants: {
    surface: {
      dark: '',
      light: 'text-muted [&_strong]:text-secondary',
    },
    muted: {
      true: 'opacity-70',
      false: '',
    },
  },
  defaultVariants: { surface: 'dark', muted: false },
});
