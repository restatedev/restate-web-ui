import { tv } from '@restate/util/styles';
import type { PropsWithChildren } from 'react';

const cardGridStyles = tv({
  base: 'grid grid-cols-1 items-start gap-2',
  variants: {
    columns: {
      1: '',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-2 xl:grid-cols-3',
      4: 'md:grid-cols-2 xl:grid-cols-4',
    },
  },
  defaultVariants: { columns: 3 },
});

export function CardGrid({
  columns,
  className,
  children,
}: PropsWithChildren<{
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}>) {
  return (
    <div className={cardGridStyles({ columns, className })}>{children}</div>
  );
}
