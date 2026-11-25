import { PropsWithChildren } from 'react';
import { Heading as AriaHeading } from 'react-aria-components';
import { tv } from '@restate/util-styles';

export type HeadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type HeadingTone = 'primary' | 'secondary' | 'tertiary';

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  size?: HeadingSize;
  tone?: HeadingTone;
  id?: string;
  className?: string;
}

const styles = tv({
  base: '',
  variants: {
    size: {
      sm: 'text-sm font-semibold',
      md: 'text-base font-semibold',
      lg: 'text-lg leading-6 font-medium',
      xl: 'text-xl font-semibold',
    },
    tone: {
      primary: 'text-primary',
      secondary: 'text-secondary',
      tertiary: 'text-tertiary',
    },
  },
  defaultVariants: {
    size: 'md',
    tone: 'primary',
  },
});

export function Heading({
  level,
  size,
  tone,
  id,
  className,
  children,
}: PropsWithChildren<HeadingProps>) {
  return (
    <AriaHeading
      level={level}
      id={id}
      className={styles({ size, tone, className })}
    >
      {children}
    </AriaHeading>
  );
}
