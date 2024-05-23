import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface DetailsProps {
  open?: boolean;
  className?: string;
}

const styles = tv({
  base: '',
});
export function Details({
  children,
  open,
  className,
}: PropsWithChildren<DetailsProps>) {
  return <details className={styles({ className })}>{children}</details>;
}
