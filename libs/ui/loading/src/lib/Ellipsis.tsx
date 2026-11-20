import { PropsWithChildren } from 'react';
import { tv } from '@restate/util-styles';

const styles = tv({
  base: 'inline-flex items-baseline gap-[0.15em]',
});

export const Ellipsis = ({
  className,
  children,
  visible = true,
}: PropsWithChildren<{ className?: string; visible?: boolean }>) => {
  if (!visible) {
    return children;
  }
  return (
    <div className={styles({ className })}>
      {children}
      <div className="aspect-square w-[0.15em] animate-ping rounded-full bg-current [animation-duration:2000ms]" />
      <div className="aspect-square w-[0.15em] animate-ping rounded-full bg-current [animation-delay:750ms] [animation-duration:2000ms]" />
      <div className="aspect-square w-[0.15em] animate-ping rounded-full bg-current [animation-delay:1250ms] [animation-duration:2000ms]" />
    </div>
  );
};
