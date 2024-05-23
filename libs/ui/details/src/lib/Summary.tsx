import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface SummaryProps {
  className?: string;
}

const styles = tv({
  base: '',
});
export function Summary({
  children,
  className,
}: PropsWithChildren<SummaryProps>) {
  return <summary className={styles({ className })}>{children}</summary>;
}
