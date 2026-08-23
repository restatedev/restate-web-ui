import { tv } from '@restate/util/styles';
import type { PropsWithChildren } from 'react';

const cardGridStyles = tv({
  base: 'grid grid-cols-1 items-stretch gap-2',
  variants: {
    columns: {
      1: 'md:grid-cols-[minmax(0,42rem)]',
      2: 'md:grid-cols-[repeat(2,minmax(0,42rem))]',
      3: 'md:grid-cols-[repeat(2,minmax(0,42rem))] xl:grid-cols-[repeat(3,minmax(0,42rem))]',
      4: 'md:grid-cols-[repeat(2,minmax(0,42rem))] xl:grid-cols-[repeat(4,minmax(0,42rem))]',
    },
    distribution: {
      equal: '',
      '5-4-2':
        'xl:max-w-[126rem] xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,2fr)] md:[&>*]:col-span-2 xl:[&>*]:col-span-1',
    },
  },
  defaultVariants: { columns: 3, distribution: 'equal' },
});

export function CardGrid({
  columns,
  distribution,
  className,
  children,
}: PropsWithChildren<{
  columns?: 1 | 2 | 3 | 4;
  distribution?: 'equal' | '5-4-2';
  className?: string;
}>) {
  return (
    <div className={cardGridStyles({ columns, distribution, className })}>
      {children}
    </div>
  );
}
