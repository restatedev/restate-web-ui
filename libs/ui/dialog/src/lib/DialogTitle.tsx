import type { ReactNode } from 'react';
import { Heading } from 'react-aria-components';
import { tv } from '@restate/util-styles';

const styles = tv({
  base: 'text-lg leading-6 font-medium text-primary',
});

export interface DialogTitleProps {
  children?: ReactNode;
  className?: string;
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <Heading slot="title" level={3} className={styles({ className })}>
      {children}
    </Heading>
  );
}
