import type { CSSProperties } from 'react';
import { tv } from '@restate/util-styles';

const styles = tv({
  base: 'inline-block animate-pulse bg-emphasis motion-reduce:animate-none',
  variants: {
    shape: {
      text: 'rounded',
      pill: 'rounded-full bg-emphasis/70',
      block: 'rounded-md',
      card: 'rounded-xl',
    },
  },
  defaultVariants: {
    shape: 'text',
  },
});

export interface SkeletonProps {
  shape?: 'text' | 'pill' | 'block' | 'card';
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ shape, className, style }: SkeletonProps) {
  return (
    <span aria-hidden className={styles({ shape, className })} style={style} />
  );
}
