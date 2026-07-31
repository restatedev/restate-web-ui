import { tv } from '@restate/util/styles';
import type { PropsWithChildren } from 'react';

const cardGridStyles = tv({
  base: 'grid grid-cols-1 items-start gap-2',
  variants: {
    columns: {
      1: 'md:grid-cols-[minmax(0,42rem)]',
      2: 'md:grid-cols-[repeat(2,minmax(0,42rem))]',
      3: 'md:grid-cols-[repeat(2,minmax(0,42rem))] xl:grid-cols-[repeat(3,minmax(0,42rem))]',
      4: 'md:grid-cols-[repeat(2,minmax(0,42rem))] xl:grid-cols-[repeat(4,minmax(0,42rem))]',
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
