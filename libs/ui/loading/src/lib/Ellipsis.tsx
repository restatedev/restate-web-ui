import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'inline-flex items-baseline gap-[0.15em]',
  slots: {
    ellipsis: 'inline-flex gap-[0.15em] items-baseline gap-[0.15em]',
  },
});

export const Ellipsis = ({
  className,
  children,
  visible = true,
}: PropsWithChildren<{ className?: string; visible?: boolean }>) => {
  const { base, ellipsis } = styles({ className });
  if (!visible) {
    return children;
  }
  return (
    <div className={base()}>
      {children}
      <div className={ellipsis()}>
        <div className="aspect-square w-[0.15em] animate-ping rounded-full bg-current [animation-duration:2000ms]" />
        <div className="aspect-square w-[0.15em] animate-ping rounded-full bg-current [animation-delay:750ms] [animation-duration:2000ms]" />
        <div className="aspect-square w-[0.15em] animate-ping rounded-full bg-current [animation-delay:1250ms] [animation-duration:2000ms]" />
      </div>
    </div>
  );
};
