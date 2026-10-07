import { tv } from '@restate/util/styles';
import type { PropsWithChildren } from 'react';

export type IllustrationSurface = 'gray' | 'white';

const surfaceStyles = tv({
  base: 'text-2xs',
  variants: {
    surface: {
      gray: '[--illustration-bg:var(--color-gray-100)]',
      white: '[--illustration-bg:var(--color-white)]',
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
  base: 'font-normal text-gray-50/90',
  variants: {
    surface: {
      dark: '',
      light: 'text-gray-500 [&_strong]:text-gray-700',
    },
    muted: {
      true: 'opacity-70',
      false: '',
    },
  },
  defaultVariants: { surface: 'dark', muted: false },
});
